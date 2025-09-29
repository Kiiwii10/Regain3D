#include "WiFiManager.h"
#include <Utils.h>
#include <ArduinoJson.h>
#include <ESP32Ping.h>
#include "esp_wifi.h"

// Log selected WiFi events that may correlate with MQTT drops
static void onWiFiEvent(WiFiEvent_t event, WiFiEventInfo_t info) {
    switch (event) {
        case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
            LOG_W("WiFi", "Link lost, reason=" + String(info.wifi_sta_disconnected.reason));
            break;
        case ARDUINO_EVENT_WIFI_STA_GOT_IP: {
            IPAddress ip(info.got_ip.ip_info.ip.addr);
            LOG_I("WiFi", "DHCP acquired IP: " + ip.toString());
            break;
        }
        case ARDUINO_EVENT_WIFI_STA_LOST_IP:
            LOG_W("WiFi", "Lost IP address");
            break;
        default:
            break;
    }
}

WiFiManager::WiFiManager() :
    currentStatus(WiFiStatus::DISCONNECTED),
    lastConnectionAttempt(0),
    lastStatusCheck(0),
    connectionAttempts(0),
    autoReconnect(true),
    hostname(""),
    lastKeepAlive(0) {
}

WiFiManager::~WiFiManager() {
    disconnect();
}

bool WiFiManager::init(const String& deviceHostname) {
    LOG_I("WiFi", "Initializing WiFi Manager");
    
    if (deviceHostname.isEmpty()) {
        hostname = Utils::generateDeviceId();
    } else {
        hostname = deviceHostname;
    }
    
    WiFi.mode(WIFI_STA);
    WiFi.setHostname(hostname.c_str());
    // Disable power-save to reduce latency and avoid sleep-related drops
    WiFi.setSleep(false);
    // Use the underlying ESP-IDF function for a more robust power-save disable
    esp_wifi_set_ps(WIFI_PS_NONE);
    // Register WiFi event handler for additional diagnostics
    WiFi.onEvent(onWiFiEvent);
    
    setStatus(WiFiStatus::DISCONNECTED);
    
    LOG_I("WiFi", "WiFi Manager initialized with hostname: " + hostname);
    return true;
}

void WiFiManager::loop() {
    unsigned long currentTime = millis();
    
    // Check status roughly every second
    if (currentTime - lastStatusCheck > 1000) {
        updateStatus();
        lastStatusCheck = currentTime;
    }

    if (autoReconnect && (currentStatus == WiFiStatus::FAILED || currentStatus == WiFiStatus::RECONNECTING)) {
        handleReconnection();
    }

    // Send a keep-alive ping every 60 seconds to prevent inactivity disconnects
    if (isConnected() && (currentTime - lastKeepAlive > 30000)) {
        if (!pingGateway()) {
            LOG_W("WiFi", "Keep-alive ping failed. Link might be unstable.");
        }
        lastKeepAlive = currentTime;
    }
}

bool WiFiManager::connect(const WiFiCredentials& creds) {
    return connect(creds.ssid, creds.password);
}

bool WiFiManager::connect(const String& ssid, const String& password) {
    if (!Utils::isValidWiFiCredentials(ssid, password)) {
        LOG_E("WiFi", "Invalid WiFi credentials provided");
        return false;
    }
    
    LOG_I("WiFi", "Connecting to WiFi: " + ssid);
    
    credentials.ssid = ssid;
    credentials.password = password;
    credentials.valid = true;
    
    setStatus(WiFiStatus::CONNECTING);
    connectionAttempts = 0;
    lastConnectionAttempt = millis();
    
    WiFi.begin(ssid.c_str(), password.c_str());
    
    // Wait for connection with timeout
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < MAX_WIFI_ATTEMPTS) {
        delay(1000);
        attempts++;
        connectionAttempts++;
        LOG_D("WiFi", "Connection attempt " + String(attempts) + "/" + String(MAX_WIFI_ATTEMPTS));
        
        if (WiFi.status() == WL_CONNECT_FAILED) {
            LOG_E("WiFi", "WiFi connection failed");
            setStatus(WiFiStatus::FAILED);
            return false;
        }
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        setStatus(WiFiStatus::CONNECTED);
        printNetworkInfo();
        return true;
    } else {
        LOG_E("WiFi", "WiFi connection timed out after " + String(MAX_WIFI_ATTEMPTS) + " attempts");
        setStatus(WiFiStatus::FAILED);
        return false;
    }
}

void WiFiManager::disconnect() {
    if (currentStatus != WiFiStatus::DISCONNECTED) {
        LOG_I("WiFi", "Disconnecting from WiFi");
        WiFi.disconnect();
        setStatus(WiFiStatus::DISCONNECTED);
    }
}

bool WiFiManager::isConnected() const {
    return currentStatus == WiFiStatus::CONNECTED && WiFi.status() == WL_CONNECTED;
}

