# ESP32 Command Specification & Printer State Monitoring

## Overview

This document defines all G-code commands injected for ESP32 coordination and specifies printer state monitoring requirements for user alerts during critical situations for bambu lab printers.

## Part 1: G-code Command Set for ESP32 Coordination

| Command                       | G-code Injection                   | ESP32 Response                         | Serial Output                                                         | Purpose                             |
| ----------------------------- | ---------------------------------- | -------------------------------------- | --------------------------------------------------------------------- | ----------------------------------- |
| `ESP32:FILAMENT_CHANGE_START` | `M117 ESP32:FILAMENT_CHANGE_START` | Log event, track old material          | `ACTION: Starting filament change sequence`                           | Initialize filament change sequence |
| `ESP32:STARTING_PURGE`        | `M117 ESP32:STARTING_PURGE`        | **Unpause printer** after 1s delay     | `ACTION: Purge started - will unpause printer in 1 second`            | Begin waste ball purge phase        |
| `ESP32:WASTE_BALL_COMPLETE`   | `M117 ESP32:WASTE_BALL_COMPLETE`   | Route pure waste to AMS-specific valve | `ACTION: Waste ball complete - routing pure material to valve`        | Waste ball purge completed          |
| `ESP32:CLEAN_BALL_COMPLETE`   | `M117 ESP32:CLEAN_BALL_COMPLETE`   | Route mixed waste to mixed waste valve | `ACTION: Clean ball complete - routing mixed material to waste valve` | Clean ball purge completed          |
| `ESP32:MOVING_TO_WIPE`        | `M117 ESP32:MOVING_TO_WIPE`        | Track wipe start                       | `ACTION: Moving to wipe position`                                     | Moving to wipe position             |
| `ESP32:WIPE_COMPLETE`         | `M117 ESP32:WIPE_COMPLETE`         | Signal change near completion          | `ACTION: Wipe complete`                                               | Nozzle wipe completed               |
| `ESP32:RESUMING_PRINT`        | `M117 ESP32:RESUMING_PRINT`        | Complete change sequence, reset state  | `ACTION: Filament change complete - resuming print`                   | Filament change complete            |

| Command                   | G-code Injection                         | ESP32 Response                                          | Serial Output                                                       | Purpose                                                      |
| ------------------------- | ---------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------ |
| `ESP32:PAUSE_FOR_ESP`     | `M117 ESP32:PAUSE_FOR_ESP\nM0`           | Acknowledge and unpause                                 | `ACTION: Printer paused for ESP32 - will unpause when ready`        | Force printer pause until ESP32 ready                        |
| `ESP32:VALVE_ACTIVATE`    | `M117 ESP32:VALVE_ACTIVATE:{ID}`         | Activate specified valve by ID                          | `VALVE: Activating valve {ID} based on user mapping`                | Activate any valve by ID (user-configurable purpose)         |
| `ESP32:VALVE_DEACTIVATE`  | `M117 ESP32:VALVE_DEACTIVATE:{ID}`       | Deactivate specified valve by ID                        | `VALVE: Deactivating valve {ID}`                                    | Deactivate any valve by ID                                   |
| `ESP32:ROUTE_PURE_WASTE`  | `M117 ESP32:ROUTE_PURE_WASTE`            | Route pure material based on current AMS slot mapping   | `ROUTING: Pure waste from AMS Slot {X} → Valve {Y} (user-assigned)` | Route pure material to user-assigned valve for current spool |
| `ESP32:ROUTE_MIXED_WASTE` | `M117 ESP32:ROUTE_MIXED_WASTE`           | Route mixed material to user-assigned mixed waste valve | `ROUTING: Mixed waste → Valve {Y} (user-assigned mixed waste)`      | Route mixed material to user-assigned mixed waste valve      |
| `ESP32:MATERIAL_CHANGE`   | `M117 ESP32:MATERIAL_CHANGE:{OLD}:{NEW}` | Update material tracking                                | `AMS: Material change from {OLD} to {NEW}`                          | Specific material change notification                        |

#### Print Status Commands

