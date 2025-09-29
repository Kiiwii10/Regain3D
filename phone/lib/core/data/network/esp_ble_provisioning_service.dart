import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:encrypt/encrypt.dart';
import 'package:flutter_reactive_ble/flutter_reactive_ble.dart';

import '../../../domain/entity/esp_device.dart';

/// Service used for simple one-at-a-time provisioning of ESP devices. It relies
/// solely on `flutter_reactive_ble` and a pre-shared key to discover devices
/// and push WiFi credentials.
abstract class EspBleProvisioningService {
  /// Scan for devices that advertise the ecosystem token derived from [psk].
  Stream<DiscoveredDevice> scanForDevices({required String psk});

  /// Stop an active scan.
  Future<void> stopScan();

  /// Provision the given [device] with WiFi [config]. The [psk] from
  /// [config.customConfig] is used to derive the AES key.
  Future<void> provisionDevice({
    required DiscoveredDevice device,
    required ProvisioningConfig config,
    Duration timeout,
  });

  Stream<ProvisioningResult> get provisioningResults;
  Future<bool> isProvisioningActive();
  void dispose();
}

class EspBleProvisioningServiceImpl implements EspBleProvisioningService {
  EspBleProvisioningServiceImpl();

  final FlutterReactiveBle _ble = FlutterReactiveBle();
  final StreamController<DiscoveredDevice> _scanController =
      StreamController<DiscoveredDevice>.broadcast();
  final StreamController<ProvisioningResult> _provController =
      StreamController<ProvisioningResult>.broadcast();

  StreamSubscription<DiscoveredDevice>? _scanSub;
  bool _isProvisioning = false;

  static const int _companyId = 0xFFFF;
  static final Uuid _serviceUuid =
      Uuid.parse('3d9a5f12-8e3b-4c7a-9f2e-1b4d6e8f0a2c');
  static final Uuid _wifiCharUuid =
      Uuid.parse('3d9a5f14-8e3b-4c7a-9f2e-1b4d6e8f0a2c');

  @override
  Stream<DiscoveredDevice> scanForDevices({required String psk}) {
    final expectedToken = sha256.convert(utf8.encode(psk)).bytes.sublist(0, 8);
    _scanSub?.cancel();
    _scanSub = _ble
        .scanForDevices(
          withServices: const [],
          scanMode: ScanMode.balanced,
          requireLocationServicesEnabled: true,
        )
        .listen((device) {
      final data = device.manufacturerData;
      if (data.length >= 2 + expectedToken.length) {
        final advCompanyId = data[0] | (data[1] << 8);
        if (advCompanyId == _companyId) {
          final advToken = data.sublist(2, 2 + expectedToken.length);
          if (_listEquals(advToken, expectedToken)) {
            _scanController.add(device);
          }
        }
      }
    });
    return _scanController.stream;
  }

  @override
  Future<void> stopScan() async {
    await _scanSub?.cancel();
  }

  @override
  Stream<ProvisioningResult> get provisioningResults =>
      _provController.stream;

  @override
  Future<bool> isProvisioningActive() async => _isProvisioning;

  @override
  void dispose() {
    _scanSub?.cancel();
    _scanController.close();
    _provController.close();
  }

  @override
  Future<void> provisionDevice({
    required DiscoveredDevice device,
    required ProvisioningConfig config,
    Duration timeout = const Duration(seconds: 30),
  }) async {
    if (_isProvisioning) {
      throw Exception('Provisioning is already in progress');
    }
    _isProvisioning = true;

    final psk = config.customConfig?['psk'] as String? ?? '';

    try {
      await _ble
          .connectToDevice(id: device.id, connectionTimeout: timeout)
          .first;

      final keyBytes =
          Uint8List.fromList(sha256.convert(utf8.encode(psk + 'KEY')).bytes);
      final ivBytes = Uint8List.fromList(
          sha256.convert(utf8.encode(psk + 'IV')).bytes.sublist(0, 16));

      final encrypter =
          Encrypter(AES(Key(keyBytes), mode: AESMode.cbc, padding: 'PKCS7'));
      final iv = IV(ivBytes);

      final payload =
          utf8.encode(jsonEncode({'ssid': config.ssid, 'password': config.password}));
      final encrypted = encrypter.encryptBytes(payload, iv: iv);

      final wifiChar = QualifiedCharacteristic(
        deviceId: device.id,
        serviceId: _serviceUuid,
        characteristicId: _wifiCharUuid,
      );

      await _ble.writeCharacteristicWithResponse(wifiChar,
          value: encrypted.bytes);

      final espDevice = EspDevice(
        id: device.id,
        deviceName: device.name,
        macAddress: device.id,
        status: EspDeviceStatus.provisioned(
          networkName: config.ssid,
          ipAddress: '',
        ),
        firmwareInfo: const EspFirmwareInfo(
          version: 'unknown',
          supportedSignatures: [],
          isVerified: false,
        ),
      );

      _provController.add(ProvisioningResult.success(
        device: espDevice,
        networkName: config.ssid,
        ipAddress: '',
      ));
    } catch (e) {
      _provController.add(ProvisioningResult.failure(
        deviceId: device.id,
        error: e.toString(),
        failedStep: ProvisioningStep.connecting,
      ));
    } finally {
      _isProvisioning = false;
    }
  }

  bool _listEquals(List<int> a, List<int> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}
