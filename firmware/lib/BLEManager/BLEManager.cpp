#include "BLEManager.h"
#include <Utils.h>
#include <Preferences.h>
#include <esp_random.h>
#include <esp_gap_ble_api.h>
#include <vector>

static esp_ble_adv_params_t bleAdvParams = {
    .adv_int_min = 0x20,
    .adv_int_max = 0x40,
    .adv_type = ADV_TYPE_IND,
    .own_addr_type = BLE_ADDR_TYPE_PUBLIC,
    .channel_map = ADV_CHNL_ALL,
    .adv_filter_policy = ADV_FILTER_ALLOW_SCAN_ANY_CON_ANY
};

BLEManager::BLEManager() :
    pServer(nullptr),
    pService(nullptr),
    pWifiConfigCharacteristic(nullptr),
    pStatusCharacteristic(nullptr),
    currentStatus(BLEProvisioningStatus::ADVERTISING),
    handshakeState(HandshakeState::WAITING_FOR_CHALLENGE),
    deviceConnected(false),
    credentialsReceived(false),
    statusChangeTime(0),
    lastStatusUpdate(0),
    wifiAttempts(0),
    lastRetryAttempt(0),
    advDataLen(0),
    statusIndex(-1),
    provisioningDone(false) {
    
    memset(&handshakeData, 0, sizeof(handshakeData));
    receivedCredentials.valid = false;
}

BLEManager::~BLEManager() {
    stopBLEService();
}

bool BLEManager::init() {
    LOG_I("BLEManager", "Initializing BLE Manager");
    
    printProvisioningInfo();
    
    // Try to load existing credentials first
    WiFiCredentials savedCredentials = loadCredentialsFromNVS();
    if (savedCredentials.valid && !savedCredentials.ssid.isEmpty()) {
        LOG_I("BLEProvisioning", "Found saved WiFi credentials, attempting connection");
        receivedCredentials = savedCredentials;
        
        updateStatus(BLEProvisioningStatus::CONNECTING_WIFI);
        if (connectToWiFi(savedCredentials)) {
            updateStatus(BLEProvisioningStatus::WIFI_CONNECTED);
            updateStatus(BLEProvisioningStatus::PROVISIONING_COMPLETE);
            return true;
        } else {
            LOG_W("BLEProvisioning", "Saved credentials failed, starting BLE provisioning");
        }
    }
    
    // Initialize BLE and start provisioning service
    if (!startBLEService()) {
        LOG_E("BLEProvisioning", "Failed to start BLE service");
        updateStatus(BLEProvisioningStatus::ERROR);
        return false;
    }
    
    updateStatus(BLEProvisioningStatus::ADVERTISING);
    LOG_I("BLEProvisioning", "BLE Provisioning Manager initialized successfully");
    return true;
}

