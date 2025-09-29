import 'package:freezed_annotation/freezed_annotation.dart';

part 'esp_device.freezed.dart';
part 'esp_device.g.dart';

@freezed
class EspDevice with _$EspDevice {
  const factory EspDevice({
    required String id,
    required String deviceName,
    required String macAddress,
    String? ipAddress,
    required EspDeviceStatus status,
    required EspFirmwareInfo firmwareInfo,
    String? assignedPrinterId,
    DateTime? lastSeen,
    DateTime? provisionedAt,
    Map<String, dynamic>? config,
  }) = _EspDevice;

  factory EspDevice.fromJson(Map<String, dynamic> json) =>
      _$EspDeviceFromJson(json);
}

@freezed
class EspFirmwareInfo with _$EspFirmwareInfo {
  const factory EspFirmwareInfo({
    required String version,
    required List<String> supportedSignatures,
    required bool isVerified,
    String? signature,
    DateTime? lastUpdate,
  }) = _EspFirmwareInfo;

  factory EspFirmwareInfo.fromJson(Map<String, dynamic> json) =>
      _$EspFirmwareInfoFromJson(json);
}

@freezed
class EspDeviceStatus with _$EspDeviceStatus {
  const factory EspDeviceStatus.discovered() = Discovered;
  const factory EspDeviceStatus.connecting() = Connecting;
  const factory EspDeviceStatus.connected() = Connected;
  const factory EspDeviceStatus.provisioning() = Provisioning;
  const factory EspDeviceStatus.provisioned({
    required String networkName,
    required String ipAddress,
  }) = Provisioned;
  const factory EspDeviceStatus.error({
    required String message,
  }) = Error;
  const factory EspDeviceStatus.offline() = Offline;

  factory EspDeviceStatus.fromJson(Map<String, dynamic> json) =>
      _$EspDeviceStatusFromJson(json);
}

@freezed
class BleScanResult with _$BleScanResult {
  const factory BleScanResult({
    required String deviceId,
    required String deviceName,
    required int rssi,
    required Map<String, dynamic> manufacturerData,
    required List<String> serviceUuids,
    DateTime? lastSeen,
  }) = _BleScanResult;

  factory BleScanResult.fromJson(Map<String, dynamic> json) =>
      _$BleScanResultFromJson(json);
}

@freezed
class ProvisioningConfig with _$ProvisioningConfig {
  const factory ProvisioningConfig({
    required String ssid,
    required String password,
    required String devicePrefix,
    Map<String, dynamic>? customConfig,
    List<String>? allowedSignatures,
  }) = _ProvisioningConfig;

  factory ProvisioningConfig.fromJson(Map<String, dynamic> json) =>
      _$ProvisioningConfigFromJson(json);
}

@freezed
class ProvisioningResult with _$ProvisioningResult {
  const factory ProvisioningResult.success({
    required EspDevice device,
    required String networkName,
    required String ipAddress,
  }) = ProvisioningSuccess;

  const factory ProvisioningResult.failure({
    required String deviceId,
    required String error,
    required ProvisioningStep failedStep,
  }) = ProvisioningFailure;

  factory ProvisioningResult.fromJson(Map<String, dynamic> json) =>
      _$ProvisioningResultFromJson(json);
}

enum ProvisioningStep {
  scanning,
  connecting,
  handshake,
  verifyingSignature,
  sendingCredentials,
  confirmingConnection,
}