| Command                | G-code Injection              | ESP32 Response                | Serial Output                                                 | Purpose                          |
| ---------------------- | ----------------------------- | ----------------------------- | ------------------------------------------------------------- | -------------------------------- |
| `ESP32:PRINT_START`    | `M117 ESP32:PRINT_START`      | Initialize print monitoring   | `PRINT_STATE: Print job started - monitoring enabled`         | Print job started                |
| `ESP32:LAYER_CHANGE`   | `M117 ESP32:LAYER_CHANGE:{N}` | Update layer progress         | `PRINT_STATE: Layer {N} started`                              | Layer progress tracking          |
| `ESP32:PRINT_PAUSE`    | `M117 ESP32:PRINT_PAUSE`      | Enter pause monitoring mode   | `PRINT_STATE: Print paused - entering pause monitoring`       | Print manually paused            |
| `ESP32:PRINT_RESUME`   | `M117 ESP32:PRINT_RESUME`     | Exit pause monitoring mode    | `PRINT_STATE: Print resumed - returning to normal monitoring` | Print resumed                    |
| `ESP32:PRINT_COMPLETE` | `M117 ESP32:PRINT_COMPLETE`   | Log completion, reset state   | `PRINT_STATE: Print completed successfully - resetting state` | Print job completed successfully |
| `ESP32:PRINT_CANCEL`   | `M117 ESP32:PRINT_CANCEL`     | Log cancellation, reset state | `PRINT_STATE: Print cancelled - resetting state`              | Print job cancelled              |

#### Error Recovery Commands

| Command                     | G-code Injection                   | ESP32 Response             | Serial Output                                                       | Purpose                    |
| --------------------------- | ---------------------------------- | -------------------------- | ------------------------------------------------------------------- | -------------------------- |
| `ESP32:ERROR_DETECTED`      | `M117 ESP32:ERROR_DETECTED:{CODE}` | Parse error, alert user    | `ERROR: Print error detected - Code {CODE}`                         | Error condition detected   |
| `ESP32:RECOVERY_START`      | `M117 ESP32:RECOVERY_START`        | Enter recovery monitoring  | `ACTION: Error recovery started - monitoring recovery process`      | Error recovery in progress |
| `ESP32:RECOVERY_SUCCESS`    | `M117 ESP32:RECOVERY_SUCCESS`      | Return to normal operation | `ACTION: Error recovery successful - returning to normal operation` | Recovery completed         |
| `ESP32:MANUAL_INTERVENTION` | `M117 ESP32:MANUAL_INTERVENTION`   | Alert for user action      | `WARNING: Manual intervention required - user action needed`        | User intervention required |

#### Calibration & Maintenance Commands

| Command                      | G-code Injection                  | ESP32 Response               | Serial Output                                                     | Purpose                     |
| ---------------------------- | --------------------------------- | ---------------------------- | ----------------------------------------------------------------- | --------------------------- |
| `ESP32:CALIBRATION_START`    | `M117 ESP32:CALIBRATION_START`    | Enter calibration mode       | `SYSTEM: Printer calibration started - entering calibration mode` | Printer calibration started |
| `ESP32:CALIBRATION_COMPLETE` | `M117 ESP32:CALIBRATION_COMPLETE` | Exit calibration mode        | `SYSTEM: Calibration completed successfully`                      | Calibration completed       |
| `ESP32:MAINTENANCE_MODE`     | `M117 ESP32:MAINTENANCE_MODE`     | Enter maintenance monitoring | `SYSTEM: Maintenance mode activated - monitoring disabled`        | Maintenance mode active     |
| `ESP32:SYSTEM_CHECK`         | `M117 ESP32:SYSTEM_CHECK`         | Perform system validation    | `SYSTEM: Performing system health check`                          | System health check         |

## Part 2: Bambu Printer State Monitoring

### MQTT Message Structure

#### Primary Status Topic: `device/{serial}/report`