String WiFiManager::getStatusString() const {
    return wifiStatusToString(currentStatus);
}

String WiFiManager::getSSID() const {
    if (isConnected()) {
        return WiFi.SSID();
    }
    return credentials.ssid;
}

String WiFiManager::getIPAddress() const {
    if (isConnected()) {
        return WiFi.localIP().toString();
    }
    return "0.0.0.0";
}

String WiFiManager::getGatewayIP() const {
    if (isConnected()) {
        return WiFi.gatewayIP().toString();
    }
    return "0.0.0.0";
}

String WiFiManager::getMacAddress() const {
    return WiFi.macAddress();
}

int WiFiManager::getRSSI() const {
    if (isConnected()) {
        return WiFi.RSSI();
    }
    return 0;
}

void WiFiManager::setHostname(const String& name) {
    hostname = name;
    WiFi.setHostname(hostname.c_str());
    LOG_I("WiFi", "Hostname set to: " + hostname);
}

String WiFiManager::getNetworkInfoJson() const {
    JsonDocument doc; // ArduinoJson v7
    
    doc["status"] = getStatusString();
    doc["connected"] = isConnected();
    doc["hostname"] = hostname;
    doc["mac_address"] = getMacAddress();
    
    if (isConnected()) {
        doc["ssid"] = getSSID();
        doc["ip_address"] = getIPAddress();
        doc["gateway"] = getGatewayIP();
        doc["dns"] = WiFi.dnsIP().toString();
        doc["rssi"] = getRSSI();
        doc["connection_attempts"] = connectionAttempts;
    }
    
    String result;
    serializeJson(doc, result);
    return result;
}

void WiFiManager::printNetworkInfo() const {
    LOG_I("WiFi", "=== Network Information ===");
    LOG_I("WiFi", "Status: " + getStatusString());
    LOG_I("WiFi", "SSID: " + getSSID());
    LOG_I("WiFi", "IP Address: " + getIPAddress());
    LOG_I("WiFi", "Gateway: " + getGatewayIP());
    LOG_I("WiFi", "DNS: " + WiFi.dnsIP().toString());
    LOG_I("WiFi", "MAC Address: " + getMacAddress());
    LOG_I("WiFi", "RSSI: " + String(getRSSI()) + " dBm");
    LOG_I("WiFi", "Hostname: " + hostname);
    LOG_I("WiFi", "==========================");
}

void WiFiManager::updateStatus() {
    wl_status_t wifiStatus = WiFi.status();
    
    switch (wifiStatus) {
        case WL_CONNECTED:
            if (currentStatus != WiFiStatus::CONNECTED) {
                setStatus(WiFiStatus::CONNECTED);
            }
            break;
            
        case WL_DISCONNECTED:
            if (currentStatus == WiFiStatus::CONNECTED) {
                LOG_W("WiFi", "WiFi connection lost");
                if (autoReconnect) {
                    setStatus(WiFiStatus::RECONNECTING);
                } else {
                    setStatus(WiFiStatus::DISCONNECTED);
                }
            }
            break;
            
        case WL_CONNECT_FAILED:
            if (currentStatus != WiFiStatus::FAILED) {
                setStatus(WiFiStatus::FAILED);
            }
            break;
            
        default:
            // Other statuses like WL_IDLE_STATUS, WL_NO_SSID_AVAIL, etc.
            break;
    }
}

void WiFiManager::handleReconnection() {
    unsigned long currentTime = millis();
    
    if (currentTime - lastConnectionAttempt > 10000) { // Try reconnecting every 10 seconds
        LOG_I("WiFi", "Attempting to reconnect to WiFi");
        lastConnectionAttempt = currentTime;
        
        if (credentials.valid) {
            WiFi.begin(credentials.ssid.c_str(), credentials.password.c_str());
            setStatus(WiFiStatus::CONNECTING);
        }
    }
}

void WiFiManager::setStatus(WiFiStatus newStatus) {
    if (currentStatus != newStatus) {
        LOG_D("WiFi", "Status changed: " + wifiStatusToString(currentStatus) + " -> " + wifiStatusToString(newStatus));
        currentStatus = newStatus;
        lastStatusCheck = millis();
    }
}

String WiFiManager::wifiStatusToString(WiFiStatus status) const {
    switch (status) {
        case WiFiStatus::DISCONNECTED: return "DISCONNECTED";
        case WiFiStatus::CONNECTING: return "CONNECTING";
        case WiFiStatus::CONNECTED: return "CONNECTED";
        case WiFiStatus::FAILED: return "FAILED";
        case WiFiStatus::RECONNECTING: return "RECONNECTING";
        default: return "UNKNOWN";
    }
}

bool WiFiManager::pingGateway() {
    if (!isConnected()) {
        return false;
    }
    IPAddress gw = WiFi.gatewayIP();
    LOG_D("WiFi", "Pinging gateway " + gw.toString() + " to keep connection alive");
    return Ping.ping(gw, 1);
}
