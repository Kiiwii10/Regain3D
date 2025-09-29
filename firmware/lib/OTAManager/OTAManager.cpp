#include "OTAManager.h"
#include <Utils.h>
#include <ArduinoJson.h>
#include <esp_partition.h>
#include <mbedtls/md.h>
#include <Preferences.h>

OTAManager::OTAManager() :
    currentState(OTAState::IDLE),
    initialized(false),
    lastCheck(0),
    downloadedBytes(0),
    totalBytes(0) {
    
    serverUrl = DEFAULT_OTA_URL;
    resetUpdateInfo();
}

OTAManager::~OTAManager() {
    abort();
}

bool OTAManager::init(const String& otaServerUrl) {
    LOG_I("OTA", "Initializing Provisioner OTA Manager");
    
    serverUrl = otaServerUrl;
    resetUpdateInfo();
    setState(OTAState::IDLE);
    
    initialized = true;
    LOG_I("OTA", "Provisioner OTA Manager initialized with server: " + serverUrl);
    return true;
}

void OTAManager::loop() {
    unsigned long currentTime = millis();
    
    // Handle ongoing OTA operations
    switch (currentState) {
        case OTAState::DOWNLOADING:
            // Download progress is handled in downloadFirmwareToApp1
            break;
            
        case OTAState::INSTALLING:
            // Installation is blocking
            break;
            
        case OTAState::COMPLETED:
            LOG_I("OTA", "Application firmware download completed, switching boot partition");
            if (switchToApplicationPartition()) {
                LOG_I("OTA", "Boot partition switched, rebooting to application...");
                delay(2000);
                rebootToApplication();
            } else {
                LOG_E("OTA", "Failed to switch boot partition");
                setState(OTAState::FAILED);
            }
            break;
            
        case OTAState::FAILED:
            if (currentTime - lastCheck > 30000) { // Reset to idle after 30 seconds
                LOG_I("OTA", "Resetting OTA state to idle after failure");
                setState(OTAState::IDLE);
            }
            break;
            
        default:
            break;
    }
}

bool OTAManager::checkForUpdate() {
    if (!initialized) {
        LOG_E("OTA", "OTA Manager not initialized");
        return false;
    }
    
    if (currentState != OTAState::IDLE) {
        LOG_W("OTA", "Cannot check for update - OTA operation in progress");
        return false;
    }
    
    LOG_I("OTA", "Checking for application firmware updates");
    setState(OTAState::CHECKING_UPDATE);
    lastCheck = millis();
    
    bool updateAvailable = fetchUpdateInfo();
    
    if (updateAvailable) {
        LOG_I("OTA", "Application firmware available: " + updateInfo.version);
        setState(OTAState::IDLE);
    } else {
        LOG_I("OTA", "No application firmware available");
        setState(OTAState::IDLE);
    }
    
    return updateAvailable;
}

bool OTAManager::downloadApplicationFirmware() {
    if (!updateInfo.available) {
        LOG_E("OTA", "No application firmware available to download");
        return false;
    }
    
    return downloadApplicationFirmware(updateInfo.url, updateInfo.md5);
}

bool OTAManager::downloadApplicationFirmware(const String& firmwareUrl, const String& expectedMD5) {
    if (!initialized) {
        LOG_E("OTA", "OTA Manager not initialized");
        return false;
    }
    
    if (currentState != OTAState::IDLE) {
        LOG_E("OTA", "Cannot start download - OTA operation already in progress");
        return false;
    }
    
    LOG_I("OTA", "Downloading application firmware from: " + firmwareUrl);
    
    const int maxRetries = 3;
    int retryCount = 0;
    bool downloadSuccess = false;
    
    while (retryCount < maxRetries && !downloadSuccess) {
        if (retryCount > 0) {
            LOG_W("OTA", "Retry attempt " + String(retryCount + 1) + " of " + String(maxRetries));
            delay(2000 * retryCount); // Exponential backoff: 2s, 4s, 6s
        }

        setState(OTAState::DOWNLOADING);
        downloadedBytes = 0;
        totalBytes = 0;

        // Ensure the MD5 used by Update is the expected one for this request
        if (!expectedMD5.isEmpty()) {
            updateInfo.md5 = expectedMD5;
        }

        if (downloadFirmwareToApp1(firmwareUrl)) {
            setState(OTAState::INSTALLING);

            if (validateFirmware(expectedMD5)) {
                setState(OTAState::COMPLETED);
                downloadSuccess = true;
            } else {
                setState(OTAState::FAILED);
            }
        } else {
            setState(OTAState::FAILED);
        }

        retryCount++;
    }

    if (!downloadSuccess) {
        LOG_E("OTA", "Failed to download application firmware after retries");
        return false;
    }

    return true;
}

