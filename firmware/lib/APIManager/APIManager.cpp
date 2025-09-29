#include "APIManager.h"
#include <BasePrinter.h>
#include <Utils.h>
#include <ArduinoJson.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>

APIManager::APIManager() : 
    server(nullptr),
    motorController(nullptr),
    basePrinter(nullptr),
    authEnabled(false),
    requestCount(0),
    lastRequestTime(0) {
    
    apiKey = Utils::generateDeviceId();
}

APIManager::~APIManager() {
    if (server) {
        server->stop();
        delete server;
    }
}

bool APIManager::init(MotorController* motorCtrl, BasePrinter* basePrinter) {
    LOG_I("API", "Initializing API Manager");
    
    this->motorController = motorCtrl;
    this->basePrinter = basePrinter;
    
    server = new WebServer(API_PORT);
    
    setupRoutes();

    // Initialize OTA support in application mode
    if (!otaInitialized) {
        otaManager.init();
        otaInitialized = true;
    }
    
    server->onNotFound([this]() {
        sendErrorResponse(404, "Endpoint not found");
    });
    
    server->begin();
    
    LOG_I("API", "API Server started on port " + String(API_PORT));
    LOG_I("API", "API Key: " + apiKey);
    return true;
}

void APIManager::loop() {
    if (server) {
        server->handleClient();
    }
    // Drive OTA state machine (handles reboot after completion)
    if (otaInitialized) {
        otaManager.loop();
    }
}

void APIManager::setupRoutes() {
    // Basic endpoints
    server->on("/", HTTP_GET, [this]() { handleBaseSystemInfo(); });
    server->on("/status", HTTP_GET, [this]() { handleStatus(); });
    server->on("/system", HTTP_GET, [this]() { handleSystemInfo(); });
    server->on("/logs", HTTP_GET, [this]() { handleLogs(); });
    server->on("/logs/clear", HTTP_POST, [this]() {
        logRequest();
        sendSuccessResponse("{\"status\":\"cleared\"}");
        xTaskCreate(
            [](void*) {
                Logger::clearLogs();
                vTaskDelete(nullptr);
            },
            "logclr",
            2048,
            nullptr,
            1,
            nullptr);
    });
    // Allow reassignment of application firmware in app mode as well
    server->on("/assign-app", HTTP_POST, [this]() { handleOTAUpdate(); });
    server->on("/ota/update", HTTP_POST, [this]() { handleOTAUpdate(); });
    
    
    server->on("/motor/activate", HTTP_POST, [this]() { handleMotorControl(); });
    server->on("/motor/emergency-stop", HTTP_POST, [this]() { handleEmergencyStop(); });

    // catch and log unsupported api calls
    server->onNotFound([this]() {
        logRequest();
        sendErrorResponse(404, "Unsupported API endpoint");
    });

    LOG_I("API", "Routes configured");
}

void APIManager::setupCORS() {
    // CORS is handled in sendResponse method
}

bool APIManager::authenticateRequest() {
    if (!authEnabled) return true;
    
    String authHeader = server->header("Authorization");
    String expectedAuth = "Bearer " + apiKey;
    
    return (authHeader == expectedAuth);
}

void APIManager::sendResponse(int code, const String& message, const String& data) {
    server->send(code, "application/json", data.isEmpty() ? message : data);
    requestCount++;
    lastRequestTime = millis();
}

void APIManager::sendErrorResponse(int code, const String& error) {
    JsonDocument doc; // ArduinoJson v7
    doc["error"] = error;
    doc["code"] = code;
    doc["timestamp"] = millis();
    
    String response;
    serializeJson(doc, response);
    sendResponse(code, "", response);
}

void APIManager::sendSuccessResponse(const String& data) {
    sendResponse(200, "", data);
}

void APIManager::handleStatus() {
    logRequest();
    sendSuccessResponse(createStatusResponse());
}

void APIManager::handleBaseSystemInfo() {
    logRequest();
    sendSuccessResponse(createSystemBaseInfoResponse());
}

void APIManager::handleSystemInfo() {
    logRequest();
    sendSuccessResponse(createSystemInfoResponse());
}

void APIManager::handleLogs() {
    logRequest();
    bool shouldClear = false;
    if (server->hasArg("clear")) {
        String val = server->arg("clear");
        val.toLowerCase();
        shouldClear = (val == "1" || val == "true" || val == "yes");
    }

    String logs = Logger::getLogsAsJson();
    sendSuccessResponse(logs);
    if (shouldClear) {
        xTaskCreate(
            [](void*) {
                Logger::clearLogs();
                vTaskDelete(nullptr);
            },
            "logclr",
            2048,
            nullptr,
            1,
            nullptr);
    }
}


/**
 * @brief Handles the motor control endpoint.
 * 
 * @details This endpoint is used to control the motor.
 * 
 * Expected request body:
 * {
 *   "motor_position": 1,
 *   "speed": 100,
 *   "action": "move" | "stop"
 * }
 * 
 * @param requestBody The request body containing the motor id and action.
 * TODO: move body checking to client side to keep this lean.
 */
