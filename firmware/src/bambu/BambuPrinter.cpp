#include "BambuPrinter.h"
#include <Utils.h>

BambuPrinter::BambuPrinter(MotorController* motor) :
    BasePrinter(),
    motorController(motor),
    mixedWasteValve(20),
    lastHeartbeat(0),
    lastStatusUpdate(0),
    activeValvePosition(-1),
    printErrorCode(0),
    mcPercent(0),
    mcRemainingTime(0) {
    
    // Initialize config with defaults
    config.mqttPort = 1883;
    config.useTLS = false;
    
    // Initialize print status
    currentStatus.state = PrinterState::IDLE;
    currentStatus.currentLayer = 0;
    currentStatus.totalLayers = 0;
    currentStatus.progressPercent = 0;
    currentStatus.remainingTime = 0;
    currentStatus.printError = 0;
    
    // Initialize AMS status
    amsStatus.activeSlot = -1;
    amsStatus.status = 0;
    amsStatus.rfidStatus = 0;
    for (int i = 0; i < 4; i++) {
        amsStatus.loaded[i] = false;
        amsStatus.materials[i] = "";
        amsStatus.remaining[i] = 0;
        amsStatus.tagUIDs[i] = "";
    }
    
    // Register Bambu-specific commands
    commandHandlers["VALVE_ACTIVATE"] = [this](const String& p) { cmdValveActivate(p); };
    commandHandlers["VALVE_DEACTIVATE"] = [this](const String& p) { cmdValveDeactivate(p); };
    commandHandlers["ROUTE_PURE_WASTE"] = [this](const String& p) { cmdRoutePureWaste(p); };
    commandHandlers["ROUTE_MIXED_WASTE"] = [this](const String& p) { cmdRouteMixedWaste(p); };
    commandHandlers["MATERIAL_CHANGE"] = [this](const String& p) { cmdMaterialChange(p); };
}

BambuPrinter::~BambuPrinter() {
    disconnect();
}

bool BambuPrinter::init() {
    LOG_I("Bambu", "Initializing Bambu Lab printer connection");
    // Topics will be set once configuration is available during connect()

    // Configure MQTT client
    mqttService.setCallback([this](char* topic, uint8_t* payload, unsigned int length) {
        mqttCallback(topic, payload, length);
    });
    mqttService.setBufferSize(8192); // Larger buffer for Bambu's JSON payloads
    // Use shorter keepalive to ensure broker sees periodic PINGREQs
    mqttService.setKeepAlive(15);
    
    LOG_I("Bambu", "Bambu printer client initialized");
    return true;
}

bool BambuPrinter::connect(const String& connectionParams) {
    // Load configuration from params or NVS
    if (connectionParams.length() > 0) {
        // Parse connection string format: "IP:PORT:SERIAL:ACCESS_CODE[:TLS]"
        int idx1 = connectionParams.indexOf(':');
        int idx2 = connectionParams.indexOf(':', idx1 + 1);
        int idx3 = connectionParams.indexOf(':', idx2 + 1);
        if (idx1 > 0 && idx2 > 0 && idx3 > 0) {
            config.printerIP = connectionParams.substring(0, idx1);
            config.mqttPort = connectionParams.substring(idx1 + 1, idx2).toInt();
            config.serialNumber = connectionParams.substring(idx2 + 1, idx3);
            config.accessCode = connectionParams.substring(idx3 + 1);
            // Optional TLS flag as trailing ":1" or ":true"
            int idx4 = connectionParams.indexOf(':', idx3 + 1);
            if (idx4 > 0) {
                String tlsStr = connectionParams.substring(idx4 + 1);
                tlsStr.toLowerCase();
                config.useTLS = (tlsStr == "1" || tlsStr == "true");
            }

            // Persist connection data for future reconnects
            JsonDocument doc;
            doc["ip"] = config.printerIP;
            doc["serial"] = config.serialNumber;
            doc["access_code"] = config.accessCode;
            doc["mqtt_port"] = config.mqttPort;
            doc["use_tls"] = config.useTLS;
            String raw;
            serializeJson(doc, raw);

            Preferences p;
            if (p.begin("app_config", false)) {
                p.putString(NVS_PRINTER_CONN, raw);
                p.end();
            }
        } else {
            LOG_E("Bambu", "Invalid connection parameters format");
            return false;
        }
    } else {
        // No parameters provided - load from stored config
        if (!loadConfigFromProvisioning()) {
            LOG_E("Bambu", "No stored Bambu configuration found");
            return false;
        }
    }

    // Configure MQTT topics (requires serial)
    reportTopic = "device/" + config.serialNumber + "/report";
    commandTopic = "device/" + config.serialNumber + "/request";

    String clientId = "ESP32_" + Utils::generateDeviceId();
    bool ok = mqttService.connect(config.printerIP, config.mqttPort,
                                  clientId, "bblp", config.accessCode, config.useTLS);
    if (ok) {
        mqttService.subscribe(reportTopic);
        // Request initial status
        sendCommand("{\"pushing\": {\"command\": \"pushall\"}}");
        connectionState = ConnectionState::CONNECTED;
        publishStatusSnapshot(true);
    } else {
        connectionState = ConnectionState::ERROR;
    }
    return ok;
}