void OTAManager::abort() {
    if (currentState == OTAState::DOWNLOADING || currentState == OTAState::INSTALLING) {
        LOG_W("OTA", "Aborting OTA operation");
        Update.abort();
        setState(OTAState::FAILED);
    }
}

String OTAManager::getStateString() const {
    return createOTAStateString(currentState);
}

String OTAManager::getStatusJson() const {
    JsonDocument doc; // ArduinoJson v7
    
    doc["state"] = getStateString();
    doc["server_url"] = serverUrl;
    doc["last_check"] = lastCheck;
    
    if (updateInfo.available) {
        JsonObject update = doc["available_update"].to<JsonObject>();
        update["version"] = updateInfo.version;
        update["size"] = updateInfo.size;
        update["description"] = updateInfo.description;
        update["url"] = updateInfo.url;
    }
    
    if (currentState == OTAState::DOWNLOADING && totalBytes > 0) {
        doc["download_progress"] = getDownloadProgress();
        doc["downloaded_bytes"] = downloadedBytes;
        doc["total_bytes"] = totalBytes;
    }
    
    String result;
    serializeJson(doc, result);
    return result;
}

float OTAManager::getDownloadProgress() const {
    if (totalBytes == 0) return 0.0f;
    return ((float)downloadedBytes / (float)totalBytes) * 100.0f;
}

bool OTAManager::switchToApplicationPartition() {
    const esp_partition_t* currentPartition = esp_ota_get_boot_partition();
    const esp_partition_t* runningPartition = esp_ota_get_running_partition();
    LOG_I("OTA", "Current boot partition: " + String(currentPartition ? currentPartition->label : "unknown"));
    LOG_I("OTA", "Running partition: " + String(runningPartition ? runningPartition->label : "unknown"));

    if (targetPartition) {
        LOG_I("OTA", "Expected target partition: " + String(targetPartition->label));
        if (currentPartition && currentPartition->address == targetPartition->address) {
            LOG_I("OTA", "Boot partition already set to target - no change needed");
            return true;
        }
        LOG_W("OTA", "Boot partition differs from target; setting boot partition explicitly");
        return setBootPartition(targetPartition);
    }

    LOG_I("OTA", "No stored target partition; assuming Update configured boot partition");
    return true;
}

// Assignment helpers

bool OTAManager::parseAssignmentPayload(const String& json, OTAAssignment& out) {
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, json);
    if (err) {
        LOG_E("OTA", String("Assignment JSON parse failed: ") + err.c_str());
        return false;
    }
    if (doc["firmware_url"].is<String>()) out.firmwareUrl = doc["firmware_url"].as<String>();
    if (doc["firmware_md5"].is<String>()) out.firmwareMD5 = doc["firmware_md5"].as<String>();
    if (doc["firmware_size"].is<size_t>() || doc["firmware_size"].is<int>()) out.firmwareSize = doc["firmware_size"].as<size_t>();
    if (doc["api_endpoint"].is<String>()) out.apiEndpoint = doc["api_endpoint"].as<String>();
    if (doc["update_token"].is<String>()) out.updateToken = doc["update_token"].as<String>();
    if (doc["printer_brand"].is<String>()) out.printerBrand = doc["printer_brand"].as<String>();
    if (doc["printer_model"].is<String>()) out.printerModel = doc["printer_model"].as<String>();
    if (doc["printer_id"].is<String>()) out.printerId = doc["printer_id"].as<String>();
    if (doc["printer_name"].is<String>()) out.printerName = doc["printer_name"].as<String>();
    if (doc["printer_connection_data"].is<JsonVariant>()) {
        String raw;
        serializeJson(doc["printer_connection_data"], raw);
        out.printerConnectionJson = raw;
    }
    if (out.firmwareUrl.isEmpty() || out.firmwareMD5.isEmpty() || out.firmwareSize == 0) {
        LOG_E("OTA", "Assignment missing required fields (firmware_url, firmware_md5, firmware_size)");
        return false;
    }
    LOG_I("OTA", "Assignment parsed: url=" + out.firmwareUrl + ", size=" + String(out.firmwareSize));
    return true;
}