void BLEManager::loop() {
    unsigned long now = millis();
    
    // Broadcast status updates
    if (deviceConnected && (now - lastStatusUpdate > STATUS_UPDATE_INTERVAL)) {
        broadcastStatus();
        lastStatusUpdate = now;
    }
    
    // Handle WiFi connection status
    if (currentStatus == BLEProvisioningStatus::CONNECTING_WIFI) {
        if (WiFi.status() == WL_CONNECTED) {
            LOG_I("BLEProvisioning", "WiFi connection successful");
            wifiAttempts = 0; // reset after success
            updateStatus(BLEProvisioningStatus::WIFI_CONNECTED);
            updateStatus(BLEProvisioningStatus::PROVISIONING_COMPLETE);
        } else if (now - statusChangeTime > WIFI_CONNECT_TIMEOUT) {
            wifiAttempts++;
            LOG_W("BLEProvisioning", String("WiFi connection timeout (attempt ") + String(wifiAttempts) + "/" + String(MAX_WIFI_ATTEMPTS) + ")");
            if (wifiAttempts < MAX_WIFI_ATTEMPTS && receivedCredentials.valid) {
                // Retry with same credentials
                WiFi.disconnect(true, true);
                delay(100);
                LOG_I("BLEProvisioning", String("Retrying WiFi: ") + receivedCredentials.ssid);
                WiFi.begin(receivedCredentials.ssid.c_str(), receivedCredentials.password.c_str());
                updateStatus(BLEProvisioningStatus::CONNECTING_WIFI);
            } else {
                LOG_E("BLEProvisioning", String("WiFi failed after ") + String(wifiAttempts) + " attempts - returning to BLE provisioning");
                updateStatus(BLEProvisioningStatus::WIFI_FAILED);
                // Ensure BLE advertising is active for re-provisioning
                if (!pServer) {
                    startBLEService();
                } else {
                    esp_ble_gap_start_advertising(&bleAdvParams);
                }
                if (!provisioningDone) {
                    setAdvStatus(ADV_STATUS_UNPROVISIONED);
                } else {
                    setAdvStatus(ADV_STATUS_PROVISIONED);
                }
                // Reset state for fresh provisioning
                deviceConnected = false;
                handshakeState = HandshakeState::WAITING_FOR_CHALLENGE;
                memset(&handshakeData, 0, sizeof(handshakeData));
                credentialsReceived = false;
                // Mark credentials invalid but keep them in memory for periodic retries
                receivedCredentials.valid = false;
                WiFi.disconnect(true, true);
                wifiAttempts = 0;
                lastRetryAttempt = now;
                updateStatus(BLEProvisioningStatus::ADVERTISING);
            }
        }
    }

    // Periodic retry when in provisioning/advertising with known but invalid creds
    if ((currentStatus == BLEProvisioningStatus::ADVERTISING ||
         currentStatus == BLEProvisioningStatus::WIFI_FAILED) &&
        !deviceConnected &&
        !receivedCredentials.ssid.isEmpty() &&
        !receivedCredentials.valid) {
        if (now - lastRetryAttempt >= WIFI_RETRY_INTERVAL) {
            LOG_I("BLEProvisioning", String("Periodic WiFi retry with SSID: ") + receivedCredentials.ssid);
            WiFi.mode(WIFI_STA);
            WiFi.begin(receivedCredentials.ssid.c_str(), receivedCredentials.password.c_str());
            wifiAttempts = 0;
            updateStatus(BLEProvisioningStatus::CONNECTING_WIFI);
            lastRetryAttempt = now;
        }
    }
}

bool BLEManager::isProvisioningComplete() const {
    return currentStatus == BLEProvisioningStatus::PROVISIONING_COMPLETE;
}

bool BLEManager::startBLEService() {
    LOG_I("BLEProvisioning", "Starting BLE service");
    
    // Initialize BLE
    BLEDevice::init(DEVICE_NAME);
    
    // Create BLE Server
    pServer = BLEDevice::createServer();
    pServer->setCallbacks(this);
    
    // Create BLE Service
    pService = pServer->createService(BLE_SERVICE_UUID);
    
    // Create WiFi Configuration Characteristic
    pWifiConfigCharacteristic = pService->createCharacteristic(
        BLE_WIFI_CONFIG_CHAR_UUID,
        BLECharacteristic::PROPERTY_WRITE
    );
    pWifiConfigCharacteristic->setCallbacks(this);
    
    // Create Status Characteristic
    pStatusCharacteristic = pService->createCharacteristic(
        BLE_STATUS_CHAR_UUID,
        BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
    );
    pStatusCharacteristic->setCallbacks(this);
    pStatusCharacteristic->addDescriptor(new BLE2902());
    
    // Start the service
    pService->start();
    
    // Start advertising with manufacturer data based on provisioning secret
    uint8_t hash[32];
    mbedtls_md_context_t ctx;
    mbedtls_md_type_t md_type = MBEDTLS_MD_SHA256;
    const mbedtls_md_info_t* md_info = mbedtls_md_info_from_type(md_type);
    mbedtls_md_init(&ctx);
    mbedtls_md_setup(&ctx, md_info, 0);
    mbedtls_md_starts(&ctx);
    mbedtls_md_update(&ctx, (const unsigned char*)PROVISIONING_SECRET,
                      strlen(PROVISIONING_SECRET));
    mbedtls_md_finish(&ctx, hash);
    mbedtls_md_free(&ctx);

    const uint8_t token_len = 8;
    const uint8_t id_len = 3; // last 3 bytes of device MAC (efuse base MAC)
    // Manufacturer data layout:
    // [0-1]  Company ID (0xFFFF)
    // [2-9]  Token derived from PROVISIONING_SECRET
    // [10]   Provisioning status byte
    // [11-13] Device ID suffix (last 3 bytes of base MAC)
    uint8_t mfg_data[2 + token_len + 1 + id_len];
    mfg_data[0] = 0xFF;
    mfg_data[1] = 0xFF;
    memcpy(mfg_data + 2, hash, token_len);
    mfg_data[2 + token_len] = ADV_STATUS_UNPROVISIONED;
    // Extract last 3 bytes of the base MAC (efuse MAC)
    uint64_t baseMac = ESP.getEfuseMac();
    mfg_data[2 + token_len + 1] = (uint8_t)(baseMac & 0xFF);
    mfg_data[2 + token_len + 2] = (uint8_t)((baseMac >> 8) & 0xFF);
    mfg_data[2 + token_len + 3] = (uint8_t)((baseMac >> 16) & 0xFF);

    int pos = 0;
    // Flags
    advData[pos++] = 2;
    advData[pos++] = ESP_BLE_AD_TYPE_FLAG;
    advData[pos++] = ESP_BLE_ADV_FLAG_GEN_DISC | ESP_BLE_ADV_FLAG_BREDR_NOT_SPT;

    // Manufacturer data
    advData[pos++] = 1 + sizeof(mfg_data);
    advData[pos++] = ESP_BLE_AD_MANUFACTURER_SPECIFIC_TYPE;
    memcpy(advData + pos, mfg_data, sizeof(mfg_data));
    statusIndex = pos + 2 + token_len; // Index of status byte inside advData
    pos += sizeof(mfg_data);

    advDataLen = pos;

    esp_ble_gap_config_adv_data_raw(advData, advDataLen);
    esp_ble_gap_start_advertising(&bleAdvParams);

    LOG_I("BLEProvisioning", "BLE service started and advertising");
    return true;
}

