#pragma once
#include <Arduino.h>
#include <WiFi.h>
#include "Config.h"

class Utils {
public:
    static String generateDeviceId();
    static String formatUptime(unsigned long milliseconds);
    static float getFreeHeapPercentage();
    static bool isValidWiFiCredentials(const String& ssid, const String& password);
    static String getMacAddress();
    static SystemStatus getSystemStatus();
    static bool validateMD5(const String& data, const String& expectedMD5);
    static String bytesToHex(const uint8_t* data, size_t length);
    static void printSystemInfo();
    static void rebootDevice(unsigned long delayMs = 1000);
    static String escapeJsonString(const String& input);
    static bool isJsonValid(const String& json);
    
    // OTA and Boot Management
    static bool isApplicationFirmwareValid();
    static bool switchToApplicationPartition();
    static bool switchToProvisionerPartition();
    static void eraseApplicationPartition();
    static String getRunningPartition();
    
    // Factory Reset and Boot Button
    static bool checkFactoryResetButton(int buttonPin = 0, unsigned long holdTimeMs = 5000);
    static void performFactoryReset();
    static bool shouldBootIntoApplication();
};

namespace StorageUtils {
    bool saveWiFiCredentials(const WiFiCredentials& credentials);
    WiFiCredentials loadWiFiCredentials();
    void clearWiFiCredentials();
    bool saveString(const String& key, const String& value);
    String loadString(const String& key, const String& defaultValue = "");
    bool saveInt(const String& key, int value);
    int loadInt(const String& key, int defaultValue = 0);
    void clearAll();
}