bool OTAManager::saveAssignmentToNVS(const OTAAssignment& a, bool markAssigned, bool savePrinterMeta) {
    Preferences prefs;
    if (!prefs.begin("app_config", false)) {
        LOG_E("OTA", "Failed to open NVS 'app_config' to save assignment");
        return false;
    }

    prefs.putString("firmware_url", a.firmwareUrl);
    prefs.putString("firmware_md5", a.firmwareMD5);
    if (a.firmwareSize > 0) prefs.putULong("firmware_size", a.firmwareSize);
    if (!a.apiEndpoint.isEmpty()) prefs.putString("api_endpoint", a.apiEndpoint);
    if (!a.updateToken.isEmpty()) prefs.putString("update_token", a.updateToken);
    if (markAssigned) prefs.putBool("assigned", true);

    // Save printer meta and connection JSON if requested
    if (savePrinterMeta) {
        if (!a.printerBrand.isEmpty()) prefs.putString("printer_brand", a.printerBrand);
        if (!a.printerModel.isEmpty()) prefs.putString("printer_model", a.printerModel);
        if (!a.printerId.isEmpty()) prefs.putString("printer_id", a.printerId);
        if (!a.printerName.isEmpty()) prefs.putString("printer_name", a.printerName);
    }
    if (!a.printerConnectionJson.isEmpty()) {
        prefs.putString(NVS_PRINTER_CONN, a.printerConnectionJson);
        LOG_I("OTA", "Saved printer connection JSON to NVS");
        LOG_I("OTA", "Printer connection JSON: " + a.printerConnectionJson);

    }

    // Store printer_type enum for compatibility if brand is known
    if (!a.printerBrand.isEmpty()) {
        String brand = a.printerBrand; brand.toLowerCase();
        int ptype = 2; // GENERIC
        if (brand == "bambu") ptype = 0; else if (brand == "prusa") ptype = 1;
        prefs.putInt("printer_type", ptype);
    }

    prefs.end();
    LOG_I("OTA", "Saved assignment to NVS (url, md5, size, api_endpoint, printer meta)");
    return true;
}

bool OTAManager::handleAssignmentRequest(const String& json, bool triggerDownload, bool savePrinterMeta) {
    OTAAssignment a;
    if (!parseAssignmentPayload(json, a)) {
        return false;
    }
    if (!saveAssignmentToNVS(a, true, savePrinterMeta)) {
        return false;
    }
    if (triggerDownload) {
        return downloadApplicationFirmware(a.firmwareUrl, a.firmwareMD5);
    }
    return true;
}

void OTAManager::rebootToApplication() {
    LOG_I("OTA", "Rebooting to application firmware...");
    delay(1000);
    ESP.restart();
}

bool OTAManager::fetchUpdateInfo() {
    LOG_I("OTA", "Fetching application firmware info from server");
    
    HTTPClient http;
    String infoUrl = serverUrl + String("application_firmware.json");
    
    http.begin(infoUrl);
    int httpCode = http.GET();
    
    if (httpCode != HTTP_CODE_OK) {
        LOG_W("OTA", "No application firmware info available (HTTP " + String(httpCode) + ")");
        http.end();
        return false;
    }
    
    String response = http.getString();
    http.end();
    
    JsonDocument doc; // ArduinoJson v7
    if (deserializeJson(doc, response) != DeserializationError::Ok) {
        LOG_E("OTA", "Failed to parse application firmware info JSON");
        return false;
    }
    
    updateInfo.version = doc["version"].as<String>();
    updateInfo.url = doc["url"].as<String>();
    updateInfo.md5 = doc["md5"].as<String>();
    updateInfo.size = doc["size"].as<size_t>();
    updateInfo.description = doc["description"].as<String>();
    updateInfo.available = true;
    
    LOG_I("OTA", "Application firmware info: " + updateInfo.version + " (size: " + String(updateInfo.size) + " bytes)");
    return true;
}

