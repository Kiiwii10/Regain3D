#include "ApplicationManager.h"
#include <Utils.h>
#include <ArduinoJson.h>

ApplicationManager::ApplicationManager(BasePrinter* printer, MotorController* motor) :
    wifiManager(nullptr),
    motorController(motor),
    apiManager(nullptr),
    updateClient(nullptr),
    printer(printer),
    currentState(ApplicationState::INITIALIZING),
    stateChangeTime(0),
    initialized(false),
    deviceId(Utils::generateDeviceId()),
    lastHeartbeat(0),
    lastWiFiCheck(0),
    lastPrinterCheck(0),
    lastStatusEnqueue(0),
    wifiPreviouslyConnected(false),
    fallbackServerActive(false) {

    // Initialize app config
    appConfig.apiEndpoint = "";
    appConfig.apiToken = "";
    appConfig.firmwareUrl = "";
    appConfig.firmwareMD5 = "";
    appConfig.firmwareSize = 0;
    appConfig.assigned = false;
}

ApplicationManager::~ApplicationManager() {
    delete wifiManager;
    delete motorController;
    delete apiManager;
    delete updateClient;
    delete printer;
}

bool ApplicationManager::init(const String& printerType) {
    LOG_I("App", "Initializing Application Manager");
    LOG_I("App", "Firmware Type: " + printerType + " Edition");
    printApplicationInfo();

    // Load application configuration from provisioner
    if (!loadApplicationConfig()) {
        LOG_W("App", "No application configuration found - using defaults");
    }

    updateState(ApplicationState::INITIALIZING);
    
    if (!initializeComponents()) {
        LOG_E("App", "Failed to initialize components");
        updateState(ApplicationState::ERROR);
        return false;
    }
    
    updateState(ApplicationState::CONNECTING_WIFI);
    
    if (!connectToWiFi()) {
        LOG_E("App", "Failed to connect to WiFi");
        updateState(ApplicationState::ERROR);
        return false;
    }
    
    updateState(ApplicationState::CONFIGURING_PRINTER);

    // The printer is now injected, so we just need to initialize it
    if (!printer) {
        LOG_E("App", "Printer object is null!");
        updateState(ApplicationState::ERROR);
        return false;
    }

    // Set alert callback
    printer->setAlertCallback([this](BasePrinter::AlertLevel level,
                                    const String& msg,
                                    const String& details) {
        handlePrinterAlert(level, msg, details);
    });
    printer->setStatusCallback([this](const BasePrinter::PrintStatus& status) {
        handlePrinterStatusEvent(status);
    });

    if (!printer->init()) {
        LOG_E("App", "Failed to initialize printer");
        updateState(ApplicationState::ERROR);
        return false;
    }
    
    updateState(ApplicationState::CONNECTING_PRINTER);
    
    if (!connectPrinter()) {
        LOG_W("App", "Could not connect to printer - will retry in background");
        // Don't fail initialization - printer might come online later
    }
    
    updateState(ApplicationState::STARTING_SERVICES);
    
    if (!startServices()) {
        LOG_E("App", "Failed to start services");
        updateState(ApplicationState::ERROR);
        return false;
    }
    
    setupLogTransmission();
        
    updateState(ApplicationState::RUNNING);
    initialized = true;
    
    LOG_I("App", "Application Manager initialized successfully");
    return true;
}

void ApplicationManager::loop() {
    unsigned long currentTime = millis();
    // Periodically rotate the in-memory logs to cap heap usage
    static unsigned long lastLogRotation = 0;
    if (currentTime - lastLogRotation > 15UL * 60UL * 1000UL) { // every 15 minutes
        Logger::clearLogs();
        LOG_I("App", "Log buffer rotated (periodic cleanup)");
        lastLogRotation = currentTime;
    }
    
    switch (currentState) {
        case ApplicationState::RUNNING:
            handleRunning();
            break;
            
        case ApplicationState::ERROR:
            handleError();
            break;
            
        default:
            break;
    }
    
    // Heartbeat
    if (currentTime - lastHeartbeat > 30000) {
        performHeartbeat();
        lastHeartbeat = currentTime;
    }
    
    // WiFi check
    if (currentTime - lastWiFiCheck > 10000) {
        checkWiFiConnection();
        lastWiFiCheck = currentTime;
    }
    
    // Printer check
    if (currentTime - lastPrinterCheck > 5000) {
        checkPrinterConnection();
        lastPrinterCheck = currentTime;
    }
    
    // Component loops
    if (wifiManager) {
        wifiManager->loop();
    }
    
    if (motorController) {
        motorController->loop();
    }
    
    if (apiManager) {
        apiManager->loop();
    }

    if (printer) {
        printer->loop();
    }

    if (updateClient) {
        updateClient->loop();
    }

    evaluateUpdateHealth();
}

