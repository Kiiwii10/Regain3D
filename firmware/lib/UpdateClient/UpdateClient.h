#pragma once
#include <Arduino.h>
#include <ArduinoJson.h>
#include <vector>

class UpdateClient {
public:
    UpdateClient();
    bool init(const String& baseUrl, const String& token, const String& deviceId);
    void setPrinterMetadata(const String& printerId, const String& brand, const String& model, const String& name);
    void queueStatusUpdate(const JsonDocument& doc, bool force = false);
    void queueAlert(const JsonDocument& doc);
    void queueLogs(const String& logsJson);
    void loop();

    unsigned long getLastSuccessAt() const { return lastSuccessAt; }
    unsigned long getLastFailureAt() const { return lastFailureAt; }
    uint8_t getConsecutiveFailures() const { return consecutiveFailures; }
    bool hasPending() const;

private:
    String baseUrl;
    String authToken;
    String deviceId;
    String printerId;
    String printerBrand;
    String printerModel;
    String printerName;

    String pendingStatusPayload;
    std::vector<String> alertQueue;
    String pendingLogPayload;

    unsigned long nextAttemptAt;
    unsigned long lastSuccessAt;
    unsigned long lastFailureAt;
    uint8_t consecutiveFailures;

    bool isReady() const;
    bool postJson(const String& path, const String& json);
    void processPending();
    void scheduleNextAttempt(bool success);
};
