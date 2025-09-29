#pragma once
#include <Arduino.h>
#include <Config.h>
#include <Logger.h>
#include <ArduinoJson.h>
#include <map>
#include <functional>

/**
 * @brief Abstract base class for printer implementations
 * 
 * This class defines the interface that all printer implementations must follow.
 * It provides the basic structure for printer communication, state monitoring,
 * and ESP32 command processing while remaining printer-agnostic.
 */
class BasePrinter {
public:
    enum class PrinterState {
        IDLE,
        PRINTING,
        PAUSED,
        ERROR,
        FINISHED,
        CANCELLED,
        MAINTENANCE,
        CALIBRATING,
        UNKNOWN
    };

    enum class ConnectionState {
        DISCONNECTED,
        CONNECTING,
        CONNECTED,
        ERROR
    };

    enum class AlertLevel {
        ALERT_LOW,
        ALERT_MEDIUM,
        ALERT_HIGH,
        ALERT_CRITICAL
    };

    struct PrintStatus {
        PrinterState state;
        int currentLayer;
        int totalLayers;
        int progressPercent;
        int remainingTime; // in seconds
        String currentMaterial;
        int printError;
        String errorMessage;
    };

    struct MaterialInfo {
        int slotId;
        String materialType;
        int remainingPercent;
        bool inUse;
    };

    String printer_id;
    String printer_brand;
    String printer_model;
    String printer_name;


protected:
    // Command processing state
    struct CommandState {
        bool isChangingFilament;
        bool isPurging;
        bool isPaused;
        String currentMaterial;
        String previousMaterial;
        unsigned long changeStartTime;
        unsigned long lastCommandTime;
    };

public:
    BasePrinter() : 
        connectionState(ConnectionState::DISCONNECTED),
        lastStatusUpdate(0),
        alertCallback(nullptr) {
        initializeCommandHandlers();
    }
    
    virtual ~BasePrinter() = default;

    // Pure virtual functions that must be implemented by derived classes
    
    /**
     * @brief Initialize the printer connection
     * @return true if initialization successful
     */
    virtual bool init() = 0;
    
    /**
     * @brief Connect to the printer
     * @param connectionParams Printer-specific connection parameters (IP, serial port, etc.)
     * @return true if connection successful
     */
    virtual bool connect(const String& connectionParams) = 0;
    
    /**
     * @brief Disconnect from the printer
     */
    virtual void disconnect() = 0;
    
    /**
     * @brief Main loop function to handle printer communication
     */
    virtual void loop() = 0;
    
    /**
     * @brief Check if connected to printer
     * @return true if connected
     */
    virtual bool isConnected() const = 0;
    
    /**
     * @brief Get current print status
     * @return PrintStatus structure with current state
     */
    virtual PrintStatus getPrintStatus() const = 0;
    
    /**
     * @brief Get information about loaded materials
     * @param materials Vector to fill with material information
     * @return Number of materials found
     */
    virtual int getMaterialInfo(std::vector<MaterialInfo>& materials) const = 0;
    
    /**
     * @brief Send a command to the printer
     * @param command Command to send (G-code, MQTT message, etc.)
     * @return true if command sent successfully
     */
    virtual bool sendCommand(const String& command) = 0;
    
    /**
     * @brief Parse incoming message from printer
     * @param message Raw message from printer
     */
    virtual void parseMessage(const String& message) = 0;
    
    /**
     * @brief Get printer-specific status as JSON
     * @return JSON string with printer status
     */
    virtual String getStatusJson() const = 0;
    
    /**
     * @brief Get the printer type/model
     * @return String identifying the printer type
     */
    virtual String getPrinterType() const = 0;

    /**
     * @brief Get Base Printer information
     * @return JSON string with printer information
     */
    virtual String getBasePrinterInfo() const {
        JsonDocument doc; // ArduinoJson v7

        doc["printer_type"] = getPrinterType();
        doc["connected"] = isConnected();
        doc["printer_brand"] = printer_brand;
        doc["printer_model"] = printer_model;
        doc["printer_name"] = printer_name;
        doc["printer_id"] = printer_id;
        
        String result;
        serializeJson(doc, result);
        return result;
    }

    /**
     * @brief Get printer-specific information
     * @return JSON string with printer information
     */
    virtual String getPrinterInfo() const = 0;

    /**
     * @brief Save printer-specific configuration
     * @param configJson JSON string with configuration data
     * @return true if save was successful
     */
    virtual bool saveConfiguration(const String& configJson) = 0;

    // Common functions with default implementations
    