bool ApplicationManager::initializeComponents() {
    LOG_I("App", "Initializing components");
    
    // Initialize WiFi Manager
    wifiManager = new WiFiManager();
    if (!wifiManager->init(deviceId)) {
        LOG_E("App", "Failed to initialize WiFi Manager");
        return false;
    }
    
    // Initialize Motor Controller (reuse if provided)
    if (!motorController) {
        motorController = new MotorController();
    }
    motorController->begin();
    
    LOG_I("App", "Base components initialized successfully");
    return true;
}

bool ApplicationManager::connectToWiFi() {
    LOG_I("App", "Connecting to WiFi using WiFiManager");
    
    WiFiCredentials credentials = StorageUtils::loadWiFiCredentials();
    if (!credentials.valid) {
        LOG_E("App", "No valid WiFi credentials found");
        return false;
    }
    
    bool connected = wifiManager->connect(credentials);
    wifiPreviouslyConnected = connected;
    return connected;
}


bool ApplicationManager::connectPrinter() {
    if (!printer) {
        return false;
    }
    
    LOG_I("App", "Attempting to connect to printer");
    
    // Build connection string based on printer type
    // Connection parameters are now handled by the specific printer class.
    // The connect method can be called without parameters, and the printer
    // is responsible for retrieving its own configuration.
    if (printer->connect("")) {
        LOG_I("App", "Successfully connected to printer");
        if (updateClient && printer) {
            updateClient->setPrinterMetadata(
                printer->printer_id,
                printer->printer_brand,
                printer->printer_model,
                printer->printer_name
            );
            enqueueStatusUpdate(true);
        }
        return true;
    } else {
        LOG_W("App", "Failed to connect to printer");
        return false;
    }
}

bool ApplicationManager::startServices() {
    LOG_I("App", "Starting services");

    if (!appConfig.apiEndpoint.isEmpty()) {
        updateClient = new UpdateClient();
        if (updateClient->init(appConfig.apiEndpoint, appConfig.apiToken, deviceId)) {
            if (printer) {
                updateClient->setPrinterMetadata(
                    printer->printer_id,
                    printer->printer_brand,
                    printer->printer_model,
                    printer->printer_name
                );
            }
            enqueueStatusUpdate(true);
            LOG_I("App", "UpdateClient initialized with push endpoint");
        } else {
            LOG_W("App", "Failed to configure UpdateClient - enabling fallback API server");
            delete updateClient;
            updateClient = nullptr;
            ensureFallbackServer();
        }
    } else {
        LOG_W("App", "No push update endpoint configured - enabling fallback API server");
        ensureFallbackServer();
    }

    LOG_I("App", "All services started successfully");
    return true;
}

void ApplicationManager::handleRunning() {
    static unsigned long lastStatusLog = 0;
    unsigned long currentTime = millis();
    
    if (currentTime - lastStatusLog > 300000) { // Log status every 5 minutes
        LOG_I("App", "System running - Uptime: " + Utils::formatUptime(currentTime));
        LOG_I("App", "Free heap: " + String(Utils::getFreeHeapPercentage(), 1) + "%");
        
        if (motorController) {
            LOG_I("App", "Motor position: " + String(motorController->getCurrentPosition()));
        }
        
        if (printer && printer->isConnected()) {
            auto status = printer->getPrintStatus();
            LOG_I("App", "Printer state: " + printer->stateToString(status.state));
            if (status.state == BasePrinter::PrinterState::PRINTING) {
                LOG_I("App", "Print progress: " + String(status.progressPercent) + "%");
            }
        }
        
        lastStatusLog = currentTime;
    }
}

