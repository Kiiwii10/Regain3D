#include "MeshProvisioner.h"

static const uint16_t COMPANY_ID = 0xFFFF; // matches advertising in BLEManager

namespace {
class MeshScanCallbacks : public BLEAdvertisedDeviceCallbacks {
public:
  MeshScanCallbacks(MeshProvisioner *mp) : mp(mp) {}
  void onResult(BLEAdvertisedDevice advertisedDevice) override;

private:
  MeshProvisioner *mp;
};
} // namespace

MeshProvisioner::MeshProvisioner()
    : enabled(false), scanning(false), lastScan(0) {
  memset(token, 0, sizeof(token));
  memset(sessionKey, 0, sizeof(sessionKey));
  memset(iv, 0, sizeof(iv));
}

MeshProvisioner::~MeshProvisioner() {}

bool MeshProvisioner::init() {
  // Assume BLEDevice init already performed by BLEManager; if not, init now.
  // Calling BLEDevice::init multiple times is tolerated in Arduino BLE.
  BLEDevice::init(DEVICE_NAME);

  computeManufacturerToken();
  computeSessionKeyAndIV();

  LOG_I("Mesh", "MeshProvisioner initialized (central mode ready)");
  return true;
}

void MeshScanCallbacks::onResult(BLEAdvertisedDevice dev) {
  // Forward to MeshProvisioner via temporary pointer (connect immediately)
  // Note: we can't keep references beyond callback; duplicate object to heap.
  BLEAdvertisedDevice *copy = new BLEAdvertisedDevice(dev);
  // Try provisioning synchronously; this will stop the active scan if needed.
  // Provisioner will delete the copy.
  // Because this runs in callback, use minimal blocking.
  (void)copy; // actual invocation happens in MeshProvisioner::loop via scan stop
}

void MeshProvisioner::loop() {
  if (!enabled)
    return;

  unsigned long now = millis();
  const unsigned long SCAN_PERIOD = 20000; // every 20s

  if (!scanning && (now - lastScan >= SCAN_PERIOD)) {
    startScan();
  }

  // When scanning with callbacks, the NimBLE style would push results; with
  // this BLE library, we can also poll results list. Here we do a short active
  // scan and process immediately.
  if (scanning) {
    // No-op; scanning runs inside startScan() with block duration.
    scanning = false; // reset after one-shot scan
  }
}

void MeshProvisioner::computeManufacturerToken() {
  uint8_t hash[32];
  mbedtls_md_context_t ctx;
  mbedtls_md_type_t md_type = MBEDTLS_MD_SHA256;
  const mbedtls_md_info_t *md_info = mbedtls_md_info_from_type(md_type);
  mbedtls_md_init(&ctx);
  mbedtls_md_setup(&ctx, md_info, 0);
  mbedtls_md_starts(&ctx);
  mbedtls_md_update(&ctx, (const unsigned char *)PROVISIONING_SECRET,
                    strlen(PROVISIONING_SECRET));
  mbedtls_md_finish(&ctx, hash);
  mbedtls_md_free(&ctx);
  memcpy(token, hash, sizeof(token));
}

void MeshProvisioner::computeSessionKeyAndIV() {
  mbedtls_md_context_t ctx;
  mbedtls_md_type_t md_type = MBEDTLS_MD_SHA256;
  const mbedtls_md_info_t *md_info = mbedtls_md_info_from_type(md_type);

  // sessionKey = SHA256(secret + "KEY")
  mbedtls_md_init(&ctx);
  mbedtls_md_setup(&ctx, md_info, 0);
  mbedtls_md_starts(&ctx);
  mbedtls_md_update(&ctx, (const unsigned char *)PROVISIONING_SECRET,
                    strlen(PROVISIONING_SECRET));
  mbedtls_md_update(&ctx, (const unsigned char *)"KEY", 3);
  mbedtls_md_finish(&ctx, sessionKey);
  mbedtls_md_free(&ctx);

  // iv = first 16 bytes of SHA256(secret + "IV")
  uint8_t ivHash[32];
  mbedtls_md_init(&ctx);
  mbedtls_md_setup(&ctx, md_info, 0);
  mbedtls_md_starts(&ctx);
  mbedtls_md_update(&ctx, (const unsigned char *)PROVISIONING_SECRET,
                    strlen(PROVISIONING_SECRET));
  mbedtls_md_update(&ctx, (const unsigned char *)"IV", 2);
  mbedtls_md_finish(&ctx, ivHash);
  mbedtls_md_free(&ctx);
  memcpy(iv, ivHash, AES_IV_SIZE);
}

