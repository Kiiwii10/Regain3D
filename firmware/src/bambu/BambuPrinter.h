#pragma once
#include <BasePrinter.h>
#include <MotorController.h>
#include <MqttService.h>
#include <ArduinoJson.h>
#include <Preferences.h>

/**
 * @brief Bambu Lab X1/P1 series printer implementation
 * 
 * Connects to Bambu printers via MQTT and handles AMS-specific waste routing
 */
class BambuPrinter : public BasePrinter {
public:
    // Bambu-specific structures
    struct BambuConfig {
        String printerIP;
        String serialNumber;
        String accessCode;
        int mqttPort;
        bool useTLS;
    };

    struct AMSStatus {
        int activeSlot;
        bool loaded[4];
        String materials[4];
        int remaining[4];  // Percentage remaining
        String tagUIDs[4];
        int status;
        int rfidStatus;
    };

    struct ValveMapping {
        int amsSlot;        // AMS slot (0-3)
        int valvePosition;  // Motor position (1-20)
        String material;    // PLA, PETG, TPU, etc.
        bool isPureWaste;   // true for pure, false for mixed
    };

    struct HMSError {
        String code;
        String severity;
        String message;
        unsigned long timestamp;
    };

private:
    // Configuration
    BambuConfig config;
    std::vector<ValveMapping> valveMappings;
    int mixedWasteValve;
    
    // MQTT
    MqttService mqttService;
    String reportTopic;
    String commandTopic;

    // Printer state
    PrintStatus currentStatus;
    AMSStatus amsStatus;
    std::vector<HMSError> activeErrors;
    unsigned long lastHeartbeat;
    unsigned long lastStatusUpdate;
    
    // Motor control
    MotorController* motorController;
    int activeValvePosition;
    
    // Print monitoring
    String gcodeState;
    int printErrorCode;
    float mcPercent;
    int mcRemainingTime;
    
public:
    BambuPrinter(MotorController* motor);
    ~BambuPrinter();
    
    // BasePrinter implementation
    bool init() override;
    bool connect(const String& connectionParams) override;
    void disconnect() override;
    void loop() override;
    bool isConnected() const override;
    PrintStatus getPrintStatus() const override;
    int getMaterialInfo(std::vector<MaterialInfo>& materials) const override;
    bool sendCommand(const String& command) override;
    void parseMessage(const String& message) override;
    String getStatusJson() const override;
    String getPrinterType() const override { return "Bambu Lab X1/P1"; }
    String getPrinterInfo() const override;
    bool saveConfiguration(const String& configJson) override;
    
    // Bambu-specific configuration
    void configure(const BambuConfig& cfg);
    void configureValveMappings(const std::vector<ValveMapping>& mappings);
    void setMixedWasteValve(int position) { mixedWasteValve = position; }
    
    // Bambu-specific status
    AMSStatus getAMSStatus() const { return amsStatus; }
    std::vector<HMSError> getActiveErrors() const { return activeErrors; }
    bool hasActiveErrors() const { return !activeErrors.empty(); }
    
protected:
    // Override command handlers for Bambu-specific behavior
    void cmdStartingPurge(const String& params) override;
    void cmdWasteBallComplete(const String& params) override;
    void cmdCleanBallComplete(const String& params) override;
    void cmdPauseForESP(const String& params) override;
    
    // Bambu-specific command handlers
    void cmdValveActivate(const String& params);
    void cmdValveDeactivate(const String& params);
    void cmdRoutePureWaste(const String& params);
    void cmdRouteMixedWaste(const String& params);
    void cmdMaterialChange(const String& params);
    
private:
    // MQTT functions
    void mqttCallback(char* topic, uint8_t* payload, unsigned int length);

    bool loadConfigFromProvisioning();
    
    // Message parsing
    void parseReportMessage(const JsonDocument& doc);
    void parsePrintStatus(const JsonObjectConst& print);
    void parseAMSStatus(const JsonObjectConst& ams);
    void parseHMSErrors(const JsonArrayConst& hms);
    void parseUpgradeStatus(const JsonObjectConst& upgrade);
    String extractESP32Command(const String& msg);
    
    // State management
    void updatePrinterState(const String& gcodeState);
    void updatePrintError(int errorCode);
    void checkFilamentLevels();
    void handleHMSError(const String& code, const String& severity, const String& msg);
    
    // Valve control
    void activateValve(int position);
    void deactivateValve();
    int findValveForSlot(int slot, bool isPureWaste);
    int findValveForMaterial(const String& material, bool isPureWaste);
    
    // Alert management
    void checkAndSendAlerts();
    BasePrinter::AlertLevel hmsToAlertLevel(const String& severity);
    void monitorFilamentLevel(int slot, int remaining);
    
    // Utility
    String formatMQTTPayload(const String& command, const JsonDocument& params);
    bool isValidHMSCode(const String& code);
    PrinterState gcodeStateToPrinterState(const String& gcode);
    
};
