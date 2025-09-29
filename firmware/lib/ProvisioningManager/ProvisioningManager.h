#pragma once
#include <Arduino.h>
#include <ArduinoJson.h>
#include <BLEManager.h>
#include <Config.h>
#include <HTTPClient.h>
#include <Logger.h>
#include <OTAManager.h>
#include <Update.h>
#include <WebServer.h>
#include <WiFi.h>
#include <MeshProvisioner.h>

enum class ProvisioningStatus {
  WAITING_FOR_CONNECTION,
  CONNECTED,
  CREDENTIALS_RECEIVED,
  CONNECTING_WIFI,
  WIFI_CONNECTED,
  WIFI_FAILED,
  OTA_READY,
  PROVISIONING_COMPLETE,
  ERROR
};

struct ApplicationConfig {
  PrinterType printerType;
  String apiEndpoint;
  String apiToken;
  String firmwareUrl;
  String firmwareMD5;
  size_t firmwareSize;
  String printerConnectionData;
  bool assigned;
};

class ProvisioningManager {
private:
  BLEManager *bleManager;
  ProvisioningStatus currentStatus;
  OTAManager otaManager;
  MeshProvisioner* meshProvisioner;
  unsigned long statusChangeTime;
  bool wifiConnected;
  bool otaInProgress;
  WebServer *apiServer;
  ApplicationConfig appConfig;

  // LED indicator state
  enum class LEDPattern { OFF, STEADY, SINGLE_LONG, DOUBLE_LONG, TRIPLE_FAST };
  LEDPattern currentLedPattern = LEDPattern::OFF;
  unsigned long ledLastChange = 0;
  int ledStep = 0;
  bool ledState = false;
  unsigned long detectUntil = 0; // detection mode active until this timestamp

// Select LED pin (default to GPIO2 if not defined)
#ifndef PROVISIONER_LED_PIN
#define PROVISIONER_LED_PIN 2
#endif

public:
  ProvisioningManager();
  ~ProvisioningManager();

  bool init();
  void loop();
  bool isProvisioningComplete() const;

  // API methods
  bool startNetworkServices();
  void setupAPIEndpoints();
  void handleAssignApplication();
  void handleStatus();
  void handleSystemInfo();
  void sendJSONResponse(int code, const JsonDocument &doc);
  void sendErrorResponse(int code, const String &error);
  void handleIdentify();

private:
  bool connectToWiFi(const WiFiCredentials &credentials);
  void handleBLEProvisioning();
  void handleWiFiConnection();
  void handleOTACheck();
  void updateStatus(ProvisioningStatus newStatus);
  bool performOTAUpdate(const String &firmwareUrl);
  void rebootToApplication();
  void factoryReset();

  bool downloadAndInstallFirmware(const String &url);
  bool validateFirmwareHeader(const uint8_t *data, size_t size);
  void printProvisioningInfo();
  void updateLEDIndicators();
  void setLed(bool on);
  ProvisioningManager::LEDPattern computeDesiredPattern() const;

  // Configuration storage
  bool saveApplicationConfig(const ApplicationConfig &config);
  ApplicationConfig loadApplicationConfig();
  void clearApplicationConfig();

  // Application assignment
  bool assignApplicationFirmware(const ApplicationConfig &config);
  bool downloadAndInstallApplication(const String &url, const String &md5,
                                     size_t size);
  void startMeshProvisioning();
  void updateMeshProvisioningState();
};

// util
String provisioningStatusToString(ProvisioningStatus status);
