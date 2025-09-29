#pragma once
#include <Arduino.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <functional>
#include <vector>

class MqttService {
public:
    using MessageCallback = std::function<void(char*, uint8_t*, unsigned int)>;

    MqttService();
    ~MqttService();

    void setCallback(MessageCallback cb);
    void setBufferSize(uint16_t size);
    void setKeepAlive(uint16_t keepAlive);

    bool connect(const String& host, uint16_t port,
                 const String& clientId,
                 const String& username,
                 const String& password,
                 bool useTLS = false);
    void disconnect();
    bool publish(const String& topic, const String& payload);
    bool subscribe(const String& topic);
    bool isConnected() const;
    void loop();

private:
    void cleanup();
    WiFiClient* wifiClient = nullptr;
    WiFiClientSecure* wifiClientSecure = nullptr;
    PubSubClient* client = nullptr;

    bool tls;
    String host;
    uint16_t port;
    String clientId;
    String username;
    String password;

    unsigned long lastReconnectAttempt;
    int reconnectAttempts;
    unsigned long reconnectInterval;
    wl_status_t lastWiFiStatus;
    unsigned long wifiConnectedAt;
    uint16_t _bufferSize;
    uint16_t _keepAlive;
    std::vector<String> subscriptions;

    MessageCallback callback;
    static MqttService* instance;

    bool connectInternal();
    void attemptReconnect();
};