bool BambuPrinter::loadConfigFromProvisioning() {
    Preferences p;
    if (!p.begin("app_config", true)) {
        LOG_E("Bambu", "Failed to open NVS namespace 'app_config'");
        return false;
    }
    printer_brand = p.getString("printer_brand", "");
    printer_model = p.getString("printer_model", "");
    printer_name = p.getString("printer_name", "");
    printer_id = p.getString("printer_id", "");
    String raw = p.getString(NVS_PRINTER_CONN, "");
    p.end();

    LOG_I("Bambu", "Loaded printer meta: brand='" + printer_brand + "' model='" + printer_model + "' name='" + printer_name + "' id='" + printer_id + "'");

    if (raw.isEmpty()) {
        LOG_E("Bambu", "No printer_connection_data found under '" + String(NVS_PRINTER_CONN) + "'");
        return false;
    }

    JsonDocument doc;
    auto jsonErr = deserializeJson(doc, raw);
    if (jsonErr != DeserializationError::Ok) {
        LOG_E("Bambu", String("Failed to parse printer_connection_data: ") + jsonErr.c_str());
        return false;
    }

    // Support multiple field names from different senders
    config.printerIP = doc["ipAddress"].is<String>() ? doc["ipAddress"].as<String>() : doc["ip"].as<String>();
    config.serialNumber = doc["serialNumber"].is<String>() ? doc["serialNumber"].as<String>() : doc["serial"].as<String>();
    config.accessCode = doc["accessCode"].is<String>() ? doc["accessCode"].as<String>() : doc["access_code"].as<String>();
    config.mqttPort = doc["port"].is<int>() ? (int)doc["port"] : doc["mqtt_port"].is<int>() ? (int)doc["mqtt_port"] : 8883;
    if (doc["use_tls"].is<bool>()) {
        config.useTLS = doc["use_tls"].as<bool>();
    } else if (doc["useTLS"].is<bool>()) {
        config.useTLS = doc["useTLS"].as<bool>();
    } else {
        config.useTLS = true; // default for Bambu MQTT
    }

    LOG_I("Bambu", "Connection params: ip=" + config.printerIP + 
                  ", serial=" + config.serialNumber + 
                  ", port=" + String(config.mqttPort) + 
                  ", tls=" + String(config.useTLS ? "true" : "false") +
                  ", access code=" + String(config.accessCode));
    if (config.accessCode.isEmpty()) {
        LOG_W("Bambu", "Access code is missing; MQTT auth will likely fail (rc=5)");
    }

    if (config.printerIP.isEmpty() || config.serialNumber.isEmpty() || config.accessCode.isEmpty()) {
        LOG_E("Bambu", "Incomplete printer configuration (need ip, serial, accessCode)");
        return false;
    }

    return true;
}

void BambuPrinter::disconnect() {
    if (mqttService.isConnected()) {
        LOG_I("Bambu", "Disconnecting from printer");
    }
    mqttService.disconnect();
    connectionState = ConnectionState::DISCONNECTED;
    publishStatusSnapshot(true);
}

