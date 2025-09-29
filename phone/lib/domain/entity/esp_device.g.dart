// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'esp_device.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$EspDeviceImpl _$$EspDeviceImplFromJson(Map<String, dynamic> json) =>
    _$EspDeviceImpl(
      id: json['id'] as String,
      deviceName: json['deviceName'] as String,
      macAddress: json['macAddress'] as String,
      ipAddress: json['ipAddress'] as String?,
      status: EspDeviceStatus.fromJson(json['status'] as Map<String, dynamic>),
      firmwareInfo: EspFirmwareInfo.fromJson(
          json['firmwareInfo'] as Map<String, dynamic>),
      assignedPrinterId: json['assignedPrinterId'] as String?,
      lastSeen: json['lastSeen'] == null
          ? null
          : DateTime.parse(json['lastSeen'] as String),
      provisionedAt: json['provisionedAt'] == null
          ? null
          : DateTime.parse(json['provisionedAt'] as String),
      config: json['config'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$$EspDeviceImplToJson(_$EspDeviceImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'deviceName': instance.deviceName,
      'macAddress': instance.macAddress,
      'ipAddress': instance.ipAddress,
      'status': instance.status,
      'firmwareInfo': instance.firmwareInfo,
      'assignedPrinterId': instance.assignedPrinterId,
      'lastSeen': instance.lastSeen?.toIso8601String(),
      'provisionedAt': instance.provisionedAt?.toIso8601String(),
      'config': instance.config,
    };

_$EspFirmwareInfoImpl _$$EspFirmwareInfoImplFromJson(
        Map<String, dynamic> json) =>
    _$EspFirmwareInfoImpl(
      version: json['version'] as String,
      supportedSignatures: (json['supportedSignatures'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      isVerified: json['isVerified'] as bool,
      signature: json['signature'] as String?,
      lastUpdate: json['lastUpdate'] == null
          ? null
          : DateTime.parse(json['lastUpdate'] as String),
    );

Map<String, dynamic> _$$EspFirmwareInfoImplToJson(
        _$EspFirmwareInfoImpl instance) =>
    <String, dynamic>{
      'version': instance.version,
      'supportedSignatures': instance.supportedSignatures,
      'isVerified': instance.isVerified,
      'signature': instance.signature,
      'lastUpdate': instance.lastUpdate?.toIso8601String(),
    };

_$DiscoveredImpl _$$DiscoveredImplFromJson(Map<String, dynamic> json) =>
    _$DiscoveredImpl(
      $type: json['runtimeType'] as String?,
    );

Map<String, dynamic> _$$DiscoveredImplToJson(_$DiscoveredImpl instance) =>
    <String, dynamic>{
      'runtimeType': instance.$type,
    };

_$ConnectingImpl _$$ConnectingImplFromJson(Map<String, dynamic> json) =>
    _$ConnectingImpl(
      $type: json['runtimeType'] as String?,
    );

Map<String, dynamic> _$$ConnectingImplToJson(_$ConnectingImpl instance) =>
    <String, dynamic>{
      'runtimeType': instance.$type,
    };

_$ConnectedImpl _$$ConnectedImplFromJson(Map<String, dynamic> json) =>
    _$ConnectedImpl(
      $type: json['runtimeType'] as String?,
    );

Map<String, dynamic> _$$ConnectedImplToJson(_$ConnectedImpl instance) =>
    <String, dynamic>{
      'runtimeType': instance.$type,
    };

_$ProvisioningImpl _$$ProvisioningImplFromJson(Map<String, dynamic> json) =>
    _$ProvisioningImpl(
      $type: json['runtimeType'] as String?,
    );

Map<String, dynamic> _$$ProvisioningImplToJson(_$ProvisioningImpl instance) =>
    <String, dynamic>{
      'runtimeType': instance.$type,
    };

_$ProvisionedImpl _$$ProvisionedImplFromJson(Map<String, dynamic> json) =>
    _$ProvisionedImpl(
      networkName: json['networkName'] as String,
      ipAddress: json['ipAddress'] as String,
      $type: json['runtimeType'] as String?,
    );

Map<String, dynamic> _$$ProvisionedImplToJson(_$ProvisionedImpl instance) =>
    <String, dynamic>{
      'networkName': instance.networkName,
      'ipAddress': instance.ipAddress,
      'runtimeType': instance.$type,
    };

_$ErrorImpl _$$ErrorImplFromJson(Map<String, dynamic> json) => _$ErrorImpl(
      message: json['message'] as String,
      $type: json['runtimeType'] as String?,
    );

Map<String, dynamic> _$$ErrorImplToJson(_$ErrorImpl instance) =>
    <String, dynamic>{
      'message': instance.message,
      'runtimeType': instance.$type,
    };

_$OfflineImpl _$$OfflineImplFromJson(Map<String, dynamic> json) =>
    _$OfflineImpl(
      $type: json['runtimeType'] as String?,
    );

Map<String, dynamic> _$$OfflineImplToJson(_$OfflineImpl instance) =>
    <String, dynamic>{
      'runtimeType': instance.$type,
    };

_$BleScanResultImpl _$$BleScanResultImplFromJson(Map<String, dynamic> json) =>
    _$BleScanResultImpl(
      deviceId: json['deviceId'] as String,
      deviceName: json['deviceName'] as String,
      rssi: (json['rssi'] as num).toInt(),
      manufacturerData: json['manufacturerData'] as Map<String, dynamic>,
      serviceUuids: (json['serviceUuids'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      lastSeen: json['lastSeen'] == null
          ? null
          : DateTime.parse(json['lastSeen'] as String),
    );

Map<String, dynamic> _$$BleScanResultImplToJson(_$BleScanResultImpl instance) =>
    <String, dynamic>{
      'deviceId': instance.deviceId,
      'deviceName': instance.deviceName,
      'rssi': instance.rssi,
      'manufacturerData': instance.manufacturerData,
      'serviceUuids': instance.serviceUuids,
      'lastSeen': instance.lastSeen?.toIso8601String(),
    };

_$ProvisioningConfigImpl _$$ProvisioningConfigImplFromJson(
        Map<String, dynamic> json) =>
    _$ProvisioningConfigImpl(
      ssid: json['ssid'] as String,
      password: json['password'] as String,
      devicePrefix: json['devicePrefix'] as String,
      customConfig: json['customConfig'] as Map<String, dynamic>?,
      allowedSignatures: (json['allowedSignatures'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
    );

Map<String, dynamic> _$$ProvisioningConfigImplToJson(
        _$ProvisioningConfigImpl instance) =>
    <String, dynamic>{
      'ssid': instance.ssid,
      'password': instance.password,
      'devicePrefix': instance.devicePrefix,
      'customConfig': instance.customConfig,
      'allowedSignatures': instance.allowedSignatures,
    };

_$ProvisioningSuccessImpl _$$ProvisioningSuccessImplFromJson(
        Map<String, dynamic> json) =>
    _$ProvisioningSuccessImpl(
      device: EspDevice.fromJson(json['device'] as Map<String, dynamic>),
      networkName: json['networkName'] as String,
      ipAddress: json['ipAddress'] as String,
      $type: json['runtimeType'] as String?,
    );

Map<String, dynamic> _$$ProvisioningSuccessImplToJson(
        _$ProvisioningSuccessImpl instance) =>
    <String, dynamic>{
      'device': instance.device,
      'networkName': instance.networkName,
      'ipAddress': instance.ipAddress,
      'runtimeType': instance.$type,
    };

_$ProvisioningFailureImpl _$$ProvisioningFailureImplFromJson(
        Map<String, dynamic> json) =>
    _$ProvisioningFailureImpl(
      deviceId: json['deviceId'] as String,
      error: json['error'] as String,
      failedStep: $enumDecode(_$ProvisioningStepEnumMap, json['failedStep']),
      $type: json['runtimeType'] as String?,
    );

Map<String, dynamic> _$$ProvisioningFailureImplToJson(
        _$ProvisioningFailureImpl instance) =>
    <String, dynamic>{
      'deviceId': instance.deviceId,
      'error': instance.error,
      'failedStep': _$ProvisioningStepEnumMap[instance.failedStep]!,
      'runtimeType': instance.$type,
    };

const _$ProvisioningStepEnumMap = {
  ProvisioningStep.scanning: 'scanning',
  ProvisioningStep.connecting: 'connecting',
  ProvisioningStep.verifyingSignature: 'verifyingSignature',
  ProvisioningStep.sendingCredentials: 'sendingCredentials',
  ProvisioningStep.confirmingConnection: 'confirmingConnection',
};
