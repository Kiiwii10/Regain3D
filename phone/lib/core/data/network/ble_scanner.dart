import 'package:flutter_reactive_ble/flutter_reactive_ble.dart';

/// Minimal BLE scanner wrapper used by provisioning to discover devices
/// broadcasting manufacturer data. Backed by `flutter_reactive_ble`.
class BleScanner {
  BleScanner({FlutterReactiveBle? ble}) : _ble = ble ?? FlutterReactiveBle();

  final FlutterReactiveBle _ble;

  /// Starts scanning and emits all discovered devices. Consumers may filter
  /// by `manufacturerData` or other fields as needed.
  Stream<DiscoveredDevice> scanForUnprovisionedNodes() {
    return _ble.scanForDevices(
      withServices: const [],
      scanMode: ScanMode.balanced,
      requireLocationServicesEnabled: true,
    );
  }
}