void BambuPrinter::loop() {
    unsigned long currentTime = millis();

    mqttService.loop();
    if (mqttService.isConnected()) {
        connectionState = ConnectionState::CONNECTED;

        // Send heartbeat every 30 seconds
        if (currentTime - lastHeartbeat > 30000) {
            sendCommand("{\"pushing\": {\"command\": \"pushall\"}}");
            lastHeartbeat = currentTime;
        }
    } else {
        connectionState = ConnectionState::DISCONNECTED;
    }

    // Check for alerts
    if (currentTime - lastStatusUpdate > 5000) {
        checkAndSendAlerts();
        lastStatusUpdate = currentTime;
    }
}

bool BambuPrinter::isConnected() const {
    return mqttService.isConnected();
}

BasePrinter::PrintStatus BambuPrinter::getPrintStatus() const {
    return currentStatus;
}

int BambuPrinter::getMaterialInfo(std::vector<MaterialInfo>& materials) const {
    materials.clear();
    
    for (int i = 0; i < 4; i++) {
        if (amsStatus.loaded[i]) {
            MaterialInfo info;
            info.slotId = i;
            info.materialType = amsStatus.materials[i];
            info.remainingPercent = amsStatus.remaining[i];
            info.inUse = (amsStatus.activeSlot == i);
            materials.push_back(info);
        }
    }
    
    return materials.size();
}

bool BambuPrinter::sendCommand(const String& command) {
    if (!isConnected()) {
        LOG_W("Bambu", "Cannot send command - not connected");
        return false;
    }
    
    return mqttService.publish(commandTopic, command);
}

void BambuPrinter::parseMessage(const String& message) {
    // This is called for non-MQTT messages (e.g., serial)
    // For Bambu, all communication is via MQTT
}

String BambuPrinter::getStatusJson() const {
    JsonDocument doc; // ArduinoJson v7 (capacity grows automatically)
    
    doc["connected"] = isConnected();
    doc["printer_type"] = getPrinterType();
    doc["serial_number"] = config.serialNumber;
    doc["state"] = stateToString(currentStatus.state);
    doc["progress"] = currentStatus.progressPercent;
    doc["current_layer"] = currentStatus.currentLayer;
    doc["total_layers"] = currentStatus.totalLayers;
    doc["remaining_time"] = currentStatus.remainingTime;
    doc["current_material"] = currentStatus.currentMaterial;
    
    // AMS status
    JsonObject ams = doc["ams"].to<JsonObject>();
    ams["active_slot"] = amsStatus.activeSlot;
    ams["status"] = amsStatus.status;
    
    JsonArray slots = ams["slots"].to<JsonArray>();
    for (int i = 0; i < 4; i++) {
        if (amsStatus.loaded[i]) {
            JsonObject slot = slots.add<JsonObject>();
            slot["id"] = i;
            slot["material"] = amsStatus.materials[i];
            slot["remaining"] = amsStatus.remaining[i];
        }
    }
    
    // Active errors
    if (!activeErrors.empty()) {
        JsonArray errors = doc["errors"].to<JsonArray>();
        for (const auto& error : activeErrors) {
            JsonObject err = errors.add<JsonObject>();
            err["code"] = error.code;
            err["severity"] = error.severity;
            err["message"] = error.message;
        }
    }
    
    // Valve status
    doc["active_valve"] = activeValvePosition;
    
    String result;
    serializeJson(doc, result);
    return result;
}

String BambuPrinter::getPrinterInfo() const {
    JsonDocument doc; // ArduinoJson v7

    doc["printer_type"] = getPrinterType();
    doc["connected"] = isConnected();
    doc["printer_brand"] = printer_brand;
    doc["printer_model"] = printer_model;
    doc["printer_name"] = printer_name;
    doc["printer_id"] = printer_id;
    doc["serial_number"] = config.serialNumber;
    doc["printer_ip"] = config.printerIP;
    doc["mqtt_port"] = config.mqttPort;
    doc["use_tls"] = config.useTLS;
    
    String result;
    serializeJson(doc, result);
    return result;
}

