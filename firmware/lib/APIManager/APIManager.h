#pragma once
#include <Arduino.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <Config.h>
#include <Logger.h>
#include <MotorController.h>
#include <OTAManager.h>

class BasePrinter;

struct APIEndpoint {
    String path;
    String method;
    String description;
    bool requiresAuth;
};

class APIManager {
private:
    WebServer* server;
    MotorController* motorController;
    BasePrinter* basePrinter;
    
    String apiKey;
    bool authEnabled;
    unsigned long requestCount;
    unsigned long lastRequestTime;
    
    std::vector<APIEndpoint> endpoints;

    // OTA support in application mode
    OTAManager otaManager;
    bool otaInitialized = false;
    
public:
    APIManager();
    ~APIManager();
    
    bool init(MotorController* motorCtrl = nullptr, BasePrinter* basePrinter = nullptr);
    void loop();
    
    void setMotorController(MotorController* motorCtrl) { this->motorController = motorCtrl; }
    void setBasePrinter(BasePrinter* basePrinter) { this->basePrinter = basePrinter; }
    
    String generateAPIKey();
    void setAPIKey(const String& key) { apiKey = key; }
    void enableAuth(bool enable) { authEnabled = enable; }
    
    unsigned long getRequestCount() const { return requestCount; }
    String getEndpointsJson() const;
    
private:
    void setupRoutes();
    void setupCORS();
    bool authenticateRequest();
    void sendResponse(int code, const String& message, const String& data = "");
    void sendErrorResponse(int code, const String& error);
    void sendSuccessResponse(const String& data = "{}");
    
    void handleStatus();
    void handleBaseSystemInfo();
    void handleSystemInfo();
    void handleLogs();
    void handleMotorControl();
    void handleSpoolMapping();
    void handlePrinterStatus();
    void handlePrinterCommand();
    void handleOTAUpdate();
    void handleFactoryReset();
    void handleEmergencyStop();
    void handleMotorTest();
    void handleEndpoints();
    
    void logRequest();
    String createStatusResponse();
    String createSystemBaseInfoResponse();
    String createSystemInfoResponse();
    // Removed legacy spool mapping parser signature; will reintroduce with a defined type later.
    // OTA payload parsing moved into OTAManager for reuse
    
    void addEndpoint(const String& path, const String& method, const String& description, bool requiresAuth = false);
};