void MeshProvisioner::startScan() {
  lastScan = millis();
  scanning = true;

  LOG_I("Mesh", "Scanning for unprovisioned peers...");

  BLEScan *scan = BLEDevice::getScan();
  scan->setActiveScan(true);
  scan->setInterval(0x50);
  scan->setWindow(0x30);

  BLEScanResults results = scan->start(5 /* seconds */, false);

  int found = results.getCount();
  for (int i = 0; i < found; ++i) {
    BLEAdvertisedDevice dev = results.getDevice(i);
    // Filter by manufacturer data length and token match
    if (!dev.haveManufacturerData())
      continue;
    std::string mfg = dev.getManufacturerData();
    if (mfg.size() < 2 + sizeof(token) + 1)
      continue;

    const uint8_t *data = (const uint8_t *)mfg.data();
    uint16_t company = (uint16_t)data[0] | ((uint16_t)data[1] << 8);
    if (company != COMPANY_ID)
      continue;

    // Token comparison
    if (memcmp(data + 2, token, sizeof(token)) != 0)
      continue;

    uint8_t statusByte = data[2 + sizeof(token)];
    // Optional 3-byte suffix may follow; log it for visibility
    if (mfg.size() >= (2 + sizeof(token) + 1 + 3)) {
      char idbuf[9];
      snprintf(idbuf, sizeof(idbuf), "%02X%02X%02X",
               data[2 + sizeof(token) + 1],
               data[2 + sizeof(token) + 2],
               data[2 + sizeof(token) + 3]);
      LOG_D("Mesh", String("Peer ID suffix: ") + idbuf);
    }
    if (statusByte != ADV_STATUS_UNPROVISIONED) {
      // Skip already-in-progress or provisioned
      continue;
    }

    std::string addrStr = dev.getAddress().toString();
    unsigned long now = millis();
    if (isBackedOff(addrStr, now)) {
      continue;
    }
    LOG_I("Mesh", String("Found candidate: ") + addrStr.c_str());
    // Try provisioning this device (one at a time)
    BLEAdvertisedDevice *copy = new BLEAdvertisedDevice(dev);
    if (tryProvisionDevice(copy)) {
      LOG_I("Mesh", "Provisioning pushed successfully");
    } else {
      LOG_W("Mesh", "Provisioning attempt failed");
      scheduleBackoff(addrStr, now + 60000UL); // back off 60s for this peer
    }
    delete copy;
  }

  // Stop scan immediately (already stopped due to blocking scan)
  scan->stop();
}

bool MeshProvisioner::tryProvisionDevice(BLEAdvertisedDevice *dev) {
  if (!dev)
    return false;

  // Load Wi-Fi credentials to provision
  WiFiCredentials creds = StorageUtils::loadWiFiCredentials();
  if (!creds.valid || creds.ssid.isEmpty()) {
    LOG_W("Mesh", "No saved WiFi credentials to push");
    return false;
  }

  // Build JSON payload
  String json = String("{\"ssid\":\"") + Utils::escapeJsonString(creds.ssid) +
                "\",\"password\":\"" + Utils::escapeJsonString(creds.password) +
                "\"}";
  std::vector<uint8_t> plain(json.begin(), json.end());
  std::vector<uint8_t> cipher(plain.size() + 16);
  size_t cipherLen = 0;
  if (!encryptPayload(plain.data(), plain.size(), cipher.data(), &cipherLen)) {
    LOG_E("Mesh", "Encrypt payload failed");
    return false;
  }

  BLEClient *client = BLEDevice::createClient();
  bool ok = false;
  do {
    LOG_I("Mesh", String("Connecting to ") + dev->getAddress().toString().c_str());
    if (!client->connect(dev)) {
      LOG_W("Mesh", "BLE connect failed");
      break;
    }

    BLERemoteService *service = nullptr;
    try {
      service = client->getService(BLEUUID(BLE_SERVICE_UUID));
    } catch (...) {
      service = nullptr;
    }
    if (!service) {
      LOG_W("Mesh", "Service not found on device");
      break;
    }

    // Avoid reading descriptors/characteristics to reduce GATT issues on
    // Arduino BLE. Proceed to write directly and rely on backoff if it fails.

    BLERemoteCharacteristic *wifiChar = nullptr;
    try {
      wifiChar = service->getCharacteristic(BLEUUID(BLE_WIFI_CONFIG_CHAR_UUID));
    } catch (...) {
      wifiChar = nullptr;
    }
    if (!wifiChar || !wifiChar->canWrite()) {
      LOG_W("Mesh", "WiFi config characteristic not writable");
      break;
    }

    LOG_I("Mesh", "Writing encrypted WiFi credentials...");
    // Write with response to ensure delivery
    std::string data((const char *)cipher.data(), cipherLen);
    wifiChar->writeValue(data, true /* response */);
    ok = true;
  } while (false);

  if (client->isConnected())
    client->disconnect();
  delete client;
  return ok;
}

bool MeshProvisioner::encryptPayload(const uint8_t *plaintext, size_t length,
                                     uint8_t *cipher, size_t *cipherLen) {
  mbedtls_aes_context aes;
  mbedtls_aes_init(&aes);
  if (mbedtls_aes_setkey_enc(&aes, sessionKey, AES_KEY_SIZE * 8) != 0) {
    mbedtls_aes_free(&aes);
    return false;
  }

  const size_t block = 16;
  size_t pad = block - (length % block);
  if (pad == 0)
    pad = block;
  size_t padded = length + pad;
  std::vector<uint8_t> buf(padded);
  memcpy(buf.data(), plaintext, length);
  memset(buf.data() + length, (int)pad, pad);

  uint8_t iv_copy[AES_IV_SIZE];
  memcpy(iv_copy, iv, AES_IV_SIZE);
  int res = mbedtls_aes_crypt_cbc(&aes, MBEDTLS_AES_ENCRYPT, padded, iv_copy,
                                  buf.data(), cipher);
  mbedtls_aes_free(&aes);
  if (res != 0)
    return false;
  *cipherLen = padded;
  return true;
}

bool MeshProvisioner::isBackedOff(const std::string &addr, unsigned long now) const {
  for (const auto &e : backoff) {
    if (e.addr == addr) {
      return now < e.nextAllowed;
    }
  }
  return false;
}

void MeshProvisioner::scheduleBackoff(const std::string &addr, unsigned long until) {
  for (auto &e : backoff) {
    if (e.addr == addr) {
      e.nextAllowed = until;
      return;
    }
  }
  BackoffEntry e{addr, until};
  backoff.push_back(e);
}
