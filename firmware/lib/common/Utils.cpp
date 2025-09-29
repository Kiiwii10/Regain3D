#include "Utils.h"
#include "Logger.h"
#include <Preferences.h>
#include <ArduinoJson.h>
#include <mbedtls/md.h>
#include <esp_ota_ops.h>
#include <esp_image_format.h>
#include <esp_partition.h>

String Utils::generateDeviceId() {
    uint64_t chipid = ESP.getEfuseMac();
    return "ESP32_" + String((uint16_t)(chipid >> 32), HEX) + String((uint32_t)chipid, HEX);
}

String Utils::formatUptime(unsigned long milliseconds) {
    unsigned long seconds = milliseconds / 1000;
    unsigned long minutes = seconds / 60;
    unsigned long hours = minutes / 60;
    unsigned long days = hours / 24;
    
    if (days > 0) {
        return String(days) + "d " + String(hours % 24) + "h " + String(minutes % 60) + "m";
    } else if (hours > 0) {
        return String(hours) + "h " + String(minutes % 60) + "m " + String(seconds % 60) + "s";
    } else if (minutes > 0) {
        return String(minutes) + "m " + String(seconds % 60) + "s";
    } else {
        return String(seconds) + "s";
    }
}

float Utils::getFreeHeapPercentage() {
    return ((float)ESP.getFreeHeap() / (float)ESP.getHeapSize()) * 100.0f;
}

bool Utils::isValidWiFiCredentials(const String& ssid, const String& password) {
    return !ssid.isEmpty() && ssid.length() <= 32 && password.length() <= 63;
}

String Utils::getMacAddress() {
    return WiFi.macAddress();
}

SystemStatus Utils::getSystemStatus() {
    SystemStatus status;
    status.connected = WiFi.status() == WL_CONNECTED;
    status.printer_connected = false; // Will be updated by PrinterManager
    status.printer_status = "Unknown";
    status.active_motor = -1; // Will be updated by MotorController
    status.uptime = millis();
    status.firmware_version = FIRMWARE_VERSION;
    status.free_heap = getFreeHeapPercentage();
    
    return status;
}

bool Utils::validateMD5(const String& data, const String& expectedMD5) {
    mbedtls_md_context_t ctx;
    mbedtls_md_type_t md_type = MBEDTLS_MD_MD5;
    const size_t payloadLength = data.length();
    
    mbedtls_md_init(&ctx);
    mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(md_type), 0);
    mbedtls_md_starts(&ctx);
    mbedtls_md_update(&ctx, (const unsigned char*)data.c_str(), payloadLength);
    
    unsigned char digest[16];
    mbedtls_md_finish(&ctx, digest);
    mbedtls_md_free(&ctx);
    
    String calculatedMD5 = bytesToHex(digest, 16);
    return calculatedMD5.equalsIgnoreCase(expectedMD5);
}

String Utils::bytesToHex(const uint8_t* data, size_t length) {
    String hex = "";
    for (size_t i = 0; i < length; i++) {
        if (data[i] < 16) hex += "0";
        hex += String(data[i], HEX);
    }
    return hex;
}

void Utils::printSystemInfo() {
    LOG_I("System", "Device ID: " + generateDeviceId());
    LOG_I("System", "MAC Address: " + getMacAddress());
    LOG_I("System", "Firmware Version: " + String(FIRMWARE_VERSION));
    LOG_I("System", "Free Heap: " + String(ESP.getFreeHeap()) + " bytes (" + String(getFreeHeapPercentage(), 1) + "%)");
    LOG_I("System", "Flash Size: " + String(ESP.getFlashChipSize()) + " bytes");
    LOG_I("System", "CPU Frequency: " + String(ESP.getCpuFreqMHz()) + " MHz");
}

void Utils::rebootDevice(unsigned long delayMs) {
    LOG_W("System", "Rebooting device in " + String(delayMs) + "ms");
    delay(delayMs);
    ESP.restart();
}

String Utils::escapeJsonString(const String& input) {
    String output;
    output.reserve(input.length() + 10);
    
    for (char c : input) {
        switch (c) {
            case '"': output += "\\\""; break;
            case '\\': output += "\\\\"; break;
            case '\b': output += "\\b"; break;
            case '\f': output += "\\f"; break;
            case '\n': output += "\\n"; break;
            case '\r': output += "\\r"; break;
            case '\t': output += "\\t"; break;
            default:
                if (c < 0x20) {
                    output += "\\u00";
                    if (c < 0x10) output += "0";
                    output += String(c, HEX);
                } else {
                    output += c;
                }
        }
    }
    return output;
}

