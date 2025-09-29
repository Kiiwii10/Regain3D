#pragma once
#include <Arduino.h>
#include <vector>
#include <functional>

enum LogLevel {
    LOG_ERROR = 0,
    LOG_WARN = 1,
    LOG_INFO = 2,
    LOG_DEBUG = 3
};

struct LogEntry {
    unsigned long timestamp;
    LogLevel level;
    String message;
    String component;
};

class Logger {
private:
    static std::vector<LogEntry> logBuffer;
    static size_t maxLogSize;
    // Ring buffer indices to avoid shifting and reallocation
    static size_t startIndex;   // index of oldest element
    static size_t logCount;     // number of valid elements
    static std::function<void(const String&)> transmitCallback;
    static LogLevel currentLogLevel;
    static bool inTransmit;     // guard to avoid re-entrant logging during transmit/clear
    
public:
    static void init(size_t maxSize = 100, LogLevel level = LOG_INFO);
    static void setTransmitCallback(std::function<void(const String&)> callback);
    static void log(LogLevel level, const String& component, const String& message);
    static void error(const String& component, const String& message);
    static void warn(const String& component, const String& message);
    static void info(const String& component, const String& message);
    static void debug(const String& component, const String& message);
    
    static String getLogsAsJson();
    static void clearLogs();
    static size_t getLogCount();
    static bool isLogBufferFull();
    static void transmitLogs();
    
private:
    static void addLogEntry(LogLevel level, const String& component, const String& message);
    static String logLevelToString(LogLevel level);
};

#define LOG_E(component, message) Logger::error(component, message)
#define LOG_W(component, message) Logger::warn(component, message)
#define LOG_I(component, message) Logger::info(component, message)
#define LOG_D(component, message) Logger::debug(component, message)
