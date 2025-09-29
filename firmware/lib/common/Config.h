#pragma once

#define FIRMWARE_VERSION "1.0.0"
#define DEVICE_NAME "ESP32_Regain3D_Controller"

#define SERVO_COUNT 16
static const int SERVO_PINS[SERVO_COUNT] = {15, 2, 4, 16, 17, 5, 18, 19, 13, 12, 14, 27, 26, 25, 33, 32};

#define MOTOR_ROWS 4
#define MOTOR_COLS 5
// Matrix sense pins for up to 20 limit switches (4x5)
static const uint8_t MOTOR_ROW_PINS[MOTOR_ROWS] = {15, 2, 4, 16};
static const uint8_t MOTOR_COL_PINS[MOTOR_COLS] = {17, 5, 18, 19, 13};

// Use dedicated, non-conflicting pins for the stepper driver
// Avoid reusing any of the matrix row/col pins above
#define MOTOR_DIRECTION_PIN 22
#define MOTOR_STEP_PIN 23
#define MOTOR_SPEED 800.0


#define MAX_LOG_SIZE 8192

// Connection timing/attempt policy differs by mode
#ifdef APP_PROVISIONER
  // In provisioner mode, fall back quickly
  #define MAX_WIFI_ATTEMPTS 3      // a few attempts
  #define WIFI_CONNECT_TIMEOUT 15000 // 15 seconds per attempt
#else
  // In application mode, be more persistent
  #define MAX_WIFI_ATTEMPTS 10
  #define WIFI_CONNECT_TIMEOUT 30000
#endif

// BLE Service and Characteristic UUIDs for 3D Waste Ecosystem
#define BLE_SERVICE_UUID           "3d9a5f12-8e3b-4c7a-9f2e-1b4d6e8f0a2c"
#define BLE_HANDSHAKE_CHAR_UUID    "3d9a5f13-8e3b-4c7a-9f2e-1b4d6e8f0a2c"
#define BLE_WIFI_CONFIG_CHAR_UUID  "3d9a5f14-8e3b-4c7a-9f2e-1b4d6e8f0a2c"
#define BLE_STATUS_CHAR_UUID       "3d9a5f15-8e3b-4c7a-9f2e-1b4d6e8f0a2c"

// Manufacturer data status byte values used in BLE advertising to signal
// provisioning state to the mobile app. These allow the phone to show a list
// of devices and their state without connecting to each one.
#define ADV_STATUS_UNPROVISIONED   0x00
#define ADV_STATUS_IN_PROGRESS     0x01
#define ADV_STATUS_PROVISIONED     0x02

// Ecosystem Authentication
#define ECOSYSTEM_TOKEN "Regain3DController_v1.0_ESP32"
#define PROVISIONING_SECRET "Regain3D_PreShared_Key"
#define HANDSHAKE_CHALLENGE_SIZE 16
#define AES_KEY_SIZE 32
#define AES_IV_SIZE 16

// mDNS Service Name
#define MDNS_SERVICE_NAME "regain3d-controller"

#define API_PORT 80
#define DEFAULT_OTA_URL "http://192.168.1.100:8080/firmware/"

#define NVS_WIFI_NAMESPACE "wifi_config"
#define NVS_WIFI_SSID "ssid"
#define NVS_WIFI_PASSWORD "password"
#define NVS_API_ENDPOINT "api_endpoint"
#define NVS_PRINTER_TYPE "printer_type"
// Keep NVS keys under 15 chars (ESP32 NVS limit)
#define NVS_PRINTER_CONN "printer_conn"

enum class PrinterType {
    BAMBU_LAB,
    PRUSA,
    GENERIC
};

enum class MotorState {
    OPEN,
    CLOSED
};

struct ServoConfig {
    int pin;
    int channel;
    MotorState state;
    bool enabled;
};

struct WiFiCredentials {
    String ssid;
    String password;
    bool valid;
};

struct SystemStatus {
    bool connected;
    bool printer_connected;
    String printer_status;
    int active_motor;
    unsigned long uptime;
    String firmware_version;
    float free_heap;
};

#ifdef APP_PROVISIONER
    #define LOG_LEVEL_DEBUG 0
    #define ENABLE_OTA false
    #define ENABLE_API false
    #define ENABLE_MOTOR_CONTROL false
    #define ENABLE_PRINTER_COMM false
#else
    #define LOG_LEVEL_DEBUG 1
    #define ENABLE_OTA true
    #define ENABLE_API true
    #define ENABLE_MOTOR_CONTROL true
    #define ENABLE_PRINTER_COMM true
#endif