void ApplicationManager::handleError() {
    static unsigned long lastErrorLog = 0;
    unsigned long currentTime = millis();
    
    if (currentTime - lastErrorLog > 10000) {
        LOG_E("App", "Application in error state");
        lastErrorLog = currentTime;
        
        if (currentTime - stateChangeTime > 60000) {
            LOG_W("App", "Attempting recovery by rebooting");
            Utils::rebootDevice(2000);
        }
    }
}

void ApplicationManager::updateState(ApplicationState newState) {
    if (currentState != newState) {
        LOG_I("App", "State changed: " + getStateString(currentState) + " -> " + getStateString(newState));
        currentState = newState;
        stateChangeTime = millis();
    }
}

void ApplicationManager::performHeartbeat() {
    LOG_D("App", "Heartbeat - System operational");
    
    if (WiFi.status() != WL_CONNECTED) {
        LOG_W("App", "WiFi disconnected during heartbeat");
    }
    
    if (printer && !printer->isConnected()) {
        LOG_W("App", "Printer disconnected - attempting reconnection");
        connectPrinter();
    }
    
    if (Logger::isLogBufferFull()) {
        LOG_I("App", "Log buffer full, transmitting logs");
        Logger::transmitLogs();
    }

    enqueueStatusUpdate(true);
}

void ApplicationManager::checkWiFiConnection() {
    bool isConnected = WiFi.status() == WL_CONNECTED;

    if (!isConnected && wifiPreviouslyConnected) {
        LOG_W("WiFi", "Connection lost, attempting to reconnect");
        WiFi.reconnect();
    } else if (isConnected && !wifiPreviouslyConnected) {
        LOG_I("WiFi", "Connection restored");
    }

    if (isConnected != wifiPreviouslyConnected) {
        wifiPreviouslyConnected = isConnected;
        enqueueStatusUpdate(true);
    }
}

void ApplicationManager::checkPrinterConnection() {
    if (!printer) {
        return;
    }
    
    static bool wasConnected = false;
    bool isConnected = printer->isConnected();
    
    if (!isConnected && wasConnected) {
        LOG_W("Printer", "Connection lost");
        // Will attempt reconnection on next heartbeat
        enqueueStatusUpdate(true);
    } else if (isConnected && !wasConnected) {
        LOG_I("Printer", "Connection established/restored");
        enqueueStatusUpdate(true);
    }

    wasConnected = isConnected;
    
    // Check for printer state changes
    if (isConnected) {
        static BasePrinter::PrinterState lastState = BasePrinter::PrinterState::UNKNOWN;
        auto status = printer->getPrintStatus();
        
        if (status.state != lastState) {
            LOG_I("Printer", "State: " + printer->stateToString(status.state));
            lastState = status.state;
        }
    }
}

void ApplicationManager::setupLogTransmission() {
    LOG_I("App", "Setting up log transmission");
    
    Logger::setTransmitCallback([this](const String& logs) {
        // Avoid Logger usage here to prevent recursive transmit
        Serial.println(String("[INFO] App: Transmitting logs (size: ") + String(logs.length()) + " bytes)");

        if (updateClient) {
            updateClient->queueLogs(logs);
        } else {
            ensureFallbackServer();
        }
    });
}

