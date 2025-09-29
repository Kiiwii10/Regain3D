#pragma once
#include <Arduino.h>
#include <Config.h>
#include <Logger.h>
#include <WiFiManager.h>
#include <MotorController.h>
#include <APIManager.h>
#include <UpdateClient.h>
#include <Preferences.h>
#include <BasePrinter.h>



struct ApplicationConfig {
    PrinterType printerType;
    String apiEndpoint;
    String apiToken;
    String firmwareUrl;
    String firmwareMD5;
    size_t firmwareSize;
    bool assigned;
};

enum class ApplicationState {
    INITIALIZING,
    CONNECTING_WIFI,
    CONFIGURING_PRINTER,
    CONNECTING_PRINTER,
    STARTING_SERVICES,
    RUNNING,
    ERROR
};

class ApplicationManager {
private:
    WiFiManager* wifiManager;
    MotorController* motorController;
    APIManager* apiManager;
    UpdateClient* updateClient;
    BasePrinter* printer;

    ApplicationState currentState;
    unsigned long stateChangeTime;
    bool initialized;
    ApplicationConfig appConfig;
    String deviceId;

    unsigned long lastHeartbeat;
    unsigned long lastWiFiCheck;
    unsigned long lastPrinterCheck;
    unsigned long lastStatusEnqueue;
    bool wifiPreviouslyConnected;
    bool fallbackServerActive;

public:
    ApplicationManager(BasePrinter* printer, MotorController* motorController = nullptr);
    ~ApplicationManager();
    
    bool init(const String& printerType);
    void loop();
    
    ApplicationState getState() const { return currentState; }
    bool isRunning() const { return currentState == ApplicationState::RUNNING; }
    
    MotorController* getMotorController() const { return motorController; }
    APIManager* getAPIManager() const { return apiManager; }
    
private:
    bool initializeComponents();
    bool connectToWiFi();
    bool connectPrinter();
    bool startServices();
    void handleRunning();
    void handleError();
    void updateState(ApplicationState newState);
    void performHeartbeat();
    void checkWiFiConnection();
    void setupLogTransmission();
    String getStateString(ApplicationState state) const;
    void printApplicationInfo();
    void handlePrinterAlert(BasePrinter::AlertLevel level, const String& msg, const String& details);
    void checkPrinterConnection();
    bool savePrinterConfig(const String& configJson);
    void enqueueStatusUpdate(bool force = false, const BasePrinter::PrintStatus* statusOverride = nullptr);
    void ensureFallbackServer();
    void evaluateUpdateHealth();
    void handlePrinterStatusEvent(const BasePrinter::PrintStatus& status);

    // Configuration loading
    bool loadApplicationConfig();
    ApplicationConfig getApplicationConfig() const { return appConfig; }
};
