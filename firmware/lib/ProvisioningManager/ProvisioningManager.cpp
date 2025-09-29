#include "ProvisioningManager.h"
#include <ArduinoJson.h>
#include <ESPmDNS.h>
#include <HTTPClient.h>
#include <OTAManager.h>
#include <Preferences.h>
#include <Utils.h>
#include <esp_ota_ops.h>

ProvisioningManager::ProvisioningManager()
    : bleManager(nullptr),
      currentStatus(ProvisioningStatus::WAITING_FOR_CONNECTION),
      statusChangeTime(0), wifiConnected(false), otaInProgress(false),
      apiServer(nullptr) {

  bleManager = new BLEManager();
  meshProvisioner = nullptr;

  // Initialize app config
  appConfig.printerType = PrinterType::GENERIC;
  appConfig.apiEndpoint = "";
  appConfig.firmwareUrl = "";
  appConfig.firmwareMD5 = "";
  appConfig.firmwareSize = 0;
  appConfig.printerConnectionData = "";
  appConfig.assigned = false;
}

ProvisioningManager::~ProvisioningManager() {
  if (apiServer) {
    apiServer->stop();
    delete apiServer;
  }
  delete bleManager;
}

bool ProvisioningManager::init() {
  LOG_I("Provisioning", "Initializing Provisioning Manager with BLE");

  printProvisioningInfo();

  if (!otaManager.init()) {
    LOG_E("Provisioning", "Failed to initialize OTA Manager");
    // You might want to decide if this is a fatal error
  }

  if (!bleManager->init()) {
    LOG_E("Provisioning", "Failed to initialize BLE Provisioning Manager");
    return false;
  }

  // Initialize mesh provisioner (BLE central for peer provisioning)
  meshProvisioner = new MeshProvisioner();
  meshProvisioner->init();
  meshProvisioner->setEnabled(false); // enable once WiFi connected

  // Initialize LED indicator
  pinMode(PROVISIONER_LED_PIN, OUTPUT);
  setLed(false);
  currentLedPattern = LEDPattern::STEADY; // default at startup
  ledLastChange = millis();
  ledStep = 0;

  // Load any previously saved application config
  appConfig = loadApplicationConfig();

  updateStatus(ProvisioningStatus::WAITING_FOR_CONNECTION);

  LOG_I("Provisioning", "Provisioning Manager initialized successfully");
  return true;
}

void ProvisioningManager::loop() {
  static unsigned long lastLoop = 0;
  unsigned long now = millis();

  // Limit loop frequency
  if (now - lastLoop < 100)
    return;
  lastLoop = now;

  otaManager.loop();

  if (bleManager) {
    bleManager->loop();
  }

  if (meshProvisioner) {
    updateMeshProvisioningState();
    meshProvisioner->loop();
  }

  handleBLEProvisioning();
  handleWiFiConnection();

  if (currentStatus == ProvisioningStatus::CONNECTING_WIFI) {
    if (WiFi.status() == WL_CONNECTED) {
      updateStatus(ProvisioningStatus::WIFI_CONNECTED);
      // Now that WiFi is up, we can consider provisioning complete and start
      // services.
      updateStatus(ProvisioningStatus::PROVISIONING_COMPLETE);
    } else if (millis() - statusChangeTime > WIFI_CONNECT_TIMEOUT) {
      // Handle connection timeout
      updateStatus(ProvisioningStatus::WIFI_FAILED);
    }
  }

  // Handle API server if running
  if (apiServer) {
    apiServer->handleClient();
  }

  // Update LED indicators based on current state/probe flag
  updateLEDIndicators();

  // Check if provisioning is complete
  if (bleManager && bleManager->isProvisioningComplete()) {
    if (currentStatus != ProvisioningStatus::PROVISIONING_COMPLETE) {
      updateStatus(ProvisioningStatus::PROVISIONING_COMPLETE);
      handleOTACheck();
    }
  }

  // Start API server when WiFi is connected
  if (wifiConnected && !apiServer &&
      currentStatus == ProvisioningStatus::PROVISIONING_COMPLETE) {
    startNetworkServices();
  }

  // Check if application firmware has been assigned
  // Trigger when WiFi is connected, regardless of status enum
  if (appConfig.assigned && !otaInProgress && wifiConnected) {
    LOG_I("Provisioning", "Application firmware assigned, downloading...");
    if (assignApplicationFirmware(appConfig)) {
      LOG_I("Provisioning", "Application firmware installed successfully");
      // Reboot to application will be handled by the OTA completion
    } else {
      LOG_E("Provisioning", "Failed to install application firmware");
    }
    // Clear the assignment flag to avoid repeated attempts
    appConfig.assigned = false;
    saveApplicationConfig(appConfig);
  }
}