bool BambuPrinter::saveConfiguration(const String& configJson) {
    JsonDocument doc; // ArduinoJson v7
    if (deserializeJson(doc, configJson) != DeserializationError::Ok) {
        return false;
    }

    // Persist entire connection payload under app_config
    Preferences prefs;
    if (prefs.begin("app_config", false)) {
        String raw;
        serializeJson(doc, raw);
        prefs.putString(NVS_PRINTER_CONN, raw);
        prefs.end();
    }

    // Update cached configuration
    config.printerIP = doc["ip"].as<String>();
    config.serialNumber = doc["serial"].as<String>();
    config.accessCode = doc["access_code"].as<String>();
    config.mqttPort = doc["mqtt_port"] | 1883;
    if (doc["use_tls"].is<bool>()) {
        config.useTLS = doc["use_tls"].as<bool>();
    }

    if (doc["valve_mappings"].is<JsonArray>()) {
        prefs.begin("bambu_valves", false);
        JsonArray mappings = doc["valve_mappings"];
        prefs.putInt("count", mappings.size());

        int i = 0;
        for (JsonVariant v : mappings) {
            String key = "m" + String(i);
            prefs.putInt((key + "_slot").c_str(), v["slot"]);
            prefs.putInt((key + "_valve").c_str(), v["valve"]);
            prefs.putString((key + "_mat").c_str(), v["material"].as<String>());
            prefs.putBool((key + "_pure").c_str(), v["pure"]);
            i++;
        }
        prefs.putInt("mixed_valve", doc["mixed_waste_valve"] | 20);
        prefs.end();
    }

    return true;
}

void BambuPrinter::configure(const BambuConfig& cfg) {
    config = cfg;
    reportTopic = "device/" + config.serialNumber + "/report";
    commandTopic = "device/" + config.serialNumber + "/request";
    LOG_I("Bambu", "Configured for printer: " + config.serialNumber);
}

void BambuPrinter::configureValveMappings(const std::vector<ValveMapping>& mappings) {
    valveMappings = mappings;
    LOG_I("Bambu", "Configured " + String(mappings.size()) + " valve mappings");
    
    for (const auto& mapping : mappings) {
        LOG_D("Bambu", "AMS Slot " + String(mapping.amsSlot) + " (" + mapping.material + 
              ") -> Valve " + String(mapping.valvePosition) + 
              " (" + (mapping.isPureWaste ? "PURE" : "MIXED") + ")");
    }
}

// Override command handlers

void BambuPrinter::cmdStartingPurge(const String& params) {
    BasePrinter::cmdStartingPurge(params);
    
    // Unpause printer after 1 second
    delay(1000);
    resumePrint();
}

void BambuPrinter::cmdWasteBallComplete(const String& params) {
    BasePrinter::cmdWasteBallComplete(params);
    cmdRoutePureWaste("");
}

void BambuPrinter::cmdCleanBallComplete(const String& params) {
    BasePrinter::cmdCleanBallComplete(params);
    cmdRouteMixedWaste("");
}

void BambuPrinter::cmdPauseForESP(const String& params) {
    BasePrinter::cmdPauseForESP(params);
    
    // Check if motor is ready and unpause
    if (motorController && motorController->getState() == MotorController::MotorState::IDLE) {
        delay(500);
        resumePrint();
        commandState.isPaused = false;
    }
}

// Bambu-specific command handlers

void BambuPrinter::cmdValveActivate(const String& params) {
    int position = params.toInt();
    if (position >= 1 && position <= 20) {
        logAction("Activating valve " + String(position));
        activateValve(position);
    } else {
        LOG_E("Bambu", "Invalid valve position: " + params);
    }
}

void BambuPrinter::cmdValveDeactivate(const String& params) {
    int position = params.toInt();
    if (position == activeValvePosition) {
        logAction("Deactivating valve " + String(position));
        deactivateValve();
    }
}