void ApplicationManager::handlePrinterAlert(BasePrinter::AlertLevel level, 
                                           const String& message, 
                                           const String& details) {
    // Create alert JSON (bounded doc to avoid heap blowups)
    JsonDocument doc; // ArduinoJson v7
    doc["timestamp"] = millis();
    doc["device_id"] = deviceId;
    if (printer) {
        doc["printer_type"] = printer->getPrinterType();
        doc["printer_id"] = printer->printer_id;
        doc["printer_brand"] = printer->printer_brand;
        doc["printer_model"] = printer->printer_model;
    }
    doc["alert_level"] = static_cast<int>(level);
    doc["message"] = message;
    doc["details"] = details;

    if (updateClient) {
        updateClient->queueAlert(doc);
    } else {
        ensureFallbackServer();
    }

    String alertJson;
    serializeJson(doc, alertJson);
    
    // Log based on severity
    switch(level) {
        case BasePrinter::AlertLevel::ALERT_CRITICAL:
            LOG_E("Alert", "[CRITICAL] " + message + " - " + details);
            // Could trigger emergency stop or pause
            if (printer && printer->isConnected()) {
                printer->pausePrint();
            }
            break;
            
        case BasePrinter::AlertLevel::ALERT_HIGH:
            LOG_W("Alert", "[HIGH] " + message + " - " + details);
            break;
            
        case BasePrinter::AlertLevel::ALERT_MEDIUM:
            LOG_W("Alert", "[MEDIUM] " + message + " - " + details);
            break;
            
        case BasePrinter::AlertLevel::ALERT_LOW:
            LOG_I("Alert", "[LOW] " + message + " - " + details);
            break;
    }
    
    // Ensure fallback API is available if push updates aren't configured
    if (appConfig.apiEndpoint.isEmpty()) {
        ensureFallbackServer();
    }
}

void ApplicationManager::handlePrinterStatusEvent(const BasePrinter::PrintStatus& status) {
    enqueueStatusUpdate(false, &status);
}

void ApplicationManager::enqueueStatusUpdate(bool force, const BasePrinter::PrintStatus* statusOverride) {
    if (!updateClient) {
        if (force) {
            ensureFallbackServer();
        }
        return;
    }

    JsonDocument doc; // ArduinoJson v7
    unsigned long now = millis();

    doc["device_id"] = deviceId;
    doc["timestamp"] = now;
    doc["state"] = getStateString(currentState);
    doc["uptime_ms"] = now;
    doc["free_heap_percent"] = Utils::getFreeHeapPercentage();
    doc["connected"] = (WiFi.status() == WL_CONNECTED);
    doc["ip_address"] = WiFi.localIP().toString();
    doc["assigned"] = appConfig.assigned;

    if (printer) {
        BasePrinter::PrintStatus snapshot = statusOverride ? *statusOverride : printer->getPrintStatus();
        doc["printer_state"] = printer->stateToString(snapshot.state);
        doc["progress"] = snapshot.progressPercent;
        doc["current_layer"] = snapshot.currentLayer;
        doc["total_layers"] = snapshot.totalLayers;
        doc["remaining_time_s"] = snapshot.remainingTime;
        doc["current_material"] = snapshot.currentMaterial;
        doc["print_error"] = snapshot.printError;
        if (!snapshot.errorMessage.isEmpty()) {
            doc["error_message"] = snapshot.errorMessage;
        }
        doc["printer_connected"] = printer->isConnected();
        if (!printer->printer_id.isEmpty()) doc["printer_id"] = printer->printer_id;
        if (!printer->printer_brand.isEmpty()) doc["printer_brand"] = printer->printer_brand;
        if (!printer->printer_model.isEmpty()) doc["printer_model"] = printer->printer_model;
        if (!printer->printer_name.isEmpty()) doc["printer_name"] = printer->printer_name;
    }

    updateClient->queueStatusUpdate(doc, force);
    lastStatusEnqueue = now;
}

void ApplicationManager::ensureFallbackServer() {
    if (fallbackServerActive) {
        return;
    }

    if (!ENABLE_API) {
        return;
    }

    if (!apiManager) {
        apiManager = new APIManager();
        if (!apiManager->init(motorController, printer)) {
            LOG_E("App", "Failed to initialize fallback API manager");
            delete apiManager;
            apiManager = nullptr;
            return;
        }
    }

    fallbackServerActive = true;
    LOG_W("App", "Fallback HTTP API enabled for desktop polling");
    if (printer) {
        printer->publishStatusSnapshot(true);
    }
}

void ApplicationManager::evaluateUpdateHealth() {
    if (!updateClient) {
        if (!fallbackServerActive) {
            ensureFallbackServer();
        }
        return;
    }

    unsigned long now = millis();
    unsigned long lastSuccess = updateClient->getLastSuccessAt();

    if (!fallbackServerActive) {
        if (lastSuccess == 0) {
            if (lastStatusEnqueue > 0 && now - lastStatusEnqueue > 60000UL) {
                LOG_W("App", "No successful push updates yet - enabling fallback API");
                ensureFallbackServer();
            }
        } else if (now - lastSuccess > 120000UL) {
            LOG_W("App", "Push updates stale (>120s) - enabling fallback API");
            ensureFallbackServer();
        } else if (updateClient->getConsecutiveFailures() >= 5) {
            LOG_W("App", "Multiple push update failures - enabling fallback API");
            ensureFallbackServer();
        }
    }
}