bool ProvisioningManager::isProvisioningComplete() const {
  return currentStatus == ProvisioningStatus::PROVISIONING_COMPLETE ||
         currentStatus == ProvisioningStatus::OTA_READY;
}

void ProvisioningManager::handleBLEProvisioning() {
  if (!bleManager)
    return;

  BLEProvisioningStatus bleStatus = bleManager->getStatus();

  switch (bleStatus) {
  case BLEProvisioningStatus::ADVERTISING:
    if (currentStatus != ProvisioningStatus::WAITING_FOR_CONNECTION) {
      updateStatus(ProvisioningStatus::WAITING_FOR_CONNECTION);
    }
    break;

  case BLEProvisioningStatus::HANDSHAKE_COMPLETED:
    // Handshake completed with a client; wait for credentials or WiFi connect
    // No action here to avoid false-positive mesh completion
    break;

  case BLEProvisioningStatus::WIFI_CREDENTIALS_RECEIVED:
    if (currentStatus != ProvisioningStatus::CREDENTIALS_RECEIVED) {
      updateStatus(ProvisioningStatus::CREDENTIALS_RECEIVED);
    }
    break;

  case BLEProvisioningStatus::CONNECTING_WIFI:
    if (currentStatus != ProvisioningStatus::CONNECTING_WIFI) {
      updateStatus(ProvisioningStatus::CONNECTING_WIFI);
    }
    break;

  case BLEProvisioningStatus::WIFI_CONNECTED:
    if (currentStatus != ProvisioningStatus::WIFI_CONNECTED) {
      updateStatus(ProvisioningStatus::WIFI_CONNECTED);
      wifiConnected = true;
    }
    break;

  case BLEProvisioningStatus::WIFI_FAILED:
    if (currentStatus != ProvisioningStatus::WIFI_FAILED) {
      updateStatus(ProvisioningStatus::WIFI_FAILED);
      wifiConnected = false;
    }
    break;

  case BLEProvisioningStatus::PROVISIONING_COMPLETE:
    if (currentStatus != ProvisioningStatus::PROVISIONING_COMPLETE) {
      updateStatus(ProvisioningStatus::PROVISIONING_COMPLETE);
      wifiConnected = true;
    }
    break;

  case BLEProvisioningStatus::ERROR:
    updateStatus(ProvisioningStatus::ERROR);
    break;

  default:
    break;
  }
}

void ProvisioningManager::startMeshProvisioning() {
  LOG_I("Provisioning",
        "Manufacturer token confirmed - starting mesh provisioning");
  // In mesh provisioning we bypass traditional WiFi credential exchange.
  // The mesh key exchange will be handled by the mesh stack.
  updateStatus(ProvisioningStatus::PROVISIONING_COMPLETE);
}

void ProvisioningManager::handleWiFiConnection() {
  // Monitor WiFi connection status
  bool isConnected = (WiFi.status() == WL_CONNECTED);

  if (wifiConnected != isConnected) {
    wifiConnected = isConnected;

    if (isConnected) {
      LOG_I("Provisioning", "WiFi connection established");
      LOG_I("Provisioning", "IP: " + WiFi.localIP().toString());
      LOG_I("Provisioning", "RSSI: " + String(WiFi.RSSI()) + " dBm");
    } else {
      LOG_W("Provisioning", "WiFi connection lost");
    }
  }
}

void ProvisioningManager::updateMeshProvisioningState() {
  if (!meshProvisioner)
    return;
  // Enable central-based peer provisioning only when this device is online.
  bool wantEnabled = wifiConnected;
  if (meshProvisioner->isEnabled() != wantEnabled) {
    meshProvisioner->setEnabled(wantEnabled);
    LOG_I("Provisioning",
          String("Mesh provisioner ") + (wantEnabled ? "enabled" : "disabled"));
  }
}