void BambuPrinter::cmdRoutePureWaste(const String& params) {
    if (amsStatus.activeSlot >= 0) {
        int valvePos = findValveForSlot(amsStatus.activeSlot, true);
        if (valvePos > 0) {
            logAction("Routing pure waste from AMS Slot " + String(amsStatus.activeSlot) + 
                     " to Valve " + String(valvePos));
            activateValve(valvePos);
        } else {
            LOG_W("Bambu", "No pure waste valve mapping for slot " + String(amsStatus.activeSlot));
        }
    }
}

void BambuPrinter::cmdRouteMixedWaste(const String& params) {
    logAction("Routing mixed waste to Valve " + String(mixedWasteValve));
    activateValve(mixedWasteValve);
}

void BambuPrinter::cmdMaterialChange(const String& params) {
    String oldMat, newMat;
    parseMaterialChangeParams(params, oldMat, newMat);
    
    commandState.previousMaterial = oldMat;
    commandState.currentMaterial = newMat;
    currentStatus.currentMaterial = newMat;
    
    // Find which AMS slot has the new material
    for (int i = 0; i < 4; i++) {
        if (amsStatus.materials[i] == newMat) {
            amsStatus.activeSlot = i;
            break;
        }
    }
    
    logAction("Material change: " + oldMat + " to " + newMat + 
             " (AMS Slot " + String(amsStatus.activeSlot) + ")");
    
    onFilamentChange(oldMat, newMat, amsStatus.activeSlot);
}

// MQTT callback
void BambuPrinter::mqttCallback(char* topic, uint8_t* payload, unsigned int length) {
    // Convert payload to string
    String message;
    message.reserve(length + 1);
    for (unsigned int i = 0; i < length; i++) {
        message += (char)payload[i];
    }
    
    LOG_D("Bambu", "MQTT message received on " + String(topic));
    
    // Parse JSON using a static non-deprecated document to avoid heap churn
    static JsonDocument doc; // ArduinoJson v7; static persists capacity across calls
    doc.clear();
    DeserializationError error = deserializeJson(doc, message);
    
    if (error) {
        LOG_E("Bambu", "Failed to parse MQTT JSON: " + String(error.c_str()));
        return;
    }
    
    parseReportMessage(doc);
}

// Message Parsing

void BambuPrinter::parseReportMessage(const JsonDocument& doc) {
    // Parse print status
    if (doc["print"].is<JsonObject>() || doc["print"].is<JsonObjectConst>()) {
        parsePrintStatus(doc["print"]);
    }
    
    // Parse AMS status
    if (doc["ams"].is<JsonObject>() || doc["ams"].is<JsonObjectConst>()) {
        parseAMSStatus(doc["ams"]);
    }
    
    // Parse HMS errors
    if (doc["hms"].is<JsonArray>() || doc["hms"].is<JsonArrayConst>()) {
        parseHMSErrors(doc["hms"]);
    }
    
    // Parse upgrade status
    if (doc["upgrade"].is<JsonObject>() || doc["upgrade"].is<JsonObjectConst>()) {
        parseUpgradeStatus(doc["upgrade"]);
    }
}

void BambuPrinter::parsePrintStatus(const JsonObjectConst& print) {
    // Update gcode state
    if (print["gcode_state"].is<String>()) {
        gcodeState = print["gcode_state"].as<String>();
        updatePrinterState(gcodeState);
    }
    
    // Update print error
    if (print["print_error"].is<int>()) {
        printErrorCode = print["print_error"];
        updatePrintError(printErrorCode);
    }
    
    // Update layers
    if (print["layer_num"].is<int>()) {
        currentStatus.currentLayer = print["layer_num"];
    }
    if (print["total_layer_num"].is<int>()) {
        currentStatus.totalLayers = print["total_layer_num"];
    }
    
    // Check for ESP32 commands in msg field
    if (print["msg"].is<String>()) {
        String msg = print["msg"].as<String>();
        if (!msg.isEmpty()) {
            String command = extractESP32Command(msg);
            if (!command.isEmpty()) {
                LOG_I("Bambu", "ESP32 command detected: " + command);
                parseESP32CommandFromMessage(command);
            }
        }
    }
    
    // Update progress
    if (print["mc_percent"].is<float>() || print["mc_percent"].is<int>()) {
        mcPercent = print["mc_percent"];
        currentStatus.progressPercent = mcPercent;
    }
    
    // Update remaining time
    if (print["mc_remaining_time"].is<int>()) {
        mcRemainingTime = print["mc_remaining_time"];
        currentStatus.remainingTime = mcRemainingTime;
    }

    notifyStatusUpdate(currentStatus);
}