```json
{
  "print": {
    "gcode_state": "IDLE|RUNNING|PAUSED|FINISHED|CANCELLED|ERROR",
    "print_error": 0,
    "print_type": "local|cloud",
    "total_layer_num": 250,
    "layer_num": 125,
    "msg": "ESP32:STARTING_PURGE",
    "mc_percent": 50,
    "mc_remaining_time": 1800
  },
  "ams": {
    "ams_status": 0,
    "ams_rfid_status": 6,
    "tray": [
      {
        "id": "1",
        "tray_type": "PLA",
        "remain": 85,
        "tag_uid": "F123456789ABCDEF",
        "tray_now": true
      }
    ]
  },
  "hms": [
    {
      "code": "HMS_0300_0D00_0001_0003",
      "severity": "ERROR",
      "msg": "Build plate not placed properly"
    }
  ],
  "upgrade": {
    "status": "idle|downloading|installing",
    "progress": 0
  }
}
```

### Critical State Monitoring

#### Print States (`gcode_state`)

| State       | Description                  | ESP32 Action       | User Alert Level | Serial Output                                                    |
| ----------- | ---------------------------- | ------------------ | ---------------- | ---------------------------------------------------------------- |
| `IDLE`      | Printer ready, no job        | Normal monitoring  | None             | `PRINT_STATE: Printer idle - ready for new job`                  |
| `RUNNING`   | Print in progress            | Active monitoring  | None             | `PRINT_STATE: Print in progress - monitoring active`             |
| `PAUSED`    | Print paused                 | Pause monitoring   | Medium           | `PRINT_STATE: Print paused - entering pause monitoring mode`     |
| `FINISHED`  | Print completed successfully | Log completion     | Low              | `PRINT_STATE: Print completed successfully - logging completion` |
| `CANCELLED` | Print cancelled              | Log cancellation   | Medium           | `PRINT_STATE: Print cancelled - logging cancellation`            |
| `ERROR`     | Print error occurred         | Parse error, alert | **HIGH**         | `ERROR: Print error occurred - initiating error handling`        |

#### Print Errors (`print_error`)

| Error Code | Description            | ESP32 Response           | Alert Level  | User Action          |
| ---------- | ---------------------- | ------------------------ | ------------ | -------------------- |
| 0          | No error               | Continue monitoring      | None         | None                 |
| 1          | Filament runout        | Alert + pause monitoring | **CRITICAL** | Replace filament     |
| 2          | Heating failed         | Alert + error mode       | **CRITICAL** | Check heating system |
| 3          | Bed leveling failed    | Alert + error mode       | **HIGH**     | Re-level bed         |
| 4          | Nozzle clog detected   | Alert + error mode       | **HIGH**     | Clean nozzle         |
| 5          | Layer adhesion failure | Alert + error mode       | **MEDIUM**   | Check first layer    |
| 99         | Unknown error          | Alert + error mode       | **HIGH**     | Check printer status |

### HMS (Health Monitoring System) Error Categories

#### Critical Errors (Immediate User Alert)

| HMS Code Pattern          | Category           | Description              | ESP32 Response         | Alert Priority |
| ------------------------- | ------------------ | ------------------------ | ---------------------- | -------------- |
| `HMS_03xx_xxxx_xxxx_xxxx` | Temperature System | Heating/cooling failures | Stop monitoring, alert | **CRITICAL**   |
| `HMS_05xx_xxxx_xxxx_xxxx` | Communication      | MQTT/network issues      | Connection recovery    | **HIGH**       |
| `HMS_07xx_xxxx_xxxx_xxxx` | Motion System      | Motor/movement errors    | Alert + diagnostics    | **HIGH**       |
| `HMS_0Cxx_xxxx_xxxx_xxxx` | First Layer        | Print quality issues     | Alert + monitoring     | **MEDIUM**     |
| `HMS_12xx_xxxx_xxxx_xxxx` | Filament System    | AMS/feeding problems     | Alert + AMS check      | **HIGH**       |

#### Specific Critical HMS Codes