bool OTAManager::downloadFirmwareToApp1(const String& url) {
    LOG_I("OTA", "Downloading application firmware to next OTA slot using Update library");

    HTTPClient http;
    http.begin(url);
    http.setTimeout(30000); // 30 second timeout

    int httpCode = http.GET();
    if (httpCode != HTTP_CODE_OK) {
        LOG_E("OTA", "HTTP error: " + String(httpCode));
        http.end();
        return false;
    }

    int contentLength = http.getSize();
    if (contentLength <= 0) {
        LOG_E("OTA", "Invalid content length: " + String(contentLength));
        http.end();
        return false;
    }

    LOG_I("OTA", "Content length: " + String(contentLength) + " bytes");

    // Remember which partition Update will use (next OTA slot)
    targetPartition = esp_ota_get_next_update_partition(nullptr);
    if (targetPartition) {
        LOG_I("OTA", String("Target partition: ") + targetPartition->label +
                     ", addr=0x" + String(targetPartition->address, HEX) +
                     ", size=" + String(targetPartition->size));
    } else {
        LOG_W("OTA", "esp_ota_get_next_update_partition returned nullptr");
    }

    // Use the Update library
    if (!Update.begin(contentLength, U_FLASH)) {
        LOG_E("OTA", "Not enough space to begin OTA. Error: " + String(Update.getError()));
        LOG_E("OTA", "Available space: " + String(Update.size()));
        http.end();
        return false;
    }

    totalBytes = contentLength;
    downloadedBytes = 0;

    // Set expected MD5 if available
    if (!updateInfo.md5.isEmpty()) {
        Update.setMD5(updateInfo.md5.c_str());
        LOG_I("OTA", "MD5 validation enabled: " + updateInfo.md5);
    }
    
    // Get the stream and write it chunk by chunk with progress tracking
    WiFiClient* client = http.getStreamPtr();
    uint8_t buffer[1024];
    size_t totalWritten = 0;
    unsigned long lastProgressUpdate = 0;
    
    while (totalWritten < contentLength) {
        // Check if client is still connected
        if (!client->connected()) {
            LOG_E("OTA", "Client disconnected during download");
            Update.abort();
            http.end();
            return false;
        }
        
        size_t availableBytes = client->available();
        if (availableBytes == 0) {
            delay(10);
            continue;
        }
        
        size_t bytesToRead = min(sizeof(buffer), min(availableBytes, (size_t)(contentLength - totalWritten)));
        size_t bytesRead = client->readBytes(buffer, bytesToRead);
        
        if (bytesRead > 0) {
            size_t written = Update.write(buffer, bytesRead);
            if (written != bytesRead) {
                LOG_E("OTA", "Write failed: " + String(written) + " vs " + String(bytesRead));
                Update.abort();
                http.end();
                return false;
            }
            
            totalWritten += written;
            downloadedBytes = totalWritten;
            
            // Log progress every 10KB or every 5 seconds
            if (totalWritten - (totalWritten % 10240) != (totalWritten - written) - ((totalWritten - written) % 10240) ||
                millis() - lastProgressUpdate > 5000) {
                float progress = ((float)totalWritten / (float)contentLength) * 100.0f;
                LOG_I("OTA", "Download progress: " + String(progress, 1) + "% (" + String(totalWritten) + "/" + String(contentLength) + " bytes)");
                lastProgressUpdate = millis();
            }
        }
        
        // Watchdog feed
        delay(1);
    }

    if (totalWritten != contentLength) {
        LOG_E("OTA", "Download incomplete: " + String(totalWritten) + "/" + String(contentLength));
        Update.abort();
        http.end();
        return false;
    }

    // Finalize the update. This validates and sets the next boot partition.
    if (!Update.end(true)) {
        LOG_E("OTA", "Update.end() failed! Error: " + String(Update.getError()));
        if (Update.hasError()) {
            LOG_E("OTA", "Update error details: " + String(Update.errorString()));
        }
        http.end();
        return false;
    }
    
    http.end();
    lastWrittenBytes = totalWritten;
    LOG_I("OTA", "Application firmware download and commit completed successfully");
    LOG_I("OTA", "Downloaded " + String(totalWritten) + " bytes");
    
    return true;
}