void BLEManager::stopBLEService() {
    if (pServer) {
        esp_ble_gap_stop_advertising();
        BLEDevice::deinit(false);
        pServer = nullptr;
        pService = nullptr;
        pWifiConfigCharacteristic = nullptr;
        pStatusCharacteristic = nullptr;
    }
}

void BLEManager::onConnect(BLEServer* pServer) {
    LOG_I("BLEProvisioning", "Client connected");
    deviceConnected = true;
    updateStatus(BLEProvisioningStatus::CLIENT_CONNECTED);
    initHandshake();
    if (!provisioningDone) {
        setAdvStatus(ADV_STATUS_IN_PROGRESS);
    }
}

void BLEManager::onDisconnect(BLEServer* pServer) {
    LOG_I("BLEProvisioning", "Client disconnected");
    deviceConnected = false;
    handshakeState = HandshakeState::WAITING_FOR_CHALLENGE;
    memset(&handshakeData, 0, sizeof(handshakeData));

    // Restart advertising
    esp_ble_gap_start_advertising(&bleAdvParams);
    updateStatus(BLEProvisioningStatus::ADVERTISING);
    if (!provisioningDone) {
        setAdvStatus(ADV_STATUS_UNPROVISIONED);
    } else {
        setAdvStatus(ADV_STATUS_PROVISIONED);
    }
}

void BLEManager::onWrite(BLECharacteristic* pCharacteristic) {
    std::string value = pCharacteristic->getValue();
    if (pCharacteristic == pWifiConfigCharacteristic) {
        if (handshakeState == HandshakeState::AUTHENTICATED &&
            currentStatus != BLEProvisioningStatus::CONNECTING_WIFI) {
            LOG_D("BLEProvisioning", "WiFi credentials received");
            processWiFiCredentials((uint8_t*)value.data(), value.length());
        } else {
            LOG_W("BLEProvisioning", "WiFi credentials received but not authenticated");
            // Proactively notify busy status so provisioners back off
            broadcastStatus();
        }
    }
}

void BLEManager::onRead(BLECharacteristic* pCharacteristic) {
    if (pCharacteristic == pStatusCharacteristic) {
        broadcastStatus();
    }
}

void BLEManager::initHandshake() {
    LOG_I("BLEProvisioning", "Initializing session with pre-shared secret");
    generateSessionKeyFromSecret();
    handshakeState = HandshakeState::AUTHENTICATED;
    updateStatus(BLEProvisioningStatus::HANDSHAKE_COMPLETED);
}