| HMS Code                  | Description                      | ESP32 Action     | User Alert   | Recovery         |
| ------------------------- | -------------------------------- | ---------------- | ------------ | ---------------- |
| `HMS_0300_0100_0001_000A` | Heatbed temperature abnormal     | Emergency alert  | **CRITICAL** | Power cycle      |
| `HMS_0300_0D00_0001_0003` | Build plate not placed           | Alert + pause    | **HIGH**     | Check bed        |
| `HMS_0500_0500_0001_0007` | MQTT command verification failed | Connection retry | **MEDIUM**   | Update firmware  |
| `HMS_0700_0400_0001_0001` | X-axis motor error               | Emergency stop   | **CRITICAL** | Service required |
| `HMS_1200_0100_0001_0001` | AMS filament sensor error        | AMS diagnostics  | **HIGH**     | Check AMS        |

### AMS (Automatic Material System) Monitoring

#### AMS Status Codes (`ams_status`)

| Status | Description        | ESP32 Response          | Alert Level |
| ------ | ------------------ | ----------------------- | ----------- |
| 0      | Normal operation   | Continue monitoring     | None        |
| 1      | Filament loading   | Track loading process   | Low         |
| 2      | Filament unloading | Track unloading process | Low         |
| 3      | Filament jammed    | Alert + error mode      | **HIGH**    |
| 4      | RFID read error    | Alert + AMS check       | **MEDIUM**  |
| 5      | Humidity too high  | Alert + maintenance     | **MEDIUM**  |

#### Filament Monitoring

```json
{
  "tray": {
    "id": "1",
    "tray_type": "PLA",
    "remain": 15, // <-- Monitor for low filament
    "tag_uid": "F123456789ABCDEF",
    "tray_now": true
  }
}
```

#### Filament Level Alerts

| Remaining (%) | Alert Level  | ESP32 Action      | Serial Output                                             |
| ------------- | ------------ | ----------------- | --------------------------------------------------------- |
| >50%          | None         | Normal monitoring | `AMS: Filament level normal - {X}% remaining`             |
| 20-50%        | Low          | Log status        | `AMS: Filament level low - {X}% remaining`                |
| 5-20%         | Medium       | Alert user        | `WARNING: Filament level critical - {X}% remaining`       |
| <5%           | **HIGH**     | Urgent alert      | `ALERT: Filament nearly empty - {X}% remaining`           |
| 0%            | **CRITICAL** | Emergency alert   | `CRITICAL: Filament empty - immediate attention required` |

## Part 3: Alert System Specification

### Alert Levels & Responses

#### CRITICAL Alerts (Immediate Action Required)

- **Triggers**: Temperature failures, filament runout, motor errors
- **ESP32 Response**: `CRITICAL:` serial output + MQTT emergency message
- **User Notification**: Push notification + email + SMS
- **Auto-Recovery**: None - requires manual intervention

#### HIGH Alerts (Prompt Action Needed)

- **Triggers**: Layer failures, AMS errors, bed leveling issues
- **ESP32 Response**: `ALERT:` serial output + MQTT alert message
- **User Notification**: Push notification + email
- **Auto-Recovery**: Attempt automatic recovery once

#### MEDIUM Alerts (Attention Recommended)

- **Triggers**: Low filament, connectivity issues, maintenance due
- **ESP32 Response**: `WARNING:` serial output + MQTT info message
- **User Notification**: Push notification
- **Auto-Recovery**: Continue monitoring, attempt resolution

#### LOW Alerts (Informational)

- **Triggers**: Print completion, calibration complete, status changes
- **ESP32 Response**: `INFO:` serial output + MQTT log message
- **User Notification**: Dashboard update only
- **Auto-Recovery**: N/A

### MQTT Alert Message Format

```json
{
  "alert": {
    "timestamp": 1640995200,
    "device_id": "ESP32_MAC_ADDRESS",
    "alert_level": "CRITICAL|HIGH|MEDIUM|LOW",
    "category": "PRINT|HARDWARE|FILAMENT|TEMPERATURE|COMMUNICATION",
    "code": "HMS_0300_0100_0001_000A",
    "message": "Heatbed temperature abnormal - AC board may be broken",
    "printer_state": {
      "gcode_state": "ERROR",
      "print_error": 2,
      "current_layer": 45,
      "total_layers": 250
    },
    "suggested_action": "Power cycle printer and check heatbed connections",
    "auto_recovery_attempted": false,
    "user_ack_required": true
  }
}
```

## Part 4: Implementation Requirements

### ESP32 Firmware Requirements

