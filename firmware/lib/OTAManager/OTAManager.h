#pragma once
#include <Arduino.h>
#include <Update.h>
#include <HTTPClient.h>
#include <esp_ota_ops.h>
#include <Config.h>
#include <Logger.h>
#include <ArduinoJson.h>

enum class OTAState {
    IDLE,
    CHECKING_UPDATE,
    DOWNLOADING,
    INSTALLING,
    COMPLETED,
    FAILED
};

struct OTAUpdateInfo {
    String version;
    String url;
    String md5;
    size_t size;
    bool available;
    String description;
};

class OTAManager {
private:
    OTAState currentState;
    OTAUpdateInfo updateInfo;
    String serverUrl;
    bool initialized;
    unsigned long lastCheck;
    size_t downloadedBytes;
    size_t totalBytes;
    // Track the actual OTA target partition and bytes written
    const esp_partition_t* targetPartition = nullptr;
    size_t lastWrittenBytes = 0;
    
public:
    struct OTAAssignment {
        String firmwareUrl;
        String firmwareMD5;
        size_t firmwareSize;
        String apiEndpoint;
        String updateToken;
        String printerBrand;      // e.g. "bambu", "prusa"
        String printerModel;
        String printerId;
        String printerName;
        String printerConnectionJson; // raw JSON of connection details
    };
    OTAManager();
    ~OTAManager();
    
    bool init(const String& otaServerUrl = DEFAULT_OTA_URL);
    void loop();
    
    bool checkForUpdate();
    bool downloadApplicationFirmware();
    bool downloadApplicationFirmware(const String& firmwareUrl, const String& expectedMD5 = "");
    void abort();
    
    OTAState getState() const { return currentState; }
    String getStateString() const;
    OTAUpdateInfo getUpdateInfo() const { return updateInfo; }
    String getStatusJson() const;
    
    float getDownloadProgress() const;
    bool isUpdateAvailable() const { return updateInfo.available; }
    bool isIdle() const { return currentState == OTAState::IDLE; }
    
    void setServerUrl(const String& url) { serverUrl = url; }
    String getServerUrl() const { return serverUrl; }
    
    // Partition management for dual-app OTA
    bool switchToApplicationPartition();
    void rebootToApplication();
    
    // Assignment helpers for reuse across provisioner/app
    bool parseAssignmentPayload(const String& json, OTAAssignment& outAssignment);
    bool saveAssignmentToNVS(const OTAAssignment& assignment, bool markAssigned = true, bool savePrinterMeta = true);
    bool handleAssignmentRequest(const String& json, bool triggerDownload = true, bool savePrinterMeta = true);
    
private:
    bool downloadFirmwareToApp1(const String& url);
    bool validateFirmware(const String& expectedMD5);
    void setState(OTAState newState);
    void resetUpdateInfo();
    
    bool fetchUpdateInfo();
    void handleOTAProgress(size_t progress, size_t total);
    
    String createOTAStateString(OTAState state) const;
    
    // Partition utilities
    const esp_partition_t* getApp1Partition();
    bool setBootPartition(const esp_partition_t* partition);
};
