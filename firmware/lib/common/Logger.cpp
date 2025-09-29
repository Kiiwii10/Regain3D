#include "Logger.h"
#include "Config.h"
#include <ArduinoJson.h>
#include <algorithm>
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"

std::vector<LogEntry> Logger::logBuffer;
size_t Logger::maxLogSize = 100;
size_t Logger::startIndex = 0;
size_t Logger::logCount = 0;
std::function<void(const String&)> Logger::transmitCallback = nullptr;
LogLevel Logger::currentLogLevel = LOG_INFO;
bool Logger::inTransmit = false;
static portMUX_TYPE logMutex = portMUX_INITIALIZER_UNLOCKED;

void Logger::init(size_t maxSize, LogLevel level) {
    maxLogSize = maxSize;
    currentLogLevel = level;
    // Initialize fixed-size ring buffer
    logBuffer.clear();
    logBuffer.resize(maxLogSize);
    startIndex = 0;
    logCount = 0;
    Serial.begin(115200);
    LOG_I("Logger", "Logger initialized with max size: " + String(maxSize));
}

void Logger::setTransmitCallback(std::function<void(const String&)> callback) {
    transmitCallback = callback;
}

void Logger::log(LogLevel level, const String& component, const String& message) {
    if (level > currentLogLevel) return;

    // Always print to serial for real-time insight
    Serial.println("[" + logLevelToString(level) + "] " + component + ": " + message);

    // Avoid re-entrant logging during transmit/clear to prevent recursion and stack overflow
    if (inTransmit) return;

    addLogEntry(level, component, message);
    if (isLogBufferFull()) {
        transmitLogs();
    }
}

void Logger::error(const String& component, const String& message) {
    log(LOG_ERROR, component, message);
}

void Logger::warn(const String& component, const String& message) {
    log(LOG_WARN, component, message);
}

void Logger::info(const String& component, const String& message) {
    log(LOG_INFO, component, message);
}

void Logger::debug(const String& component, const String& message) {
    log(LOG_DEBUG, component, message);
}

void Logger::addLogEntry(LogLevel level, const String& component, const String& message) {
    LogEntry entry;
    entry.timestamp = millis();
    entry.level = level;
    entry.component = component;
    entry.message = message;

    if (logCount < maxLogSize) {
        size_t idx = (startIndex + logCount) % maxLogSize;
        logBuffer[idx] = entry;
        logCount++;
    } else {
        // Overwrite oldest and advance startIndex
        logBuffer[startIndex] = entry;
        startIndex = (startIndex + 1) % maxLogSize;
    }
}

String Logger::getLogsAsJson() {
    JsonDocument doc; // ArduinoJson v7
    JsonArray logs = doc["logs"].to<JsonArray>();

    for (size_t i = 0; i < logCount; ++i) {
        size_t idx = (startIndex + i) % maxLogSize;
        const auto& entry = logBuffer[idx];
        JsonObject logObj = logs.add<JsonObject>();
        logObj["timestamp"] = entry.timestamp;
        logObj["level"] = logLevelToString(entry.level);
        logObj["component"] = entry.component;
        logObj["message"] = entry.message;
    }

    doc["device"] = DEVICE_NAME;
    doc["firmware_version"] = FIRMWARE_VERSION;
    doc["log_count"] = logCount;
    doc["generated_at"] = millis();

    String result;
    serializeJson(doc, result);
    return result;
}

void Logger::clearLogs() {
    portENTER_CRITICAL(&logMutex);
    std::fill(logBuffer.begin(), logBuffer.end(), LogEntry());
    startIndex = 0;
    logCount = 0;
    portEXIT_CRITICAL(&logMutex);
    // Do not log from here to avoid re-entrancy
}

size_t Logger::getLogCount() {
    return logCount;
}

bool Logger::isLogBufferFull() {
    return logCount >= maxLogSize;
}

void Logger::transmitLogs() {
    if (!transmitCallback) return;
    if (logCount == 0) return;

    inTransmit = true;
    String logsJson = getLogsAsJson();
    // Call user callback outside of logger's logging to avoid recursion
    transmitCallback(logsJson);
    clearLogs();
    inTransmit = false;
}

String Logger::logLevelToString(LogLevel level) {
    switch (level) {
        case LOG_ERROR: return "ERROR";
        case LOG_WARN: return "WARN";
        case LOG_INFO: return "INFO";
        case LOG_DEBUG: return "DEBUG";
        default: return "UNKNOWN";
    }
}