void ProvisioningManager::handleOTACheck() {
  LOG_I("Provisioning",
        "WiFi provisioning complete - checking for application firmware");

  // For now, just mark as ready for OTA
  // In a full implementation, this would check a server for available firmware
  updateStatus(ProvisioningStatus::OTA_READY);

  LOG_I("Provisioning",
        "Provisioner ready - application firmware can be downloaded via OTA");
  LOG_I("Provisioning", "Device will continue running provisioner firmware");
}

bool ProvisioningManager::connectToWiFi(const WiFiCredentials &credentials) {
  if (!credentials.valid || credentials.ssid.isEmpty()) {
    return false;
  }

  LOG_I("Provisioning", "Connecting to saved WiFi: " + credentials.ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(credentials.ssid.c_str(), credentials.password.c_str());

  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED &&
         millis() - startTime < WIFI_CONNECT_TIMEOUT) {
    delay(500);
  }

  if (WiFi.status() == WL_CONNECTED) {
    LOG_I("Provisioning", "WiFi connected successfully");
    return true;
  } else {
    LOG_E("Provisioning", "Failed to connect to saved WiFi");
    return false;
  }
}

void ProvisioningManager::updateStatus(ProvisioningStatus newStatus) {
  if (currentStatus != newStatus) {
    LOG_I("Provisioning", "Status: " + provisioningStatusToString(newStatus));
    currentStatus = newStatus;
    statusChangeTime = millis();
  }
}

bool ProvisioningManager::performOTAUpdate(const String &firmwareUrl) {
  LOG_I("Provisioning", "OTA update not implemented in this version");
  return false;
}

void ProvisioningManager::rebootToApplication() {
  LOG_I("Provisioning", "Rebooting to application partition");
  ESP.restart();
}

void ProvisioningManager::factoryReset() {
  LOG_W("Provisioning", "Factory reset requested");

  // Clear NVS credentials
  Preferences prefs;
  if (prefs.begin(NVS_WIFI_NAMESPACE, false)) {
    prefs.clear();
    prefs.end();
    LOG_I("Provisioning", "WiFi credentials cleared");
  }

  // Clear application config
  clearApplicationConfig();

  Utils::rebootDevice(2000);
}

bool ProvisioningManager::downloadAndInstallFirmware(const String &url) {
  LOG_I("Provisioning", "Firmware download not implemented in this version");
  return false;
}

bool ProvisioningManager::validateFirmwareHeader(const uint8_t *data,
                                                 size_t size) {
  return false;
}

void ProvisioningManager::printProvisioningInfo() {
  LOG_I("Provisioning", "=== ESP32 3D Waste Controller - Provisioner ===");
  LOG_I("Provisioning", "Device: " + String(DEVICE_NAME));
  LOG_I("Provisioning", "Version: " + String(FIRMWARE_VERSION));
  LOG_I("Provisioning", "Chip: " + String(ESP.getChipModel()));
  LOG_I("Provisioning",
        "Flash: " + String(ESP.getFlashChipSize() / (1024 * 1024)) + "MB");
  LOG_I("Provisioning", "Free heap: " + String(ESP.getFreeHeap()) + " bytes");
  LOG_I("Provisioning", "Provisioning method: BLE with ecosystem handshake");
  LOG_I("Provisioning", "===============================================");
}

// Convert ProvisioningStatus to SmartConfigStatus for compatibility
String provisioningStatusToString(ProvisioningStatus status) {
  switch (status) {
  case ProvisioningStatus::WAITING_FOR_CONNECTION:
    return "Waiting for connection";
  case ProvisioningStatus::CONNECTED:
    return "Connected";
  case ProvisioningStatus::CREDENTIALS_RECEIVED:
    return "Credentials received";
  case ProvisioningStatus::CONNECTING_WIFI:
    return "Connecting to WiFi";
  case ProvisioningStatus::WIFI_CONNECTED:
    return "WiFi connected";
  case ProvisioningStatus::WIFI_FAILED:
    return "WiFi failed";
  case ProvisioningStatus::OTA_READY:
    return "OTA ready";
  case ProvisioningStatus::PROVISIONING_COMPLETE:
    return "Provisioning complete";
  case ProvisioningStatus::ERROR:
    return "Error";
  default:
    return "Unknown";
  }
}