void BambuPrinter::parseAMSStatus(const JsonObjectConst& ams) {
    // Reset AMS state to avoid stale entries
    amsStatus.activeSlot = -1;
    for (int i = 0; i < 4; i++) {
        amsStatus.loaded[i] = false;
        amsStatus.materials[i] = "";
        amsStatus.remaining[i] = 0;
        amsStatus.tagUIDs[i] = "";
    }
    if (ams["ams_status"].is<int>()) {
        amsStatus.status = ams["ams_status"];
    }
    
    if (ams["ams_rfid_status"].is<int>()) {
        amsStatus.rfidStatus = ams["ams_rfid_status"];
    }
    
    // Parse tray information
    if (ams["tray"].is<JsonArray>() || ams["tray"].is<JsonArrayConst>()) {
        JsonArrayConst trays = ams["tray"];
        for (JsonVariantConst trayVar : trays) {
            JsonObjectConst tray = trayVar.as<JsonObjectConst>();
            
            if (!tray["id"].isNull()) {
                int slotId = -1;
                if (tray["id"].is<int>()) {
                    slotId = tray["id"].as<int>();
                } else if (tray["id"].is<String>()) {
                    slotId = tray["id"].as<String>().toInt();
                }
                if (slotId >= 0 && slotId < 4) {
                    amsStatus.loaded[slotId] = true;
                    
                    if (tray["tray_type"].is<String>()) {
                        amsStatus.materials[slotId] = tray["tray_type"].as<String>();
                    }
                    
                    if (tray["remain"].is<int>()) {
                        amsStatus.remaining[slotId] = tray["remain"];
                        monitorFilamentLevel(slotId, amsStatus.remaining[slotId]);
                    }
                    
                    if (tray["tag_uid"].is<String>()) {
                        amsStatus.tagUIDs[slotId] = tray["tag_uid"].as<String>();
                    }
                    
                    if (tray["tray_now"].is<bool>() && tray["tray_now"]) {
                        amsStatus.activeSlot = slotId;
                        currentStatus.currentMaterial = amsStatus.materials[slotId];
                    }
                }
            }
        }
    }
    
    checkFilamentLevels();
}

void BambuPrinter::parseHMSErrors(const JsonArrayConst& hms) {
    activeErrors.clear();
    
    for (JsonVariantConst errorVar : hms) {
        JsonObjectConst error = errorVar.as<JsonObjectConst>();
        
        HMSError hmsError;
        if (error["code"].is<String>()) {
            hmsError.code = error["code"].as<String>();
        }
        if (error["severity"].is<String>()) {
            hmsError.severity = error["severity"].as<String>();
        }
        if (error["msg"].is<String>()) {
            hmsError.message = error["msg"].as<String>();
        }
        hmsError.timestamp = millis();
        
        activeErrors.push_back(hmsError);
        
        handleHMSError(hmsError.code, hmsError.severity, hmsError.message);
    }
}

void BambuPrinter::parseUpgradeStatus(const JsonObjectConst& upgrade) {
    String status = upgrade["status"].as<String>();
    int progress = upgrade["progress"];
    
    if (status == "downloading" || status == "installing") {
        LOG_I("Bambu", "Firmware upgrade in progress: " + status + " (" + String(progress) + "%)");
    }
}

String BambuPrinter::extractESP32Command(const String& msg) {
    if (msg.startsWith("ESP32:")) {
        return msg;
    }
    
    // Check if ESP32 command is embedded in the message
    int idx = msg.indexOf("ESP32:");
    if (idx >= 0) {
        return msg.substring(idx);
    }
    
    return "";
}

// State Management

