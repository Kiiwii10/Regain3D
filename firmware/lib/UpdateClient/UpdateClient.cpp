#include "UpdateClient.h"
#include <HTTPClient.h>
#include <Logger.h>
#include <algorithm>
#include <vector>

#include <mbedtls/base64.h>

namespace {
constexpr unsigned long kMinBackoffMs = 1000UL;
constexpr unsigned long kMaxBackoffMs = 60000UL;
}

UpdateClient::UpdateClient()
    : baseUrl("")
    , authToken("")
    , deviceId("")
    , printerId("")
    , printerBrand("")
    , printerModel("")
    , printerName("")
    , pendingStatusPayload("")
    , pendingLogPayload("")
    , nextAttemptAt(0)
    , lastSuccessAt(0)
    , lastFailureAt(0)
    , consecutiveFailures(0) {}

bool UpdateClient::init(const String& base, const String& token, const String& device) {
    baseUrl = base;
    authToken = token;
    deviceId = device;
    nextAttemptAt = 0;
    lastSuccessAt = 0;
    lastFailureAt = 0;
    consecutiveFailures = 0;
    alertQueue.clear();
    if (baseUrl.isEmpty()) {
        LOG_W("Update", "No API endpoint configured for push updates");
        return false;
    }
    if (authToken.isEmpty()) {
        LOG_W("Update", "API credentials missing - push updates will be unauthenticated");
    }
    LOG_I("Update", "Configured push endpoint: " + baseUrl);
    return true;
}

void UpdateClient::setPrinterMetadata(const String& printer, const String& brand, const String& model, const String& name) {
    printerId = printer;
    printerBrand = brand;
    printerModel = model;
    printerName = name;
}

void UpdateClient::queueStatusUpdate(const JsonDocument& doc, bool force) {
    String payload;
    serializeJson(doc, payload);
    pendingStatusPayload = payload;
    if (force) {
        nextAttemptAt = 0;
    }
    processPending();
}

void UpdateClient::queueAlert(const JsonDocument& doc) {
    String payload;
    serializeJson(doc, payload);
    alertQueue.push_back(payload);
    if (alertQueue.size() > 5) {
        alertQueue.erase(alertQueue.begin());
    }
    nextAttemptAt = 0;
    processPending();
}

void UpdateClient::queueLogs(const String& logsJson) {
    pendingLogPayload = logsJson;
    nextAttemptAt = 0;
    processPending();
}

bool UpdateClient::hasPending() const {
    return !pendingStatusPayload.isEmpty() || !pendingLogPayload.isEmpty() || !alertQueue.empty();
}

void UpdateClient::loop() {
    processPending();
}

bool UpdateClient::isReady() const {
    return !baseUrl.isEmpty();
}

void UpdateClient::processPending() {
    if (!isReady()) {
        return;
    }

    unsigned long now = millis();
    if (now < nextAttemptAt) {
        return;
    }

    if (!alertQueue.empty()) {
        String payload = alertQueue.front();
        if (postJson("/alerts", payload)) {
            alertQueue.erase(alertQueue.begin());
            scheduleNextAttempt(true);
        } else {
            scheduleNextAttempt(false);
        }
        return;
    }

    if (!pendingLogPayload.isEmpty()) {
        if (postJson("/logs", pendingLogPayload)) {
            pendingLogPayload = "";
            scheduleNextAttempt(true);
        } else {
            scheduleNextAttempt(false);
        }
        return;
    }

    if (!pendingStatusPayload.isEmpty()) {
        if (postJson("/updates", pendingStatusPayload)) {
            pendingStatusPayload = "";
            scheduleNextAttempt(true);
        } else {
            scheduleNextAttempt(false);
        }
        return;
    }

    nextAttemptAt = now + 250;
}

bool UpdateClient::postJson(const String& path, const String& json) {
    if (baseUrl.isEmpty()) {
        return false;
    }

    HTTPClient http;
    String url = baseUrl;
    if (!url.endsWith("/")) {
        url += path;
    } else {
        url += path.substring(1);
    }

    if (!http.begin(url)) {
        LOG_W("Update", "Failed to initialize HTTP client for " + url);
        return false;
    }

    http.addHeader("Content-Type", "application/json");
    if (!authToken.isEmpty()) {
        const String credentials = authToken;
        const auto* input = reinterpret_cast<const unsigned char*>(credentials.c_str());
        const size_t inputLen = credentials.length();
        const size_t bufferLen = ((inputLen + 2) / 3) * 4 + 1; // Base64 output size (+1 for null)
        std::vector<unsigned char> buffer(bufferLen, 0);
        size_t encodedLen = 0;
        int result = mbedtls_base64_encode(buffer.data(), bufferLen, &encodedLen, input, inputLen);
        if (result == 0 && encodedLen > 0 && encodedLen < bufferLen) {
            buffer[encodedLen] = '\0';
            http.addHeader("Authorization", "Basic " + String(reinterpret_cast<const char*>(buffer.data())));
        } else {
            LOG_W("Update", "Failed to encode Basic auth credentials for update client");
        }
    }
    if (!deviceId.isEmpty()) {
        http.addHeader("X-Device-ID", deviceId);
    }
    if (!printerId.isEmpty()) {
        http.addHeader("X-Printer-ID", printerId);
    }
    if (!printerBrand.isEmpty()) {
        http.addHeader("X-Printer-Brand", printerBrand);
    }
    if (!printerModel.isEmpty()) {
        http.addHeader("X-Printer-Model", printerModel);
    }
    if (!printerName.isEmpty()) {
        http.addHeader("X-Printer-Name", printerName);
    }

    int code = http.POST(json);
    if (code <= 0) {
        LOG_W("Update", "POST " + path + " failed: " + String(http.errorToString(code)));
        http.end();
        return false;
    }

    LOG_D("Update", "POST " + path + " -> " + String(code));
    http.end();
    return code >= 200 && code < 300;
}

void UpdateClient::scheduleNextAttempt(bool success) {
    unsigned long now = millis();
    if (success) {
        lastSuccessAt = now;
        consecutiveFailures = 0;
        unsigned long delay = 200;
        nextAttemptAt = now + delay;
    } else {
        lastFailureAt = now;
        consecutiveFailures = std::min<uint8_t>(consecutiveFailures + 1, 10);
        unsigned long backoff = kMinBackoffMs << std::min<uint8_t>(consecutiveFailures, 6);
        if (backoff > kMaxBackoffMs) {
            backoff = kMaxBackoffMs;
        }
        nextAttemptAt = now + backoff;
    }
}