// API Server Implementation
bool ProvisioningManager::startNetworkServices() {
  if (apiServer) {
    LOG_W("Provisioning", "API server already running");
    return true;
  }

  LOG_I("Provisioning", "Starting API server on port " + String(API_PORT));
  apiServer = new WebServer(API_PORT);

  setupAPIEndpoints();

  apiServer->begin();
  LOG_I("Provisioning", "API server started successfully");

  LOG_I("Provisioning", "Starting mDNS responder...");

  String uniqueID = Utils::generateDeviceId();
  uniqueID.toLowerCase();
  uniqueID.replace("esp32_",
                   ""); // This will leave just the unique part: "84bef07ce5a4"
  String fullHostname = MDNS_SERVICE_NAME;
  fullHostname = fullHostname + "-" + uniqueID;

  if (MDNS.begin(fullHostname.c_str())) {
    // Announce multiple services for better discoverability

    // Standard HTTP service
    MDNS.addService("http", "tcp", API_PORT);
    MDNS.addServiceTxt("http", "tcp", "fw_version", FIRMWARE_VERSION);
    MDNS.addServiceTxt("http", "tcp", "device_id", uniqueID);
    MDNS.addServiceTxt("http", "tcp", "ecosystem_token", ECOSYSTEM_TOKEN);
    MDNS.addServiceTxt("http", "tcp", "device_type", "regain3d-controller");
    MDNS.addServiceTxt("http", "tcp", "status", "provisioner");
    MDNS.addServiceTxt("http", "tcp", "path", "/");

    // Custom service for ecosystem discovery
    MDNS.addService("regain3d", "tcp", API_PORT);
    MDNS.addServiceTxt("regain3d", "tcp", "fw_version", FIRMWARE_VERSION);
    MDNS.addServiceTxt("regain3d", "tcp", "device_id", uniqueID);
    MDNS.addServiceTxt("regain3d", "tcp", "ecosystem_token", ECOSYSTEM_TOKEN);
    MDNS.addServiceTxt("regain3d", "tcp", "device_type", "regain3d-controller");
    MDNS.addServiceTxt("regain3d", "tcp", "status", "provisioner");
    MDNS.addServiceTxt("regain3d", "tcp", "path", "/");

    LOG_I("Provisioning",
          "mDNS responder started with multiple service types:");
    LOG_I("Provisioning", "  HTTP: http://" + String(fullHostname) +
                              ".local:" + String(API_PORT) + "/");
    LOG_I("Provisioning", "  Regain3D: _regain3d._tcp.local");
    LOG_I("Provisioning", "Device should be discoverable by mDNS scanners");
  } else {
    LOG_E("Provisioning", "Error starting mDNS responder");
  }

  return true;
}

void ProvisioningManager::setupAPIEndpoints() {
  if (!apiServer)
    return;

  // Basic endpoints
  apiServer->on("/", HTTP_GET, [this]() { handleStatus(); });
  apiServer->on("/status", HTTP_GET, [this]() { handleStatus(); });
  apiServer->on("/system", HTTP_GET, [this]() { handleSystemInfo(); });
  apiServer->on("/identify", HTTP_ANY, [this]() { handleIdentify(); });

  // Application assignment endpoint
  apiServer->on("/assign-app", HTTP_POST,
                [this]() { handleAssignApplication(); });

  // 404 handler
  apiServer->onNotFound([this]() {
    JsonDocument doc; // ArduinoJson v7
    doc["error"] = "Endpoint not found";
    doc["code"] = 404;
    sendJSONResponse(404, doc);
  });

  LOG_I("Provisioning", "API endpoints configured");
}