    /**
     * @brief Pause the current print
     * @return true if pause command sent successfully
     */
    virtual bool pausePrint() {
        LOG_I("Printer", "Pause print requested");
        return sendCommand("M0"); // Default G-code pause
    }
    
    /**
     * @brief Resume the current print
     * @return true if resume command sent successfully
     */
    virtual bool resumePrint() {
        LOG_I("Printer", "Resume print requested");
        return sendCommand("M108"); // Default G-code resume
    }
    
    /**
     * @brief Cancel the current print
     * @return true if cancel command sent successfully
     */
    virtual bool cancelPrint() {
        LOG_I("Printer", "Cancel print requested");
        return sendCommand("M524"); // Default G-code cancel
    }
    
    /**
     * @brief Emergency stop
     * @return true if emergency stop command sent successfully
     */
    virtual bool emergencyStop() {
        LOG_W("Printer", "EMERGENCY STOP requested");
        return sendCommand("M112"); // Standard emergency stop
    }

    // Event handlers that can be overridden
    
    /**
     * @brief Called when printer state changes
     * @param oldState Previous state
     * @param newState New state
     */
    virtual void onStateChange(PrinterState oldState, PrinterState newState) {
        LOG_I("Printer", "State changed: " + stateToString(oldState) + " -> " + stateToString(newState));
        publishStatusSnapshot(true);
    }
    
    /**
     * @brief Called when an error occurs
     * @param errorCode Error code from printer
     * @param errorMessage Human-readable error message
     */
    virtual void onError(int errorCode, const String& errorMessage) {
        LOG_E("Printer", "Error " + String(errorCode) + ": " + errorMessage);
        publishStatusSnapshot(true);
    }
    
    /**
     * @brief Called when filament change is detected
     * @param oldMaterial Previous material type
     * @param newMaterial New material type
     * @param slotId Slot/extruder ID
     */
    virtual void onFilamentChange(const String& oldMaterial, const String& newMaterial, int slotId) {
        LOG_I("Printer", "Filament change: " + oldMaterial + " -> " + newMaterial + " (Slot " + String(slotId) + ")");
    }
    
    /**
     * @brief Called when layer changes during print
     * @param layer Current layer number
     */
    virtual void onLayerChange(int layer) {
        LOG_D("Printer", "Layer changed to: " + String(layer));
    }

    // Alert & status callback system
    typedef std::function<void(const PrintStatus& status)> StatusCallback;
    typedef std::function<void(AlertLevel level, const String& message, const String& details)> AlertCallback;
    
    /**
     * @brief Set callback for alerts
     * @param callback Function to call for alerts
     */
    void setStatusCallback(StatusCallback callback) { statusCallback = callback; }
    void setAlertCallback(AlertCallback callback) { alertCallback = callback; }

    void publishStatusSnapshot(bool force = false) { notifyStatusUpdate(getPrintStatus(), force); }

    // Utility functions
    
    ConnectionState getConnectionState() const { return connectionState; }
    CommandState getCommandState() const { return commandState; }
    
    String stateToString(PrinterState state) const {
        switch(state) {
            case PrinterState::IDLE: return "IDLE";
            case PrinterState::PRINTING: return "PRINTING";
            case PrinterState::PAUSED: return "PAUSED";
            case PrinterState::ERROR: return "ERROR";
            case PrinterState::FINISHED: return "FINISHED";
            case PrinterState::CANCELLED: return "CANCELLED";
            case PrinterState::MAINTENANCE: return "MAINTENANCE";
            case PrinterState::CALIBRATING: return "CALIBRATING";
            default: return "UNKNOWN";
        }
    }
    
    String connectionStateToString(ConnectionState state) const {
        switch(state) {
            case ConnectionState::DISCONNECTED: return "DISCONNECTED";
            case ConnectionState::CONNECTING: return "CONNECTING";
            case ConnectionState::CONNECTED: return "CONNECTED";
            case ConnectionState::ERROR: return "ERROR";
            default: return "UNKNOWN";
        }
    }

protected:
    ConnectionState connectionState;
    CommandState commandState;
    unsigned long lastStatusUpdate;
    StatusCallback statusCallback;
    PrintStatus lastPublishedStatus;
    bool hasPublishedStatus = false;
    unsigned long lastStatusEmit = 0;
    AlertCallback alertCallback;
    
    // Command handlers map - derived classes can add their own
    std::map<String, std::function<void(const String&)>> commandHandlers;
    
