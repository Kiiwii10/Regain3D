#pragma once
#include <Arduino.h>
#include <WiFi.h>
#include <Config.h>
#include <Logger.h>

enum class WiFiStatus {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    FAILED,
    RECONNECTING
};

class WiFiManager {
private:
    WiFiStatus currentStatus;
    WiFiCredentials credentials;
    unsigned long lastConnectionAttempt;
    unsigned long lastStatusCheck;
    int connectionAttempts;
    bool autoReconnect;
    String hostname;
    unsigned long lastKeepAlive;
    
public:
    WiFiManager();
    ~WiFiManager();
    
    bool init(const String& deviceHostname = "");
    void loop();
    
    bool connect(const WiFiCredentials& creds);
    bool connect(const String& ssid, const String& password);
    void disconnect();
    
    WiFiStatus getStatus() const { return currentStatus; }
    bool isConnected() const;
    String getStatusString() const;
    
    String getSSID() const;
    String getIPAddress() const;
    String getGatewayIP() const;
    String getMacAddress() const;
    int getRSSI() const;
    
    void enableAutoReconnect(bool enable) { autoReconnect = enable; }
    bool isAutoReconnectEnabled() const { return autoReconnect; }
    
    void setHostname(const String& name);
    String getHostname() const { return hostname; }
    
    String getNetworkInfoJson() const;
    void printNetworkInfo() const;
    
private:
    void updateStatus();
    void handleReconnection();
    void setStatus(WiFiStatus newStatus);
    String wifiStatusToString(WiFiStatus status) const;
    bool pingGateway();
};