void ProvisioningManager::handleIdentify() {
  // Support start/stop via query or JSON body
  String action = "start";
  unsigned long durationMs = 10000; // default 10s

  // Query params
  if (apiServer->hasArg("action")) {
    action = apiServer->arg("action");
    action.toLowerCase();
  }
  if (apiServer->hasArg("duration_ms")) {
    durationMs = apiServer->arg("duration_ms").toInt();
    if (durationMs == 0)
      durationMs = 10000;
  }

  // Optional JSON body
  String body = apiServer->arg("plain");
  if (!body.isEmpty()) {
    JsonDocument doc;
    if (deserializeJson(doc, body) == DeserializationError::Ok) {
      if (doc["action"].is<String>()) {
        action = doc["action"].as<String>();
        action.toLowerCase();
      }
      if (doc["duration_ms"].is<unsigned long>() ||
          doc["duration_ms"].is<int>()) {
        durationMs = (unsigned long)doc["duration_ms"].as<unsigned long>();
        if (durationMs == 0)
          durationMs = 10000;
      }
    }
  }

  JsonDocument resp;
  resp["status"] = "identify";
  resp["pattern"] = "triple_fast";

  unsigned long now = millis();
  if (action == "stop" || action == "off" || action == "0") {
    detectUntil = 0;
    resp["mode"] = "stopped";
    resp["active"] = false;
    resp["remaining_ms"] = 0;
    sendJSONResponse(200, resp);
    return;
  }

  // Start/extend identify pattern
  detectUntil = now + durationMs;
  resp["mode"] = "started";
  resp["active"] = true;
  resp["duration_ms"] = durationMs;
  resp["until_ms"] = detectUntil;
  sendJSONResponse(200, resp);
}

void ProvisioningManager::handleAssignApplication() {
  LOG_I("Provisioning", "Received application assignment request");

  String requestBody = apiServer->arg("plain");
  if (requestBody.isEmpty()) {
    sendErrorResponse(400, "Request body required");
    return;
  }

  // Parse with OTAManager for consistency across app/provisioner
  OTAManager::OTAAssignment a;
  if (!otaManager.parseAssignmentPayload(requestBody, a)) {
    sendErrorResponse(400, "Invalid or incomplete assignment payload");
    return;
  }

  // Persist to NVS (including printer metadata/connection data) but do not
  // trigger download here.
  if (!otaManager.saveAssignmentToNVS(a, true, true)) {
    sendErrorResponse(500, "Failed to save assignment to NVS");
    return;
  }

  // Update in-memory config so loop() can start OTA when conditions are met
  appConfig.firmwareUrl = a.firmwareUrl;
  appConfig.firmwareMD5 = a.firmwareMD5;
  appConfig.firmwareSize = a.firmwareSize;
  appConfig.apiEndpoint = a.apiEndpoint;
  appConfig.apiToken = a.updateToken;
  appConfig.printerConnectionData = a.printerConnectionJson;
  // Map printer brand to PrinterType
  String brand = a.printerBrand;
  brand.toLowerCase();
  if (brand == "bambu")
    appConfig.printerType = PrinterType::BAMBU_LAB;
  else if (brand == "prusa")
    appConfig.printerType = PrinterType::PRUSA;
  else
    appConfig.printerType = PrinterType::GENERIC;
  appConfig.assigned = true;

  LOG_I("Provisioning", "Application firmware assigned:");
  LOG_I("Provisioning", "  URL: " + appConfig.firmwareUrl);
  LOG_I("Provisioning", "  MD5: " + appConfig.firmwareMD5);
  LOG_I("Provisioning", "  Size: " + String(appConfig.firmwareSize));
  LOG_I("Provisioning", "  Printer Brand: " + a.printerBrand);
  LOG_I("Provisioning", "  API Endpoint: " + appConfig.apiEndpoint);

  // Respond success
  JsonDocument response;
  response["status"] = "Application firmware assigned successfully";
  response["firmware_url"] = appConfig.firmwareUrl;
  response["firmware_size"] = appConfig.firmwareSize;
  response["printer_type"] = a.printerBrand;
  response["message"] =
      "Device will download and install the application firmware, then reboot";

  sendJSONResponse(200, response);
}

void ProvisioningManager::handleStatus() {
  JsonDocument doc; // ArduinoJson v7

  doc["device_id"] = Utils::generateDeviceId();
  doc["firmware_version"] = FIRMWARE_VERSION;
  doc["ecosystem_token"] = ECOSYSTEM_TOKEN;
  doc["status"] = provisioningStatusToString(currentStatus);
  doc["connected"] = wifiConnected;
  doc["ip_address"] = WiFi.localIP().toString();
  doc["uptime"] = millis();
  doc["application_assigned"] = appConfig.assigned;

  if (appConfig.assigned) {
    JsonObject app = doc["application_config"].to<JsonObject>();
    app["firmware_url"] = appConfig.firmwareUrl;
    app["firmware_size"] = appConfig.firmwareSize;

    String printerTypeStr;
    switch (appConfig.printerType) {
    case PrinterType::BAMBU_LAB:
      printerTypeStr = "bambu";
      break;
    case PrinterType::PRUSA:
      printerTypeStr = "prusa";
      break;
    default:
      printerTypeStr = "generic";
      break;
    }
    app["printer_type"] = printerTypeStr;
    app["api_endpoint"] = appConfig.apiEndpoint;
  }

  sendJSONResponse(200, doc);
}