    /**
     * @brief Initialize standard ESP32 command handlers
     * Derived classes should call this in their constructor and can add more handlers
     */
    void initializeCommandHandlers() {
        // Register standard command handlers
        commandHandlers["FILAMENT_CHANGE_START"] = [this](const String& p) { cmdFilamentChangeStart(p); };
        commandHandlers["STARTING_PURGE"] = [this](const String& p) { cmdStartingPurge(p); };
        commandHandlers["WASTE_BALL_COMPLETE"] = [this](const String& p) { cmdWasteBallComplete(p); };
        commandHandlers["CLEAN_BALL_COMPLETE"] = [this](const String& p) { cmdCleanBallComplete(p); };
        commandHandlers["MOVING_TO_WIPE"] = [this](const String& p) { cmdMovingToWipe(p); };
        commandHandlers["WIPE_COMPLETE"] = [this](const String& p) { cmdWipeComplete(p); };
        commandHandlers["RESUMING_PRINT"] = [this](const String& p) { cmdResumingPrint(p); };
        commandHandlers["PAUSE_FOR_ESP"] = [this](const String& p) { cmdPauseForESP(p); };
        commandHandlers["PRINT_START"] = [this](const String& p) { cmdPrintStart(p); };
        commandHandlers["LAYER_CHANGE"] = [this](const String& p) { cmdLayerChange(p); };
        commandHandlers["PRINT_PAUSE"] = [this](const String& p) { cmdPrintPause(p); };
        commandHandlers["PRINT_RESUME"] = [this](const String& p) { cmdPrintResume(p); };
        commandHandlers["PRINT_COMPLETE"] = [this](const String& p) { cmdPrintComplete(p); };
        commandHandlers["PRINT_CANCEL"] = [this](const String& p) { cmdPrintCancel(p); };
        commandHandlers["ERROR_DETECTED"] = [this](const String& p) { cmdErrorDetected(p); };
        commandHandlers["RECOVERY_START"] = [this](const String& p) { cmdRecoveryStart(p); };
        commandHandlers["RECOVERY_SUCCESS"] = [this](const String& p) { cmdRecoverySuccess(p); };
        commandHandlers["MANUAL_INTERVENTION"] = [this](const String& p) { cmdManualIntervention(p); };
        commandHandlers["CALIBRATION_START"] = [this](const String& p) { cmdCalibrationStart(p); };
        commandHandlers["CALIBRATION_COMPLETE"] = [this](const String& p) { cmdCalibrationComplete(p); };
        commandHandlers["MAINTENANCE_MODE"] = [this](const String& p) { cmdMaintenanceMode(p); };
        commandHandlers["SYSTEM_CHECK"] = [this](const String& p) { cmdSystemCheck(p); };
    }

    void notifyStatusUpdate(const PrintStatus& status, bool force = false) {
        if (!statusCallback) {
            return;
        }

        unsigned long now = millis();
        bool shouldSend = force || !hasPublishedStatus;

        if (!shouldSend) {
            if (status.state != lastPublishedStatus.state ||
                status.progressPercent != lastPublishedStatus.progressPercent ||
                status.currentLayer != lastPublishedStatus.currentLayer ||
                status.totalLayers != lastPublishedStatus.totalLayers ||
                status.remainingTime != lastPublishedStatus.remainingTime ||
                status.printError != lastPublishedStatus.printError ||
                status.currentMaterial != lastPublishedStatus.currentMaterial ||
                status.errorMessage != lastPublishedStatus.errorMessage) {
                shouldSend = true;
            }
        }

        if (!shouldSend && (now - lastStatusEmit) > 30000UL) {
            shouldSend = true;
        }

        if (!shouldSend) {
            return;
        }

        lastPublishedStatus = status;
        hasPublishedStatus = true;
        lastStatusEmit = now;
        statusCallback(status);
    }

    /**
     * @brief Process ESP32 command
     * @param command Command name (without ESP32: prefix)
     * @param params Command parameters
     */
    void processESP32Command(const String& command, const String& params = "") {
        auto it = commandHandlers.find(command);
        if (it != commandHandlers.end()) {
            commandState.lastCommandTime = millis();
            it->second(params);
        } else {
            LOG_W("Printer", "Unknown ESP32 command: " + command);
        }
    }
    
    /**
     * @brief Parse ESP32 commands from messages (e.g., M117)
     * @param message Message content
     * @return true if ESP32 command was found and processed
     */
    bool parseESP32CommandFromMessage(const String& message) {
        if (message.startsWith("ESP32:")) {
            int colonPos = message.indexOf(':', 6);
            if (colonPos > 0) {
                String command = message.substring(6, colonPos);
                String params = message.substring(colonPos + 1);
                processESP32Command(command, params);
            } else {
                String command = message.substring(6);
                processESP32Command(command, "");
            }
            return true;
        }
        return false;
    }
    