bool Utils::isJsonValid(const String& json) {
    JsonDocument doc; // ArduinoJson v7
    return deserializeJson(doc, json) == DeserializationError::Ok;
}

namespace StorageUtils {
    static Preferences prefs;
    
    bool saveWiFiCredentials(const WiFiCredentials& credentials) {
        prefs.begin(NVS_WIFI_NAMESPACE, false);
        bool success = prefs.putString(NVS_WIFI_SSID, credentials.ssid) &&
                      prefs.putString(NVS_WIFI_PASSWORD, credentials.password);
        prefs.end();
        return success;
    }
    
    WiFiCredentials loadWiFiCredentials() {
        WiFiCredentials credentials;
        prefs.begin(NVS_WIFI_NAMESPACE, true);
        credentials.ssid = prefs.getString(NVS_WIFI_SSID, "");
        credentials.password = prefs.getString(NVS_WIFI_PASSWORD, "");
        credentials.valid = !credentials.ssid.isEmpty();
        prefs.end();
        return credentials;
    }
    
    bool saveString(const String& key, const String& value) {
        prefs.begin(NVS_WIFI_NAMESPACE, false);
        bool success = prefs.putString(key.c_str(), value);
        prefs.end();
        return success;
    }
    
    String loadString(const String& key, const String& defaultValue) {
        prefs.begin(NVS_WIFI_NAMESPACE, true);
        String value = prefs.getString(key.c_str(), defaultValue);
        prefs.end();
        return value;
    }
    
    bool saveInt(const String& key, int value) {
        prefs.begin(NVS_WIFI_NAMESPACE, false);
        bool success = prefs.putInt(key.c_str(), value);
        prefs.end();
        return success;
    }
    
    int loadInt(const String& key, int defaultValue) {
        prefs.begin(NVS_WIFI_NAMESPACE, true);
        int value = prefs.getInt(key.c_str(), defaultValue);
        prefs.end();
        return value;
    }
    
    void clearAll() {
        prefs.begin(NVS_WIFI_NAMESPACE, false);
        prefs.clear();
        prefs.end();
        LOG_I("Storage", "All stored preferences cleared");
    }
    
    void clearWiFiCredentials() {
        prefs.begin(NVS_WIFI_NAMESPACE, false);
        prefs.remove(NVS_WIFI_SSID);
        prefs.remove(NVS_WIFI_PASSWORD);
        prefs.end();
        LOG_I("Storage", "WiFi credentials cleared");
    }
}

// OTA and Boot Management Functions
bool Utils::isApplicationFirmwareValid() {
    const esp_partition_t* app1_partition = esp_partition_find_first(
        ESP_PARTITION_TYPE_APP, 
        ESP_PARTITION_SUBTYPE_APP_OTA_1, 
        NULL
    );
    
    if (!app1_partition) {
        LOG_E("Utils", "App1 partition not found");
        return false;
    }
    
    // Check if partition has valid ESP32 image header
    uint32_t magic;
    esp_err_t err = esp_partition_read(app1_partition, 0, &magic, sizeof(magic));
    
    if (err != ESP_OK) {
        LOG_W("Utils", "Failed to read app1 partition: " + String(esp_err_to_name(err)));
        return false;
    }
    
    // ESP32 image magic number
    if (magic == 0xE9) {
        LOG_I("Utils", "Application firmware appears valid (has ESP32 image magic)");
        return true;
    } else {
        LOG_W("Utils", "Application firmware invalid (no ESP32 image magic)");
        return false;
    }
}

bool Utils::switchToApplicationPartition() {
    const esp_partition_t* app1_partition = esp_partition_find_first(
        ESP_PARTITION_TYPE_APP, 
        ESP_PARTITION_SUBTYPE_APP_OTA_1, 
        NULL
    );
    
    if (!app1_partition) {
        LOG_E("Utils", "App1 partition not found");
        return false;
    }
    
    esp_err_t err = esp_ota_set_boot_partition(app1_partition);
    if (err == ESP_OK) {
        LOG_I("Utils", "Set boot partition to app1 (application)");
        return true;
    } else {
        LOG_E("Utils", "Failed to set boot partition: " + String(esp_err_to_name(err)));
        return false;
    }
}