String ApplicationManager::getStateString(ApplicationState state) const {
    switch (state) {
        case ApplicationState::INITIALIZING: return "INITIALIZING";
        case ApplicationState::CONNECTING_WIFI: return "CONNECTING_WIFI";
        case ApplicationState::CONFIGURING_PRINTER: return "CONFIGURING_PRINTER";
        case ApplicationState::CONNECTING_PRINTER: return "CONNECTING_PRINTER";
        case ApplicationState::STARTING_SERVICES: return "STARTING_SERVICES";
        case ApplicationState::RUNNING: return "RUNNING";
        case ApplicationState::ERROR: return "ERROR";
        default: return "UNKNOWN";
    }
}

void ApplicationManager::printApplicationInfo() {
    LOG_I("App", "========================================");
    LOG_I("App", "ESP32 3D Waste Controller");
    LOG_I("App", "Firmware Version: " + String(FIRMWARE_VERSION));
    LOG_I("App", "Printer Type: " + (printer ? printer->getPrinterType() : "N/A"));
    LOG_I("App", "Device ID: " + deviceId);
    LOG_I("App", "MAC Address: " + Utils::getMacAddress());
    LOG_I("App", "Motor Positions: 1-20");
    LOG_I("App", "API Port: " + String(API_PORT));
    
    #ifdef PRINTER_TYPE_BAMBU
        LOG_I("App", "Bambu Lab Features: AMS, HMS, MQTT");
    #elif defined(PRINTER_TYPE_PRUSA)
        LOG_I("App", "Prusa Features: MMU, OctoPrint");
    #endif
    
    LOG_I("App", "========================================");
}

bool ApplicationManager::loadApplicationConfig() {
    LOG_I("App", "Loading application configuration from NVS");

    Preferences prefs;
    if (!prefs.begin("app_config", true)) {
        LOG_E("App", "Failed to open preferences for app config");
        return false;
    }

    appConfig.firmwareUrl = prefs.getString("firmware_url", "");
    appConfig.firmwareMD5 = prefs.getString("firmware_md5", "");
    appConfig.firmwareSize = prefs.getULong("firmware_size", 0);
    appConfig.apiEndpoint = prefs.getString("api_endpoint", "");
    appConfig.apiToken = prefs.getString("update_token", "");
    appConfig.assigned = prefs.getBool("assigned", false);

    prefs.end();

    // Always log what we found for better diagnostics, even if assigned==false
    LOG_I("App", "Application config read (assigned=" + String(appConfig.assigned ? "true" : "false") + ")");
    LOG_I("App", "  API Endpoint: " + (appConfig.apiEndpoint.isEmpty() ? String("<empty>") : appConfig.apiEndpoint));
    LOG_I("App", "  API Token: " + (appConfig.apiToken.isEmpty() ? String("<empty>") : String("<redacted>")));
    LOG_I("App", "  Firmware URL: " + (appConfig.firmwareUrl.isEmpty() ? String("<empty>") : appConfig.firmwareUrl));
    LOG_I("App", "  Firmware Size: " + String(appConfig.firmwareSize));

    // Consider configuration loaded if any relevant field is present
    bool hasAny = appConfig.assigned || !appConfig.apiEndpoint.isEmpty() || !appConfig.firmwareUrl.isEmpty() || appConfig.firmwareSize > 0;
    return hasAny;
}

bool ApplicationManager::savePrinterConfig(const String& configJson) {
    if (!printer) {
        LOG_E("App", "No printer initialized");
        return false;
    }
    
    // The printer is now responsible for saving its own configuration.
    if (printer->saveConfiguration(configJson)) {
        LOG_I("App", "Printer configuration saved");
        
        // Reconnect with new settings
        connectPrinter();
        
        return true;
    } else {
        LOG_E("App", "Failed to save printer configuration");
        return false;
    }
}