void BLEManager::generateSessionKeyFromSecret() {
    mbedtls_md_context_t ctx;
    mbedtls_md_type_t md_type = MBEDTLS_MD_SHA256;
    const mbedtls_md_info_t* md_info = mbedtls_md_info_from_type(md_type);

    // Generate session key: SHA256(PROVISIONING_SECRET + "KEY")
    mbedtls_md_init(&ctx);
    mbedtls_md_setup(&ctx, md_info, 0);
    mbedtls_md_starts(&ctx);
    mbedtls_md_update(&ctx, (const unsigned char*)PROVISIONING_SECRET,
                      strlen(PROVISIONING_SECRET));
    mbedtls_md_update(&ctx, (const unsigned char*)"KEY", 3);
    mbedtls_md_finish(&ctx, handshakeData.sessionKey);
    mbedtls_md_free(&ctx);

    // Generate IV: SHA256(PROVISIONING_SECRET + "IV") and take first 16 bytes
    uint8_t ivHash[32];
    mbedtls_md_init(&ctx);
    mbedtls_md_setup(&ctx, md_info, 0);
    mbedtls_md_starts(&ctx);
    mbedtls_md_update(&ctx, (const unsigned char*)PROVISIONING_SECRET,
                      strlen(PROVISIONING_SECRET));
    mbedtls_md_update(&ctx, (const unsigned char*)"IV", 2);
    mbedtls_md_finish(&ctx, ivHash);
    mbedtls_md_free(&ctx);

    memcpy(handshakeData.iv, ivHash, AES_IV_SIZE);
}

bool BLEManager::processWiFiCredentials(const uint8_t* data, size_t length) {
    if (handshakeState != HandshakeState::AUTHENTICATED) {
        LOG_E("BLEProvisioning", "Not authenticated for WiFi credentials");
        return false;
    }
    
    // Decrypt the WiFi credentials
    uint8_t decrypted[256];
    size_t decryptedLength;
    
    if (!decryptData(data, length, decrypted, &decryptedLength)) {
        LOG_E("BLEProvisioning", "Failed to decrypt WiFi credentials");
        return false;
    }
    
    // Parse JSON credentials
    String jsonStr = String((char*)decrypted, decryptedLength);
    LOG_D("BLEProvisioning", "Decrypted credentials: " + jsonStr);
    
    // Simple JSON parsing for SSID and password
    int ssidStart = jsonStr.indexOf("\"ssid\":\"") + 8;
    int ssidEnd = jsonStr.indexOf("\"", ssidStart);
    int passStart = jsonStr.indexOf("\"password\":\"") + 12;
    int passEnd = jsonStr.indexOf("\"", passStart);
    
    if (ssidStart > 7 && ssidEnd > ssidStart && passStart > 11 && passEnd > passStart) {
        receivedCredentials.ssid = jsonStr.substring(ssidStart, ssidEnd);
        receivedCredentials.password = jsonStr.substring(passStart, passEnd);
        receivedCredentials.valid = true;
        credentialsReceived = true;
        
        LOG_I("BLEProvisioning", "WiFi credentials received - SSID: " + receivedCredentials.ssid);
        updateStatus(BLEProvisioningStatus::WIFI_CREDENTIALS_RECEIVED);
        
        // Save credentials and attempt connection
        saveCredentialsToNVS(receivedCredentials);
        updateStatus(BLEProvisioningStatus::CONNECTING_WIFI);
        
        return connectToWiFi(receivedCredentials);
    }
    
    LOG_E("BLEProvisioning", "Failed to parse WiFi credentials");
    return false;
}

bool BLEManager::encryptData(const uint8_t* plaintext, size_t length, uint8_t* ciphertext, size_t* cipherLength) {
    mbedtls_aes_context aes;
    mbedtls_aes_init(&aes);
    
    if (mbedtls_aes_setkey_enc(&aes, handshakeData.sessionKey, AES_KEY_SIZE * 8) != 0) {
        mbedtls_aes_free(&aes);
        return false;
    }
    
    // Apply PKCS#7 padding
    const size_t blockSize = 16;
    size_t padSize = blockSize - (length % blockSize);
    if (padSize == 0) {
        padSize = blockSize;
    }
    size_t paddedLength = length + padSize;

    std::vector<uint8_t> padded(paddedLength);
    memcpy(padded.data(), plaintext, length);
    memset(padded.data() + length, padSize, padSize);

    uint8_t iv_copy[AES_IV_SIZE];
    memcpy(iv_copy, handshakeData.iv, AES_IV_SIZE);

    int result = mbedtls_aes_crypt_cbc(&aes, MBEDTLS_AES_ENCRYPT, paddedLength,
                                      iv_copy, padded.data(), ciphertext);

    mbedtls_aes_free(&aes);

    if (result == 0) {
        *cipherLength = paddedLength;
        return true;
    }

    return false;
}