void ProvisioningManager::handleSystemInfo() {
  JsonDocument doc; // ArduinoJson v7

  doc["chip_model"] = ESP.getChipModel();
  doc["chip_revision"] = ESP.getChipRevision();
  doc["cpu_freq"] = ESP.getCpuFreqMHz();
  doc["flash_size"] = ESP.getFlashChipSize();
  doc["free_heap"] = ESP.getFreeHeap();
  doc["sketch_size"] = ESP.getSketchSize();
  doc["free_sketch_space"] = ESP.getFreeSketchSpace();
  doc["sdk_version"] = ESP.getSdkVersion();

  sendJSONResponse(200, doc);
}

void ProvisioningManager::sendJSONResponse(int code, const JsonDocument &doc) {
  String response;
  serializeJson(doc, response);
  apiServer->send(code, "application/json", response);
}

void ProvisioningManager::sendErrorResponse(int code, const String &error) {
  JsonDocument doc; // ArduinoJson v7
  doc["error"] = error;
  doc["code"] = code;
  doc["timestamp"] = millis();
  sendJSONResponse(code, doc);
}

// LED indicator helpers
ProvisioningManager::LEDPattern
ProvisioningManager::computeDesiredPattern() const {
  unsigned long now = millis();
  if (detectUntil > now) {
    return LEDPattern::TRIPLE_FAST;
  }
  if (currentStatus == ProvisioningStatus::CONNECTING_WIFI) {
    return LEDPattern::DOUBLE_LONG;
  }
  if (wifiConnected) {
    // Connected to WiFi but still in provisioner (waiting to be provisioned)
    return LEDPattern::SINGLE_LONG;
  }
  // Not connected to WiFi: steady blink looking to be provisioned
  return LEDPattern::STEADY;
}

void ProvisioningManager::setLed(bool on) {
  ledState = on;
  digitalWrite(PROVISIONER_LED_PIN, on ? HIGH : LOW);
}

void ProvisioningManager::updateLEDIndicators() {
  LEDPattern desired = computeDesiredPattern();
  unsigned long now = millis();

  if (desired != currentLedPattern) {
    // Switch pattern and restart cycle
    currentLedPattern = desired;
    ledStep = 0;
    ledLastChange = now;
    if (desired == LEDPattern::OFF) {
      setLed(false);
      return;
    }
    setLed(true); // start with ON phase
    return;
  }

  if (desired == LEDPattern::OFF) {
    if (ledState)
      setLed(false);
    return;
  }

  // Pattern definitions: arrays of durations in ms, alternating ON/OFF,
  // starting with ON
  const uint16_t *durations = nullptr;
  uint8_t steps = 0;
  static const uint16_t STEADY_DUR[] = {250, 250};       // steady blink
  static const uint16_t SINGLE_LONG_DUR[] = {150, 1300}; // 1 blink, long gap
  static const uint16_t DOUBLE_LONG_DUR[] = {150, 150, 150,
                                             1300}; // 2 blinks, long gap
  static const uint16_t TRIPLE_FAST_DUR[] = {
      100, 100, 100, 100, 100, 1600}; // 3 fast blinks, long gap

  switch (desired) {
  case LEDPattern::STEADY:
    durations = STEADY_DUR;
    steps = 2;
    break;
  case LEDPattern::SINGLE_LONG:
    durations = SINGLE_LONG_DUR;
    steps = 2;
    break;
  case LEDPattern::DOUBLE_LONG:
    durations = DOUBLE_LONG_DUR;
    steps = 4;
    break;
  case LEDPattern::TRIPLE_FAST:
    durations = TRIPLE_FAST_DUR;
    steps = 6;
    break;
  default:
    return;
  }

  if (now - ledLastChange >= durations[ledStep]) {
    ledStep = (ledStep + 1) % steps;
    ledLastChange = now;
    // Even steps are ON, odd steps are OFF
    setLed((ledStep % 2) == 0);
  }
}