    // Default command implementations - derived classes can override
    
    virtual void cmdFilamentChangeStart(const String& params) {
        logAction("Starting filament change sequence");
        commandState.isChangingFilament = true;
        commandState.changeStartTime = millis();
        commandState.previousMaterial = commandState.currentMaterial;
    }
    
    virtual void cmdStartingPurge(const String& params) {
        logAction("Purge started - will unpause printer in 1 second");
        commandState.isPurging = true;
        // Derived classes should handle unpause with their specific timing
    }
    
    virtual void cmdWasteBallComplete(const String& params) {
        logAction("Waste ball complete");
        // Derived classes handle routing
    }
    
    virtual void cmdCleanBallComplete(const String& params) {
        logAction("Clean ball complete");
        // Derived classes handle routing
    }
    
    virtual void cmdMovingToWipe(const String& params) {
        logAction("Moving to wipe position");
    }
    
    virtual void cmdWipeComplete(const String& params) {
        logAction("Wipe complete");
        commandState.isPurging = false;
    }
    
    virtual void cmdResumingPrint(const String& params) {
        logAction("Filament change complete - resuming print");
        resetFilamentChangeState();
    }
    
    virtual void cmdPauseForESP(const String& params) {
        logAction("Printer paused for ESP32");
        commandState.isPaused = true;
        // Derived classes handle unpause logic
    }
    
    virtual void cmdPrintStart(const String& params) {
        logAction("Print job started - monitoring enabled");
        resetFilamentChangeState();
    }
    
    virtual void cmdLayerChange(const String& params) {
        int layer = params.toInt();
        logAction("Layer " + String(layer) + " started");
        onLayerChange(layer);
    }
    
    virtual void cmdPrintPause(const String& params) {
        logAction("Print paused");
        commandState.isPaused = true;
    }
    
    virtual void cmdPrintResume(const String& params) {
        logAction("Print resumed");
        commandState.isPaused = false;
    }
    
    virtual void cmdPrintComplete(const String& params) {
        logAction("Print completed successfully");
        resetFilamentChangeState();
    }
    
    virtual void cmdPrintCancel(const String& params) {
        logAction("Print cancelled");
        resetFilamentChangeState();
    }
    
    virtual void cmdErrorDetected(const String& params) {
        logAction("Print error detected - Code " + params);
        sendAlert(AlertLevel::ALERT_HIGH, "Print error detected", "Error code: " + params);
    }
    
    virtual void cmdRecoveryStart(const String& params) {
        logAction("Error recovery started");
    }
    
    virtual void cmdRecoverySuccess(const String& params) {
        logAction("Error recovery successful");
    }
    
    virtual void cmdManualIntervention(const String& params) {
        logAction("Manual intervention required");
        sendAlert(AlertLevel::ALERT_HIGH, "Manual intervention required", "Please check the printer");
    }
    
    virtual void cmdCalibrationStart(const String& params) {
        logAction("Printer calibration started");
    }
    
    virtual void cmdCalibrationComplete(const String& params) {
        logAction("Calibration completed");
    }
    
    virtual void cmdMaintenanceMode(const String& params) {
        logAction("Maintenance mode activated");
    }
    
    virtual void cmdSystemCheck(const String& params) {
        logAction("Performing system health check");
    }
    
    // Helper functions for derived classes
    
    void logAction(const String& action) {
        LOG_I("Printer", "ACTION: " + action);
    }
    
    void sendAlert(AlertLevel level, const String& message, const String& details) {
        String levelStr;
        switch(level) {
            case AlertLevel::ALERT_CRITICAL: levelStr = "CRITICAL"; break;
            case AlertLevel::ALERT_HIGH: levelStr = "HIGH"; break;
            case AlertLevel::ALERT_MEDIUM: levelStr = "MEDIUM"; break;
            case AlertLevel::ALERT_LOW: levelStr = "LOW"; break;
        }
        
        LOG_W("Alert", levelStr + ": " + message + " - " + details);
        
        if (alertCallback) {
            alertCallback(level, message, details);
        }
    }
    
    void resetFilamentChangeState() {
        commandState.isChangingFilament = false;
        commandState.isPurging = false;
        commandState.changeStartTime = 0;
        commandState.previousMaterial = "";
    }
    
    String parseMaterialChangeParams(const String& params, String& oldMaterial, String& newMaterial) {
        int colonPos = params.indexOf(':');
        if (colonPos > 0) {
            oldMaterial = params.substring(0, colonPos);
            newMaterial = params.substring(colonPos + 1);
            return newMaterial;
        }
        return "";
    }
};
