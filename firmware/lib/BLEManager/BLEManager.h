#pragma once
#include <Arduino.h>
#include <WiFi.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <mbedtls/aes.h>
#include <mbedtls/md.h>
#include <Config.h>
#include <Logger.h>

enum class BLEProvisioningStatus {
    ADVERTISING,
    CLIENT_CONNECTED,
    HANDSHAKE_INITIATED,
    HANDSHAKE_COMPLETED,
    WIFI_CREDENTIALS_RECEIVED,
    CONNECTING_WIFI,
    WIFI_CONNECTED,
    WIFI_FAILED,
    PROVISIONING_COMPLETE,
    ERROR
};

enum class HandshakeState {
    WAITING_FOR_CHALLENGE,
    CHALLENGE_SENT,
    WAITING_FOR_RESPONSE,
    AUTHENTICATED,
    FAILED
};

struct BLEHandshakeData {
    uint8_t challenge[HANDSHAKE_CHALLENGE_SIZE];
    uint8_t sessionKey[AES_KEY_SIZE];
    uint8_t iv[AES_IV_SIZE];
    HandshakeState state;
    unsigned long challengeTime;
};

struct EncryptedWiFiCredentials {
    uint8_t encryptedData[256];
    size_t dataLength;
    uint8_t iv[AES_IV_SIZE];
};

class BLEManager : public BLEServerCallbacks, public BLECharacteristicCallbacks {
private:
    BLEServer* pServer;
    BLEService* pService;
    BLECharacteristic* pWifiConfigCharacteristic;
    BLECharacteristic* pStatusCharacteristic;
    
    BLEProvisioningStatus currentStatus;
    HandshakeState handshakeState;
    BLEHandshakeData handshakeData;
    WiFiCredentials receivedCredentials;
    
    bool deviceConnected;
    bool credentialsReceived;
    unsigned long statusChangeTime;
    unsigned long lastStatusUpdate;
    int wifiAttempts;
    unsigned long lastRetryAttempt;

    // Raw advertising packet buffer and index of the status byte. This allows
    // us to update the provisioning state in the manufacturer data so phones
    // can determine if a device is unprovisioned, busy or already provisioned
    // without establishing a connection.
    uint8_t advData[31];
    uint8_t advDataLen;
    int statusIndex;
    bool provisioningDone;
    
    static const unsigned long STATUS_UPDATE_INTERVAL = 1000; // 1 second
    static const unsigned long WIFI_RETRY_INTERVAL = 10000;   // 10 seconds
    
public:
    BLEManager();
    ~BLEManager();

    bool init();
    void loop();
    bool isProvisioningComplete() const;
    BLEProvisioningStatus getStatus() const { return currentStatus; }
    WiFiCredentials getCredentials() const { return receivedCredentials; }
    
    // BLE Server Callbacks
    void onConnect(BLEServer* pServer) override;
    void onDisconnect(BLEServer* pServer) override;
    
    // BLE Characteristic Callbacks
    void onWrite(BLECharacteristic* pCharacteristic) override;
    void onRead(BLECharacteristic* pCharacteristic) override;
    
private:
    bool startBLEService();
    void stopBLEService();
    void updateStatus(BLEProvisioningStatus newStatus);
    void broadcastStatus();
    void setAdvStatus(uint8_t status);
    
    // Handshake Protocol
    void initHandshake();
    void generateSessionKeyFromSecret();
    
    // Encryption/Decryption
    bool encryptData(const uint8_t* plaintext, size_t length, uint8_t* ciphertext, size_t* cipherLength);
    bool decryptData(const uint8_t* ciphertext, size_t length, uint8_t* plaintext, size_t* plainLength);
    
    // WiFi Provisioning
    bool processWiFiCredentials(const uint8_t* data, size_t length);
    bool connectToWiFi(const WiFiCredentials& credentials);
    void saveCredentialsToNVS(const WiFiCredentials& credentials);
    WiFiCredentials loadCredentialsFromNVS();
    void clearCredentialsFromNVS();
    
    // Utility Functions
    void generateRandomBytes(uint8_t* buffer, size_t length);
    void printProvisioningInfo();
    String statusToString(BLEProvisioningStatus status);
    String handshakeStateToString(HandshakeState state);
};