bool BLEManager::decryptData(const uint8_t* ciphertext, size_t length, uint8_t* plaintext, size_t* plainLength) {
    mbedtls_aes_context aes;
    mbedtls_aes_init(&aes);
    
    if (mbedtls_aes_setkey_dec(&aes, handshakeData.sessionKey, AES_KEY_SIZE * 8) != 0) {
        mbedtls_aes_free(&aes);
        return false;
    }
    
    uint8_t iv_copy[AES_IV_SIZE];
    memcpy(iv_copy, handshakeData.iv, AES_IV_SIZE);
    
    int result = mbedtls_aes_crypt_cbc(&aes, MBEDTLS_AES_DECRYPT, length,
                                      iv_copy, ciphertext, plaintext);

    mbedtls_aes_free(&aes);

    if (result != 0 || length == 0 || (length % 16) != 0) {
        return false;
    }

    // Validate and remove PKCS#7 padding
    uint8_t padSize = plaintext[length - 1];
    if (padSize == 0 || padSize > 16 || padSize > length) {
        return false;
    }

    for (size_t i = 0; i < padSize; ++i) {
        if (plaintext[length - 1 - i] != padSize) {
            return false;
        }
    }

    *plainLength = length - padSize;
    return true;
}

bool BLEManager::connectToWiFi(const WiFiCredentials& credentials) {
    if (!credentials.valid || credentials.ssid.isEmpty()) {
        return false;
    }
    
    LOG_I("BLEProvisioning", "Connecting to WiFi: " + credentials.ssid);
    
    WiFi.mode(WIFI_STA);
    WiFi.begin(credentials.ssid.c_str(), credentials.password.c_str());
    wifiAttempts = 0; // starting a new connect sequence
    lastRetryAttempt = millis();
    
    return true; // Connection will be checked in loop()
}

void BLEManager::saveCredentialsToNVS(const WiFiCredentials& credentials) {
    Preferences prefs;
    if (prefs.begin(NVS_WIFI_NAMESPACE, false)) {
        prefs.putString(NVS_WIFI_SSID, credentials.ssid);
        prefs.putString(NVS_WIFI_PASSWORD, credentials.password);
        prefs.end();
        LOG_I("BLEProvisioning", "WiFi credentials saved to NVS");
    } else {
        LOG_E("BLEProvisioning", "Failed to save credentials to NVS");
    }
}

WiFiCredentials BLEManager::loadCredentialsFromNVS() {
    WiFiCredentials credentials;
    credentials.valid = false;
    
    Preferences prefs;
    if (prefs.begin(NVS_WIFI_NAMESPACE, true)) {
        credentials.ssid = prefs.getString(NVS_WIFI_SSID, "");
        credentials.password = prefs.getString(NVS_WIFI_PASSWORD, "");
        prefs.end();
        
        if (!credentials.ssid.isEmpty()) {
            credentials.valid = true;
            LOG_I("BLEProvisioning", "Loaded WiFi credentials from NVS");
        }
    }
    
    return credentials;
}

void BLEManager::clearCredentialsFromNVS() {
    Preferences prefs;
    if (prefs.begin(NVS_WIFI_NAMESPACE, false)) {
        // Use remove if available; otherwise overwrite with empty strings
        #ifdef PREFERENCES_HAS_REMOVE
        prefs.remove(NVS_WIFI_SSID);
        prefs.remove(NVS_WIFI_PASSWORD);
        #else
        prefs.putString(NVS_WIFI_SSID, "");
        prefs.putString(NVS_WIFI_PASSWORD, "");
        #endif
        prefs.end();
        LOG_I("BLEProvisioning", "Cleared WiFi credentials from NVS");
    } else {
        LOG_W("BLEProvisioning", "Failed to open NVS to clear WiFi credentials");
    }
}

void BLEManager::updateStatus(BLEProvisioningStatus newStatus) {
    if (currentStatus != newStatus) {
        LOG_I("BLEProvisioning", "Status: " + statusToString(newStatus));
        currentStatus = newStatus;
        statusChangeTime = millis();
        // Reflect busy states in advertisement so seeds can skip us
        if (newStatus == BLEProvisioningStatus::CONNECTING_WIFI ||
            newStatus == BLEProvisioningStatus::HANDSHAKE_COMPLETED ||
            newStatus == BLEProvisioningStatus::CLIENT_CONNECTED) {
            if (!provisioningDone) {
                setAdvStatus(ADV_STATUS_IN_PROGRESS);
            }
        }
        if (newStatus == BLEProvisioningStatus::WIFI_FAILED) {
            if (!provisioningDone) {
                setAdvStatus(ADV_STATUS_UNPROVISIONED);
            } else {
                setAdvStatus(ADV_STATUS_PROVISIONED);
            }
        }
        broadcastStatus();
        if (newStatus == BLEProvisioningStatus::PROVISIONING_COMPLETE) {
            provisioningDone = true;
            setAdvStatus(ADV_STATUS_PROVISIONED);
            // If device is connected to WiFi, stop advertising to avoid
            // acting as a provisionee once provisioning is complete.
            if (WiFi.status() == WL_CONNECTED) {
                esp_ble_gap_stop_advertising();
            }
        }
    }
}