#### Command Processing

```cpp
void processExtendedM117Command(String command) {
    if (command.startsWith("ESP32:MATERIAL_CHANGE:")) {
        // Parse: ESP32:MATERIAL_CHANGE:PLA:PETG
        String materials = command.substring(23);
        int colonPos = materials.indexOf(':');
        String oldMat = materials.substring(0, colonPos);
        String newMat = materials.substring(colonPos + 1);
        handleMaterialChange(oldMat, newMat);
    }
    else if (command.startsWith("ESP32:ERROR_DETECTED:")) {
        String errorCode = command.substring(21);
        handleErrorDetected(errorCode);
    }
    // ... handle other commands
}
```

#### State Monitoring

```cpp
void monitorPrinterState(JsonDocument& report) {
    String gcodeState = report["print"]["gcode_state"];
    int printError = report["print"]["print_error"];

    // Check for critical states
    if (gcodeState == "ERROR" || printError != 0) {
        handlePrintError(printError);
    }

    // Monitor AMS status
    if (report["ams"]["ams_status"] != 0) {
        handleAMSError(report["ams"]["ams_status"]);
    }

    // Check HMS errors
    JsonArray hmsArray = report["hms"];
    for (JsonVariant hms : hmsArray) {
        handleHMSError(hms["code"], hms["severity"], hms["msg"]);
    }

    // Monitor filament levels
    JsonArray trays = report["ams"]["tray"];
    for (JsonVariant tray : trays) {
        monitorFilamentLevel(tray["id"], tray["remain"]);
    }
}
```

### G-code Processor Requirements

#### Command Injection Points

1. **Print Start**: Inject `ESP32:PRINT_START` after initial setup
2. **Layer Changes**: Inject `ESP32:LAYER_CHANGE:N` at layer transitions
3. **Filament Changes**: Enhanced sequence with material info
4. **Error Recovery**: Inject recovery commands during error handling
5. **Print End**: Inject completion/cancellation commands

#### Configuration Extensions

```json
{
  "esp32_commands": {
    "extended_commands": true,
    "material_tracking": true,
    "error_recovery": true,
    "valve_control": true,
    "alert_integration": true
  },
  "alert_thresholds": {
    "low_filament_percent": 20,
    "critical_filament_percent": 5,
    "max_error_retry": 3,
    "alert_timeout_seconds": 300
  }
}
```

### Host Application Requirements

#### Alert Processing Service

```python
class AlertProcessor:
    def process_esp32_alert(self, alert_data):
        alert_level = alert_data['alert']['alert_level']

        if alert_level == 'CRITICAL':
            self.send_emergency_notifications(alert_data)
            self.log_critical_event(alert_data)
        elif alert_level == 'HIGH':
            self.send_priority_notifications(alert_data)
            self.attempt_auto_recovery(alert_data)
        # ... handle other levels

    def send_emergency_notifications(self, alert_data):
        # Send push notification
        # Send email alert
        # Send SMS if configured
        # Update dashboard with emergency banner
```

## Part 5: Testing & Validation

### Command Testing Matrix

| Command Category  | Test Scenarios           | Expected ESP32 Response             | Validation Criteria         |
| ----------------- | ------------------------ | ----------------------------------- | --------------------------- |
| Waste Management  | Complete filament change | Proper LED sequence + valve control | Sequence timing within 5%   |
| Error Handling    | Simulated print errors   | Appropriate alert level + recovery  | Alert sent within 5 seconds |
| State Monitoring  | Various printer states   | Correct LED indication              | State changes tracked       |
| Material Tracking | Multi-material prints    | Accurate material colors            | Color matches material      |

### Integration Testing

1. **End-to-End Print Test**: Complete multi-material print with all commands
2. **Error Simulation**: Inject various error conditions and verify responses
3. **Network Failure Test**: Verify behavior during connectivity issues
4. **Recovery Testing**: Validate automatic and manual recovery procedures
5. **Performance Testing**: Measure command processing latency (<100ms target)

This specification provides a comprehensive framework for ESP32 coordination and printer monitoring, enabling both efficient waste management and proactive user alerting for critical situations.