void BambuPrinter::updatePrinterState(const String& gcode) {
    PrinterState newState = gcodeStateToPrinterState(gcode);
    
    if (newState != currentStatus.state) {
        PrinterState oldState = currentStatus.state;
        currentStatus.state = newState;
        onStateChange(oldState, newState);
    }
}

void BambuPrinter::updatePrintError(int errorCode) {
    currentStatus.printError = errorCode;
    
    if (errorCode != 0) {
        String errorMsg;
        BasePrinter::AlertLevel level = BasePrinter::AlertLevel::ALERT_HIGH;
        
        switch(errorCode) {
            case 1:
                errorMsg = "Filament runout detected";
                level = BasePrinter::AlertLevel::ALERT_CRITICAL;
                break;
            case 2:
                errorMsg = "Heating failed";
                level = BasePrinter::AlertLevel::ALERT_CRITICAL;
                break;
            case 3:
                errorMsg = "Bed leveling failed";
                level = BasePrinter::AlertLevel::ALERT_HIGH;
                break;
            case 4:
                errorMsg = "Nozzle clog detected";
                level = BasePrinter::AlertLevel::ALERT_HIGH;
                break;
            case 5:
                errorMsg = "Layer adhesion failure";
                level = BasePrinter::AlertLevel::ALERT_MEDIUM;
                break;
            default:
                errorMsg = "Unknown print error: " + String(errorCode);
                break;
        }
        
        currentStatus.errorMessage = errorMsg;
        onError(errorCode, errorMsg);
        sendAlert(level, "Print Error", errorMsg);
    }
}

void BambuPrinter::checkFilamentLevels() {
    for (int i = 0; i < 4; i++) {
        if (amsStatus.loaded[i]) {
            monitorFilamentLevel(i, amsStatus.remaining[i]);
        }

        notifyStatusUpdate(currentStatus, true);
    }
}

void BambuPrinter::handleHMSError(const String& code, const String& severity, const String& msg) {
    if (!isValidHMSCode(code)) {
        return;
    }
    
    BasePrinter::AlertLevel level = hmsToAlertLevel(severity);
    
    // Parse HMS code for category
    if (code.startsWith("HMS_03")) {
        // Temperature system error
        sendAlert(BasePrinter::AlertLevel::ALERT_CRITICAL, "Temperature System Error", msg);
    } else if (code.startsWith("HMS_05")) {
        // Communication error
        sendAlert(level, "Communication Error", msg);
    } else if (code.startsWith("HMS_07")) {
        // Motion system error
        sendAlert(BasePrinter::AlertLevel::ALERT_HIGH, "Motion System Error", msg);
    } else if (code.startsWith("HMS_0C")) {
        // First layer issues
        sendAlert(BasePrinter::AlertLevel::ALERT_MEDIUM, "First Layer Issue", msg);
    } else if (code.startsWith("HMS_12")) {
        // Filament/AMS system error
        sendAlert(BasePrinter::AlertLevel::ALERT_HIGH, "AMS System Error", msg);
    } else {
        // Generic HMS error
        sendAlert(level, "HMS Error " + code, msg);
    }
}

// Valve Control

void BambuPrinter::activateValve(int position) {
    if (position < 1 || position > 20) {
        LOG_E("Bambu", "Invalid valve position: " + String(position));
        return;
    }
    
    if (motorController) {
        if (activeValvePosition != position) {
            motorController->moveToPosition(position);
            activeValvePosition = position;
            LOG_I("Bambu", "Activated valve at position " + String(position));
        }
    } else {
        LOG_W("Bambu", "No motor controller available");
    }
}

void BambuPrinter::deactivateValve() {
    if (motorController && activeValvePosition > 0) {
        motorController->stop();
        LOG_I("Bambu", "Deactivated valve at position " + String(activeValvePosition));
        activeValvePosition = -1;
    }
}

int BambuPrinter::findValveForSlot(int slot, bool isPureWaste) {
    for (const auto& mapping : valveMappings) {
        if (mapping.amsSlot == slot && mapping.isPureWaste == isPureWaste) {
            return mapping.valvePosition;
        }
    }
    return -1;
}