void BLEManager::broadcastStatus() {
    if (pStatusCharacteristic && deviceConnected) {
        // Consider busy when not advertising or failed
        bool busy = !(currentStatus == BLEProvisioningStatus::ADVERTISING ||
                      currentStatus == BLEProvisioningStatus::WIFI_FAILED);
        String statusJson = "{\"status\":\"" + statusToString(currentStatus) +
                           "\",\"handshake\":\"" + handshakeStateToString(handshakeState) +
                           "\",\"busy\":" + String(busy ? "true" : "false") +
                           ",\"uptime\":" + String(millis()) + "}";

        pStatusCharacteristic->setValue(statusJson.c_str());
        pStatusCharacteristic->notify();
    }
}

void BLEManager::setAdvStatus(uint8_t status) {
    if (statusIndex < 0)
        return;

    esp_ble_gap_stop_advertising();
    advData[statusIndex] = status;
    esp_ble_gap_config_adv_data_raw(advData, advDataLen);
    esp_ble_gap_start_advertising(&bleAdvParams);
}

void BLEManager::generateRandomBytes(uint8_t* buffer, size_t length) {
    for (size_t i = 0; i < length; i += 4) {
        uint32_t random = esp_random();
        size_t copySize = min(sizeof(random), length - i);
        memcpy(buffer + i, &random, copySize);
    }
}

void BLEManager::printProvisioningInfo() {
    LOG_I("BLEProvisioning", "=== ESP32 3D Waste Controller - BLE Provisioner ===");
    LOG_I("BLEProvisioning", "Device: " + String(DEVICE_NAME));
    LOG_I("BLEProvisioning", "Version: " + String(FIRMWARE_VERSION));
    LOG_I("BLEProvisioning", "Chip: " + String(ESP.getChipModel()));
    LOG_I("BLEProvisioning", "Flash: " + String(ESP.getFlashChipSize() / (1024*1024)) + "MB");
    LOG_I("BLEProvisioning", "Free heap: " + String(ESP.getFreeHeap()) + " bytes");
    LOG_I("BLEProvisioning", "Provisioning method: BLE with ecosystem handshake");
    LOG_I("BLEProvisioning", "Service UUID: " + String(BLE_SERVICE_UUID));
    LOG_I("BLEProvisioning", "Ecosystem Token: " + String(ECOSYSTEM_TOKEN));
    LOG_I("BLEProvisioning", "===============================================");
}

String BLEManager::statusToString(BLEProvisioningStatus status) {
    switch (status) {
        case BLEProvisioningStatus::ADVERTISING: return "Advertising";
        case BLEProvisioningStatus::CLIENT_CONNECTED: return "Client Connected";
        case BLEProvisioningStatus::HANDSHAKE_INITIATED: return "Handshake Initiated";
        case BLEProvisioningStatus::HANDSHAKE_COMPLETED: return "Handshake Completed";
        case BLEProvisioningStatus::WIFI_CREDENTIALS_RECEIVED: return "WiFi Credentials Received";
        case BLEProvisioningStatus::CONNECTING_WIFI: return "Connecting to WiFi";
        case BLEProvisioningStatus::WIFI_CONNECTED: return "WiFi Connected";
        case BLEProvisioningStatus::WIFI_FAILED: return "WiFi Failed";
        case BLEProvisioningStatus::PROVISIONING_COMPLETE: return "Provisioning Complete";
        case BLEProvisioningStatus::ERROR: return "Error";
        default: return "Unknown";
    }
}

String BLEManager::handshakeStateToString(HandshakeState state) {
    switch (state) {
        case HandshakeState::WAITING_FOR_CHALLENGE: return "Waiting for Challenge";
        case HandshakeState::CHALLENGE_SENT: return "Challenge Sent";
        case HandshakeState::WAITING_FOR_RESPONSE: return "Waiting for Response";
        case HandshakeState::AUTHENTICATED: return "Authenticated";
        case HandshakeState::FAILED: return "Failed";
        default: return "Unknown";
    }
}