bool OTAManager::validateFirmware(const String& expectedMD5) {
    LOG_I("OTA", "Validating application firmware");
    
    if (expectedMD5.isEmpty()) {
        LOG_W("OTA", "No expected MD5 provided, skipping validation");
        return true;
    }
    
    // Use the actual partition that Update wrote to (next OTA slot)
    if (!targetPartition) {
        targetPartition = esp_ota_get_next_update_partition(nullptr);
    }
    if (!targetPartition) {
        LOG_E("OTA", "Cannot determine target partition for validation");
        return false;
    }
    
    // Read the firmware from the partition and calculate MD5
    size_t partitionSize = targetPartition->size;
    const size_t bufferSize = 4096; // 4KB buffer
    uint8_t* buffer = (uint8_t*)malloc(bufferSize);
    
    if (!buffer) {
        LOG_E("OTA", "Failed to allocate buffer for MD5 validation");
        return false;
    }
    
    // Initialize MD5 context
    mbedtls_md_context_t ctx;
    mbedtls_md_type_t md_type = MBEDTLS_MD_MD5;
    
    mbedtls_md_init(&ctx);
    if (mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(md_type), 0) != 0) {
        LOG_E("OTA", "Failed to setup MD5 context");
        free(buffer);
        return false;
    }
    
    if (mbedtls_md_starts(&ctx) != 0) {
        LOG_E("OTA", "Failed to start MD5 calculation");
        mbedtls_md_free(&ctx);
        free(buffer);
        return false;
    }
    
    // Read partition data in chunks and update MD5
    size_t totalRead = 0;
    size_t actualFirmwareSize = 0;
    bool foundEnd = false;
    
    // Compute MD5 over exactly the bytes written during Update
    size_t bytesToValidate = lastWrittenBytes > 0 ? lastWrittenBytes : updateInfo.size;
    if (bytesToValidate == 0 || bytesToValidate > partitionSize) {
        // Fallback to the HTTP content length recorded during download
        bytesToValidate = min(partitionSize, totalBytes);
    }

    LOG_I("OTA", "Calculating MD5 hash over " + String(bytesToValidate) + " bytes from target partition...");
    while (totalRead < bytesToValidate) {
        size_t chunk = min(bufferSize, bytesToValidate - totalRead);
        esp_err_t err = esp_partition_read(targetPartition, totalRead, buffer, chunk);
        if (err != ESP_OK) {
            LOG_E("OTA", "Failed to read partition data: " + String(esp_err_to_name(err)));
            mbedtls_md_free(&ctx);
            free(buffer);
            return false;
        }
        if (mbedtls_md_update(&ctx, buffer, chunk) != 0) {
            LOG_E("OTA", "Failed to update MD5 hash");
            mbedtls_md_free(&ctx);
            free(buffer);
            return false;
        }
        totalRead += chunk;
        if ((totalRead % 65536) == 0) {
            float progress = ((float)totalRead / (float)bytesToValidate) * 100.0f;
            LOG_D("OTA", "MD5 validation progress: " + String(progress, 1) + "%");
        }
    }
    
    // Finalize MD5 calculation
    unsigned char digest[16];
    if (mbedtls_md_finish(&ctx, digest) != 0) {
        LOG_E("OTA", "Failed to finish MD5 calculation");
        mbedtls_md_free(&ctx);
        free(buffer);
        return false;
    }
    
    mbedtls_md_free(&ctx);
    free(buffer);
    
    // Convert digest to hex string
    String calculatedMD5 = "";
    for (int i = 0; i < 16; i++) {
        if (digest[i] < 16) calculatedMD5 += "0";
        calculatedMD5 += String(digest[i], HEX);
    }
    
    calculatedMD5.toLowerCase();
    String expectedMD5Lower = expectedMD5;
    expectedMD5Lower.toLowerCase();
    
    LOG_I("OTA", "Expected MD5:  " + expectedMD5Lower);
    LOG_I("OTA", "Calculated MD5: " + calculatedMD5);
    LOG_I("OTA", "Firmware size used for validation: " + String(totalRead) + " bytes");
    
    bool isValid = calculatedMD5.equals(expectedMD5Lower);
    
    if (isValid) {
        LOG_I("OTA", "Application firmware validation PASSED");
    } else {
        LOG_E("OTA", "Application firmware validation FAILED - MD5 mismatch!");
    }
    
    return isValid;
}

void OTAManager::setState(OTAState newState) {
    if (currentState != newState) {
        LOG_I("OTA", "State changed: " + createOTAStateString(currentState) + " -> " + createOTAStateString(newState));
        currentState = newState;
    }
}

void OTAManager::resetUpdateInfo() {
    updateInfo.version = "";
    updateInfo.url = "";
    updateInfo.md5 = "";
    updateInfo.size = 0;
    updateInfo.available = false;
    updateInfo.description = "";
}

String OTAManager::createOTAStateString(OTAState state) const {
    switch (state) {
        case OTAState::IDLE: return "idle";
        case OTAState::CHECKING_UPDATE: return "checking_update";
        case OTAState::DOWNLOADING: return "downloading";
        case OTAState::INSTALLING: return "installing";
        case OTAState::COMPLETED: return "completed";
        case OTAState::FAILED: return "failed";
        default: return "unknown";
    }
}

const esp_partition_t* OTAManager::getApp1Partition() {
    return esp_partition_find_first(ESP_PARTITION_TYPE_APP, ESP_PARTITION_SUBTYPE_APP_OTA_1, NULL);
}

bool OTAManager::setBootPartition(const esp_partition_t* partition) {
    esp_err_t err = esp_ota_set_boot_partition(partition);
    if (err != ESP_OK) {
        LOG_E("OTA", "Failed to set boot partition: " + String(err));
        return false;
    }
    
    LOG_I("OTA", String("Boot partition set to ") + partition->label);
    return true;
}