int BambuPrinter::findValveForMaterial(const String& material, bool isPureWaste) {
    for (const auto& mapping : valveMappings) {
        if (mapping.material == material && mapping.isPureWaste == isPureWaste) {
            return mapping.valvePosition;
        }
    }
    return -1;
}

// Alert Management

void BambuPrinter::checkAndSendAlerts() {
    // Check for critical AMS status
    if (amsStatus.status == 3) {
        sendAlert(BasePrinter::AlertLevel::ALERT_HIGH, "AMS Error", "Filament jammed in AMS");
    } else if (amsStatus.status == 4) {
        sendAlert(BasePrinter::AlertLevel::ALERT_MEDIUM, "AMS Warning", "RFID read error");
    } else if (amsStatus.status == 5) {
        sendAlert(BasePrinter::AlertLevel::ALERT_MEDIUM, "AMS Warning", "Humidity too high");
    }
    
    // Check connection status
    if (!isConnected() && connectionState == ConnectionState::ERROR) {
        sendAlert(BasePrinter::AlertLevel::ALERT_HIGH, "Connection Lost", "Unable to connect to printer");
    }
}

BasePrinter::AlertLevel BambuPrinter::hmsToAlertLevel(const String& severity) {
    if (severity == "CRITICAL" || severity == "FATAL") {
        return BasePrinter::AlertLevel::ALERT_CRITICAL;
    } else if (severity == "ERROR" || severity == "SERIOUS") {
        return BasePrinter::AlertLevel::ALERT_HIGH;
    } else if (severity == "WARNING") {
        return BasePrinter::AlertLevel::ALERT_MEDIUM;
    } else {
        return BasePrinter::AlertLevel::ALERT_LOW;
    }
}

void BambuPrinter::monitorFilamentLevel(int slot, int remaining) {
    String materialName = amsStatus.materials[slot];
    
    if (remaining == 0) {
        sendAlert(BasePrinter::AlertLevel::ALERT_CRITICAL, "Filament Empty",
                  "Slot " + String(slot) + " (" + materialName + ") is empty");
    } else if (remaining < 5) {
        sendAlert(BasePrinter::AlertLevel::ALERT_HIGH, "Filament Critical",
                  "Slot " + String(slot) + " (" + materialName + ") has " + String(remaining) + "% remaining");
    } else if (remaining < 20) {
        sendAlert(BasePrinter::AlertLevel::ALERT_MEDIUM, "Filament Low",
                  "Slot " + String(slot) + " (" + materialName + ") has " + String(remaining) + "% remaining");
    }
}

// Utility Functions

String BambuPrinter::formatMQTTPayload(const String& command, const JsonDocument& params) {
    JsonDocument doc; // ArduinoJson v7
    JsonObject root = doc.to<JsonObject>();
    root[command] = params;
    
    String payload;
    serializeJson(doc, payload);
    return payload;
}

bool BambuPrinter::isValidHMSCode(const String& code) {
    // HMS codes follow pattern: HMS_XXXX_XXXX_XXXX_XXXX
    if (!code.startsWith("HMS_")) {
        return false;
    }
    
    // Basic validation - should have 4 groups of 4 hex digits
    return code.length() == 23;  // HMS_ + 4*4 digits + 3 underscores
}

BasePrinter::PrinterState BambuPrinter::gcodeStateToPrinterState(const String& gcode) {
    if (gcode == "IDLE") {
        return BasePrinter::PrinterState::IDLE;
    } else if (gcode == "RUNNING") {
        return BasePrinter::PrinterState::PRINTING;
    } else if (gcode == "PAUSED") {
        return BasePrinter::PrinterState::PAUSED;
    } else if (gcode == "FINISHED") {
        return BasePrinter::PrinterState::FINISHED;
    } else if (gcode == "CANCELLED") {
        return BasePrinter::PrinterState::CANCELLED;
    } else if (gcode == "ERROR") {
        return BasePrinter::PrinterState::ERROR;
    } else {
        return BasePrinter::PrinterState::UNKNOWN;
    }
}
