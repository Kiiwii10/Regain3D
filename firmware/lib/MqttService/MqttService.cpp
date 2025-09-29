#include "MqttService.h"
#include <WiFi.h>
#include <Logger.h>
#include <mbedtls/error.h>
#include <errno.h>

MqttService* MqttService::instance = nullptr;

MqttService::MqttService() :
    tls(false),
    port(0),
    lastReconnectAttempt(0),
    reconnectAttempts(0),
    reconnectInterval(5000),
    lastWiFiStatus(WL_DISCONNECTED),
    wifiConnectedAt(0),
    _bufferSize(2048),
    _keepAlive(15)
{
    instance = this;
}

MqttService::~MqttService() {
    cleanup();
}

void MqttService::cleanup() {
    if (client) {
        if (client->connected()) {
            client->disconnect();
        }
        delete client;
        client = nullptr;
    }
    if (wifiClientSecure) {
        wifiClientSecure->stop();
        delete wifiClientSecure;
        wifiClientSecure = nullptr;
    }
    if (wifiClient) {
        wifiClient->stop();
        delete wifiClient;
        wifiClient = nullptr;
    }
}

void MqttService::setCallback(MessageCallback cb) {
    callback = cb;
    if (client) {
        client->setCallback([](char* topic, uint8_t* payload, unsigned int length) {
            if (instance && instance->callback) {
                instance->callback(topic, payload, length);
            }
        });
    }
}

void MqttService::setBufferSize(uint16_t size) {
    _bufferSize = size;
    if (client) {
        client->setBufferSize(size);
    }
}

void MqttService::setKeepAlive(uint16_t keepAlive) {
    _keepAlive = keepAlive;
    if (client) {
        client->setKeepAlive(keepAlive);
    }
}

bool MqttService::connect(const String& h, uint16_t p,
                          const String& cid,
                          const String& user,
                          const String& pass,
                          bool useTLS) {
    host = h;
    port = p;
    clientId = cid;
    username = user;
    password = pass;
    tls = useTLS;
    return connectInternal();
}

bool MqttService::connectInternal() {
    if (host.isEmpty()) {
        LOG_E("MQTT", "No broker configured");
        return false;
    }
    if (WiFi.status() != WL_CONNECTED) {
        LOG_W("MQTT", "WiFi not connected; delaying MQTT connect");
        return false;
    }

    LOG_I("MQTT", "Connecting to MQTT broker at " + host + ":" + String(port));

    // Clean up previous client instances before creating new ones
    cleanup();

    if (tls) {
        wifiClientSecure = new WiFiClientSecure();
        if (!wifiClientSecure) {
            LOG_E("MQTT", "Failed to allocate WiFiClientSecure");
            return false;
        }
        // Use handshake timeout instead of global socket timeout
        wifiClientSecure->setSSLHostname(username.c_str());
        wifiClientSecure->setHandshakeTimeout(20); // seconds
        wifiClientSecure->setInsecure();
        client = new PubSubClient(*wifiClientSecure);
    } else {
        wifiClient = new WiFiClient();
        if (!wifiClient) {
            LOG_E("MQTT", "Failed to allocate WiFiClient");
            return false;
        }
        client = new PubSubClient(*wifiClient);
    }

    if (!client) {
        LOG_E("MQTT", "Failed to allocate PubSubClient");
        cleanup();
        return false;
    }

    client->setServer(host.c_str(), port);
    client->setBufferSize(_bufferSize);
    client->setKeepAlive(_keepAlive);
    client->setCallback([](char* topic, uint8_t* payload, unsigned int length) {
        if (instance && instance->callback) {
            instance->callback(topic, payload, length);
        }
    });

    if (WiFi.status() != WL_CONNECTED) {
        LOG_W("MQTT", "WiFi dropped before MQTT connect; aborting");
        cleanup();
        return false;
    }

    if (client->connect(clientId.c_str(), username.c_str(), password.c_str())) {
        LOG_I("MQTT", "MQTT connected successfully");
        reconnectAttempts = 0;
        reconnectInterval = 5000;
        for (const auto& topic : subscriptions) {
            client->subscribe(topic.c_str());
        }
        return true;
    } else {
        LOG_E("MQTT", "MQTT connection failed, rc=" + String(client->state()) +
                         ", WiFi status=" + String(WiFi.status()));
        if (tls && wifiClientSecure) {
            char errBuf[128];
            int err = wifiClientSecure->lastError(errBuf, sizeof(errBuf));
            if (err != 0) {
                LOG_E("MQTT", String("TLS lastError (") + err + ", errno=" + String(errno) + "): " + errBuf);
            }
        }
        cleanup();
        return false;
    }
}

void MqttService::disconnect() {
    cleanup();
}

bool MqttService::publish(const String& topic, const String& payload) {
    if (!client || !client->connected()) {
        return false;
    }
    return client->publish(topic.c_str(), payload.c_str());
}

bool MqttService::subscribe(const String& topic) {
    bool exists = false;
    for (const auto& t : subscriptions) {
        if (t == topic) {
            exists = true;
            break;
        }
    }
    if (!exists) {
        subscriptions.push_back(topic);
    }
    return (client && client->connected()) ? client->subscribe(topic.c_str()) : true;
}

bool MqttService::isConnected() const {
    return client && client->connected();
}

void MqttService::loop() {
    unsigned long now = millis();
    wl_status_t cur = WiFi.status();
    if (lastWiFiStatus != WL_CONNECTED && cur == WL_CONNECTED) {
        // Gate initial reconnect attempts briefly after WiFi comes back
        wifiConnectedAt = now;
    }
    lastWiFiStatus = cur;

    if (!isConnected()) {
        bool wifiReady = (cur == WL_CONNECTED) && (wifiConnectedAt == 0 || (now - wifiConnectedAt) > 2000);
        if (wifiReady && (now - lastReconnectAttempt > reconnectInterval)) {
            attemptReconnect();
            lastReconnectAttempt = now;
        }
    } else {
        if (client) {
            client->loop();
        }
    }
}

void MqttService::attemptReconnect() {
    if (connectInternal()) {
        LOG_I("MQTT", "MQTT reconnected successfully");
    } else {
        reconnectAttempts++;
        if (reconnectInterval < 60000UL) {
            reconnectInterval = reconnectInterval < 30000UL ? reconnectInterval * 2 : 60000UL;
        }
        LOG_W("MQTT", "Reconnect failed; next attempt in " + String(reconnectInterval / 1000) + "s");
    }
}
