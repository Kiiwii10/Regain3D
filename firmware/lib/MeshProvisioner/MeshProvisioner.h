#pragma once
#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <Config.h>
#include <Logger.h>
#include <Utils.h>
#include <mbedtls/aes.h>
#include <mbedtls/md.h>
#include <vector>
#include <string>

// MeshProvisioner runs as a BLE Central to discover unprovisioned peers
// (identified by manufacturer data token derived from PROVISIONING_SECRET)
// and writes encrypted Wi-Fi credentials to their provisioning characteristic.
class MeshProvisioner {
public:
  MeshProvisioner();
  ~MeshProvisioner();

  bool init();
  void loop();
  void setEnabled(bool enable) { enabled = enable; }
  bool isEnabled() const { return enabled; }

private:
  bool enabled;
  bool scanning;
  unsigned long lastScan;
  uint8_t token[8];
  uint8_t sessionKey[AES_KEY_SIZE];
  uint8_t iv[AES_IV_SIZE];
  struct BackoffEntry {
    std::string addr;
    unsigned long nextAllowed;
  };
  std::vector<BackoffEntry> backoff;

  // Helpers
  void computeManufacturerToken();
  void computeSessionKeyAndIV();
  void startScan();
  bool tryProvisionDevice(BLEAdvertisedDevice *dev);
  bool encryptPayload(const uint8_t *plaintext, size_t length, uint8_t *cipher,
                      size_t *cipherLen);
  bool isBackedOff(const std::string &addr, unsigned long now) const;
  void scheduleBackoff(const std::string &addr, unsigned long until);
};