void APIManager::handleMotorControl() {
    if (!authenticateRequest()) {
        sendErrorResponse(401, "Authentication required");
        return;
    }
    
    logRequest();
    
    String requestBody = server->arg("plain");
    if (requestBody.isEmpty()) {
        sendErrorResponse(400, "Request body required");
        return;
    }
    
    JsonDocument doc; // ArduinoJson v7
    DeserializationError error = deserializeJson(doc, requestBody);
    
    if (error) {
        sendErrorResponse(400, "Invalid JSON");
        return;
    }
    
    if (!motorController) {
        sendErrorResponse(503, "Motor controller not available");
        return;
    }
    
    if (motorController->getState() != MotorController::MotorState::IDLE) {
        sendErrorResponse(409, "Motor is busy");
        return;
    }

    if (!doc["action"].is<String>()) {
        sendErrorResponse(400, "action required");
        return;
    }

    if (doc["action"].as<String>() == "stop") {
        motorController->stop();
        sendSuccessResponse("{\"status\":\"Motor stopped\"}");
        return;
    }

    if (!doc["motor_position"].is<int>()) {
        sendErrorResponse(400, "motor_position required and must be between 1 and 20");
        return;
    }
    int position = doc["motor_position"].as<int>();
    if (position <= 0 || position > 20) {
        sendErrorResponse(400, "motor_position required and must be between 1 and 20");
        return;
    }

    float speed = 800.0f;
    if (doc["speed"].is<float>()) {
        float s = doc["speed"].as<float>();
        if (s > 0) speed = s;
    } else if (doc["speed"].is<int>()) {
        int s = doc["speed"].as<int>();
        if (s > 0) speed = static_cast<float>(s);
    }
    motorController->moveToPosition(position, speed);
    sendSuccessResponse("{\"status\":\"Motor moved to position " + String(position) + " at speed " + String(speed) + "\"}");
}

void APIManager::handleEmergencyStop() {
    if (!authenticateRequest()) {
        sendErrorResponse(401, "Authentication required");
        return;
    }
    
    logRequest();
    LOG_W("API", "Emergency stop requested");
    
    if (motorController) {
        motorController->stop();
        sendSuccessResponse("{\"status\":\"Emergency stop activated\"}");
    } else {
        sendErrorResponse(503, "Motor controller not available");
    }
}


void APIManager::logRequest() {
    String method = (server->method() == HTTP_GET) ? "GET" : 
                   (server->method() == HTTP_POST) ? "POST" : "OTHER";
    LOG_I("API", method + " " + server->uri() + " from " + server->client().remoteIP().toString());
}

String APIManager::createStatusResponse() {
    JsonDocument doc; // ArduinoJson v7
    
    doc["device_id"] = Utils::generateDeviceId();
    doc["firmware_version"] = FIRMWARE_VERSION;
    doc["uptime"] = millis();
    doc["free_heap"] = ESP.getFreeHeap();
    doc["connected"] = WiFi.status() == WL_CONNECTED;
    doc["wifi_rssi"] = WiFi.RSSI();
    doc["api_requests"] = requestCount;
    if (motorController) {
        doc["motor_state"] = motorController->getState();
        doc["motor_position"] = motorController->getCurrentPosition();
    }
    
    String response;
    serializeJson(doc, response);
    return response;
}

String APIManager::createSystemBaseInfoResponse() {
    return basePrinter ? basePrinter->getPrinterInfo() : "";
}

String APIManager::createSystemInfoResponse() {
    JsonDocument doc; // ArduinoJson v7
    String printerInfo = basePrinter ? basePrinter->getPrinterInfo() : "";

    doc["printer_info"] = printerInfo;
    doc["chip_model"] = ESP.getChipModel();
    doc["chip_revision"] = ESP.getChipRevision();
    doc["cpu_freq"] = ESP.getCpuFreqMHz();
    doc["flash_size"] = ESP.getFlashChipSize();
    doc["free_heap"] = ESP.getFreeHeap();
    doc["sketch_size"] = ESP.getSketchSize();
    doc["free_sketch_space"] = ESP.getFreeSketchSpace();
    doc["sdk_version"] = ESP.getSdkVersion();
    // doc["boot_mode"] = ESP.getBootMode(); // Method not available
    
    String response;
    serializeJson(doc, response);
    return response;
}


// Placeholder implementations for missing methods
void APIManager::handleSpoolMapping() { sendErrorResponse(501, "Not implemented"); }
void APIManager::handlePrinterStatus() { sendErrorResponse(501, "Not implemented"); }
void APIManager::handlePrinterCommand() { sendErrorResponse(501, "Not implemented"); }
void APIManager::handleOTAUpdate() {
    if (!authenticateRequest()) {
        sendErrorResponse(401, "Authentication required");
        return;
    }

    logRequest();

    String body = server->arg("plain");
    if (body.isEmpty()) {
        sendErrorResponse(400, "Request body required");
        return;
    }

    // Delegate parsing, saving, and OTA start to OTAManager for reuse
    bool ok = otaManager.handleAssignmentRequest(body, true, true);

    JsonDocument resp;
    resp["status"] = ok ? "accepted" : "failed";
    resp["message"] = ok ? "OTA started; device will reboot on completion" : "Failed to start OTA";
    resp["ota_state"] = otaManager.getStateString();
    String out;
    serializeJson(resp, out);
    sendResponse(ok ? 202 : 500, "", out);
}
void APIManager::handleFactoryReset() { sendErrorResponse(501, "Not implemented"); }
void APIManager::handleMotorTest() { sendErrorResponse(501, "Not implemented"); }

String APIManager::generateAPIKey() {
    return Utils::generateDeviceId();
}

void APIManager::addEndpoint(const String& path, const String& method, const String& description, bool requiresAuth) {
    // Endpoint tracking for documentation
}
