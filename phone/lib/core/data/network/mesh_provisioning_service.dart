import 'dart:async';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_reactive_ble/flutter_reactive_ble.dart';

import '../../../domain/entity/esp_device.dart';
import 'esp_ble_provisioning_service.dart';

enum MeshProvisioningStatus { idle, provisioning, completed, error }

/// High level provisioning service that wraps the low level
/// [EspBleProvisioningService] and exposes provisioning status updates
/// alongside provisioning results.
class MeshProvisioningService {
  final _statusController = StreamController<MeshProvisioningStatus>.broadcast();
  final EspBleProvisioningService _bleService = EspBleProvisioningServiceImpl();

  Stream<MeshProvisioningStatus> get statusStream => _statusController.stream;
  Stream<ProvisioningResult> get provisioningResults =>
      _bleService.provisioningResults;

  /// Expose scanning stream so the UI can maintain a list of nearby devices.
  Stream<DiscoveredDevice> scanForDevices(String psk) =>
      _bleService.scanForDevices(psk: psk);

  Future<void> stopScan() => _bleService.stopScan();

  Future<void> startProvisioning(
    String ssid,
    String password,
    DiscoveredDevice device,
    String psk,
  ) async {
    _statusController.add(MeshProvisioningStatus.provisioning);

    // Build provisioning config using stored device prefix
    final prefs = await SharedPreferences.getInstance();
    final prefix = prefs.getString('device_prefix') ?? 'Regain3D';
    final config = ProvisioningConfig(
      ssid: ssid,
      password: password,
      devicePrefix: prefix,
      customConfig: {'psk': psk},
    );

    // Listen for completion events to update status
    late final StreamSubscription<ProvisioningResult> sub;
    sub = provisioningResults.listen((result) {
      result.when(
        success: (_, __, ___) {
          _statusController.add(MeshProvisioningStatus.completed);
        },
        failure: (_, __, ___) {
          _statusController.add(MeshProvisioningStatus.error);
        },
      );
    });

    try {
      await _bleService.provisionDevice(device: device, config: config);
    } finally {
      await sub.cancel();
    }
  }

  Future<void> stopProvisioning() async {
    _statusController.add(MeshProvisioningStatus.idle);
  }

  void dispose() {
    _bleService.dispose();
    _statusController.close();
  }
}