// Configuration Storage Implementation
bool ProvisioningManager::saveApplicationConfig(
    const ApplicationConfig &config) {
  Preferences prefs;
  if (!prefs.begin("app_config", false)) {
    LOG_E("Provisioning", "Failed to open preferences for app config");
    return false;
  }

  prefs.putString("firmware_url", config.firmwareUrl);
  prefs.putString("firmware_md5", config.firmwareMD5);
  prefs.putULong("firmware_size", config.firmwareSize);
  prefs.putString("api_endpoint", config.apiEndpoint);
  if (!config.apiToken.isEmpty()) {
    prefs.putString("update_token", config.apiToken);
  }
  prefs.putInt("printer_type", static_cast<int>(config.printerType));
  prefs.putString(NVS_PRINTER_CONN, config.printerConnectionData);
  prefs.putBool("assigned", config.assigned);

  prefs.end();
  LOG_I("Provisioning", "Application configuration saved (assigned=" +
                            String(config.assigned ? "true" : "false") + "):");
  LOG_I("Provisioning", "  api_endpoint=" + (config.apiEndpoint.isEmpty()
                                                 ? String("<empty>")
                                                 : config.apiEndpoint));
  LOG_I("Provisioning", "  firmware_url=" + (config.firmwareUrl.isEmpty()
                                                 ? String("<empty>")
                                                 : config.firmwareUrl));
  LOG_I("Provisioning", "  firmware_size=" + String(config.firmwareSize));
  return true;
}

ApplicationConfig ProvisioningManager::loadApplicationConfig() {
  ApplicationConfig config;
  config.assigned = false;
  config.printerConnectionData = "";

  Preferences prefs;
  if (!prefs.begin("app_config", true)) {
    LOG_E("Provisioning", "Failed to open preferences for app config");
    return config;
  }

  config.firmwareUrl = prefs.getString("firmware_url", "");
  config.firmwareMD5 = prefs.getString("firmware_md5", "");
  config.firmwareSize = prefs.getULong("firmware_size", 0);
  config.apiEndpoint = prefs.getString("api_endpoint", "");
  config.apiToken = prefs.getString("update_token", "");
  config.printerType = static_cast<PrinterType>(
      prefs.getInt("printer_type", static_cast<int>(PrinterType::GENERIC)));
  config.printerConnectionData = prefs.getString(NVS_PRINTER_CONN, "");
  config.assigned = prefs.getBool("assigned", false);

  prefs.end();

  LOG_I("Provisioning", "Loaded application configuration (assigned=" +
                            String(config.assigned ? "true" : "false") + "):");
  LOG_I("Provisioning", "  api_endpoint=" + (config.apiEndpoint.isEmpty()
                                                 ? String("<empty>")
                                                 : config.apiEndpoint));
  LOG_I("Provisioning", "  firmware_url=" + (config.firmwareUrl.isEmpty()
                                                 ? String("<empty>")
                                                 : config.firmwareUrl));
  LOG_I("Provisioning", "  firmware_size=" + String(config.firmwareSize));

  return config;
}

void ProvisioningManager::clearApplicationConfig() {
  Preferences prefs;
  if (prefs.begin("app_config", false)) {
    prefs.clear();
    prefs.end();
    LOG_I("Provisioning", "Application configuration cleared");
  }
}

// Application Assignment Implementation
bool ProvisioningManager::assignApplicationFirmware(
    const ApplicationConfig &config) {
  LOG_I("Provisioning", "Assigning application firmware");

  if (!config.assigned || config.firmwareUrl.isEmpty()) {
    LOG_E("Provisioning", "No application firmware assigned");
    return false;
  }

  return downloadAndInstallApplication(config.firmwareUrl, config.firmwareMD5,
                                       config.firmwareSize);
}

bool ProvisioningManager::downloadAndInstallApplication(const String &url,
                                                        const String &md5,
                                                        size_t size) {
  LOG_I("Provisioning", "Downloading application firmware from: " + url);
  if (!otaManager.downloadApplicationFirmware(url, md5)) {
    LOG_E("Provisioning", "Failed to download application firmware");
    return false;
  }

  LOG_I("Provisioning",
        "Application firmware downloaded and installed successfully");
  return true;
}