bool Utils::switchToProvisionerPartition() {
    const esp_partition_t* app0_partition = esp_partition_find_first(
        ESP_PARTITION_TYPE_APP, 
        ESP_PARTITION_SUBTYPE_APP_OTA_0, 
        NULL
    );
    
    if (!app0_partition) {
        LOG_E("Utils", "App0 partition not found");
        return false;
    }
    
    esp_err_t err = esp_ota_set_boot_partition(app0_partition);
    if (err == ESP_OK) {
        LOG_I("Utils", "Set boot partition to app0 (provisioner)");
        return true;
    } else {
        LOG_E("Utils", "Failed to set boot partition: " + String(esp_err_to_name(err)));
        return false;
    }
}

void Utils::eraseApplicationPartition() {
    const esp_partition_t* app1_partition = esp_partition_find_first(
        ESP_PARTITION_TYPE_APP, 
        ESP_PARTITION_SUBTYPE_APP_OTA_1, 
        NULL
    );
    
    if (app1_partition) {
        LOG_W("Utils", "Erasing application partition...");
        esp_err_t err = esp_partition_erase_range(app1_partition, 0, app1_partition->size);
        if (err == ESP_OK) {
            LOG_I("Utils", "Application partition erased successfully");
        } else {
            LOG_E("Utils", "Failed to erase application partition: " + String(esp_err_to_name(err)));
        }
    }
}

String Utils::getRunningPartition() {
    const esp_partition_t* running = esp_ota_get_running_partition();
    if (!running) return "Unknown";
    
    if (running->subtype == ESP_PARTITION_SUBTYPE_APP_OTA_0) {
        return "app0 (provisioner)";
    } else if (running->subtype == ESP_PARTITION_SUBTYPE_APP_OTA_1) {
        return "app1 (application)";
    } else {
        return "factory";
    }
}

bool Utils::checkFactoryResetButton(int buttonPin, unsigned long holdTimeMs) {
    pinMode(buttonPin, INPUT_PULLUP);
    
    LOG_I("Utils", "Checking factory reset button (hold for " + String(holdTimeMs/1000) + "s)...");
    
    // Check if button is pressed initially
    if (digitalRead(buttonPin) == HIGH) {
        LOG_D("Utils", "Factory reset button not pressed");
        return false;
    }
    
    // Button is pressed, start timing
    unsigned long startTime = millis();
    unsigned long lastBlink = 0;
    bool ledState = false;
    
    // Set up LED for feedback
    pinMode(2, OUTPUT); // GPIO 2 is built-in LED
    
    while (digitalRead(buttonPin) == LOW) {
        unsigned long elapsed = millis() - startTime;
        
        // Fast blink LED to indicate button is held
        if (millis() - lastBlink > 200) {
            ledState = !ledState;
            digitalWrite(2, ledState ? HIGH : LOW);
            lastBlink = millis();
        }
        
        if (elapsed >= holdTimeMs) {
            // Button held long enough - solid LED and return true
            digitalWrite(2, HIGH);
            LOG_W("Utils", "Factory reset button held for " + String(holdTimeMs/1000) + " seconds");
            delay(500); // Brief delay to let user see solid LED
            return true;
        }
        
        delay(50);
    }
    
    // Button released before timeout
    digitalWrite(2, LOW);
    LOG_I("Utils", "Factory reset button released early");
    return false;
}

void Utils::performFactoryReset() {
    LOG_W("Utils", "=== PERFORMING FACTORY RESET ===");
    
    // Clear all NVS data
    StorageUtils::clearAll();
    
    // Erase application partition
    eraseApplicationPartition();
    
    // Switch boot to provisioner
    switchToProvisionerPartition();
    
    LOG_W("Utils", "Factory reset complete - rebooting to provisioner");
    rebootDevice(2000);
}

bool Utils::shouldBootIntoApplication() {
    LOG_I("Utils", "=== BOOT DECISION LOGIC ===");
    LOG_I("Utils", "Current partition: " + getRunningPartition());
    
    // Check factory reset button first
    if (checkFactoryResetButton(0, 5000)) {
        LOG_W("Utils", "Factory reset requested - staying in provisioner");
        performFactoryReset();
        return false; // Will reboot, but just in case
    }
    
    // Check if application firmware is valid
    if (!isApplicationFirmwareValid()) {
        LOG_I("Utils", "No valid application firmware - staying in provisioner");
        return false;
    }
    
    LOG_I("Utils", "Valid application found. BOOTING into application.");
    return true;
}
