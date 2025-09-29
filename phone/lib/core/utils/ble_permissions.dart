import 'dart:io';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_reactive_ble/flutter_reactive_ble.dart';
import 'package:permission_handler/permission_handler.dart';

class BlePermissionsHelper {
  static Future<bool> checkAndRequestBluetoothPermissions(BuildContext context) async {
    final reactiveBle = FlutterReactiveBle();
    try {
      final status = await reactiveBle.statusStream.first;
      if (status == BleStatus.unsupported) {
        _showErrorDialog(
          context,
          'Bluetooth Not Supported',
          'Bluetooth LE is not available on this device.',
          showSettings: false,
        );
        return false;
      }

      if (Platform.isAndroid) {
        return await _handleAndroidPermissions(context, reactiveBle);
      } else if (Platform.isIOS) {
        return await _handleIOSPermissions(context, reactiveBle);
      }

      return false;
    } catch (e) {
      debugPrint('Permission check error: $e');
      return false;
    }
  }

  static Future<bool> _handleAndroidPermissions(
      BuildContext context, FlutterReactiveBle ble) async {
    final androidInfo = await DeviceInfoPlugin().androidInfo;
    final sdkInt = androidInfo.version.sdkInt;

    Map<Permission, PermissionStatus> statuses = {};

    if (sdkInt >= 31) {
      statuses = await [
        Permission.bluetoothScan,
        Permission.bluetoothConnect,
        Permission.bluetoothAdvertise,
        Permission.location,
      ].request();
    } else {
      statuses = await [
        Permission.bluetooth,
        Permission.location,
      ].request();
    }

    // Ensure Location Services are enabled (Android requirement for BLE scanning on many devices)
    final locationService = await Permission.location.serviceStatus;
    final locationServicesEnabled = locationService == ServiceStatus.enabled;

    final allGranted = statuses.values.every((s) => s == PermissionStatus.granted);

    if (!allGranted || !locationServicesEnabled) {
      final permanentlyDenied = statuses.values.any((s) => s == PermissionStatus.permanentlyDenied);

      if (!locationServicesEnabled) {
        _showPermissionDialog(
          context,
          'Location Services Off',
          'Location services must be enabled to scan for BLE devices. Please turn them on.',
          showOpenSettings: true,
        );
        return false;
      }

      if (permanentlyDenied) {
        _showPermissionDialog(
          context,
          'Permissions Required',
          'Bluetooth and location permissions are required to scan for ESP32 devices. Please enable them in Settings.',
          showOpenSettings: true,
        );
      } else {
        _showPermissionDialog(
          context,
          'Permissions Denied',
          'This app needs Bluetooth and location permissions to scan for devices.',
          showOpenSettings: false,
        );
      }
      return false;
    }

    final status = await ble.statusStream.first;
    if (status != BleStatus.ready) {
      _showBluetoothDisabledDialog(context);
      return false;
    }

    return true;
  }

  static Future<bool> _handleIOSPermissions(
      BuildContext context, FlutterReactiveBle ble) async {
    final bluetoothStatus = await Permission.bluetooth.request();

    if (bluetoothStatus != PermissionStatus.granted) {
      if (bluetoothStatus == PermissionStatus.permanentlyDenied) {
        _showPermissionDialog(
          context,
          'Bluetooth Permission Required',
          'Please enable Bluetooth access for this app in Settings.',
          showOpenSettings: true,
        );
      } else {
        _showPermissionDialog(
          context,
          'Bluetooth Access Denied',
          'This app needs Bluetooth access to scan for ESP32 devices.',
          showOpenSettings: false,
        );
      }
      return false;
    }

    final status = await ble.statusStream.first;
    if (status != BleStatus.ready) {
      _showBluetoothDisabledDialog(context);
      return false;
    }

    return true;
  }

  static void _showBluetoothDisabledDialog(BuildContext context) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) => AlertDialog(
        icon: Icon(
          Icons.bluetooth_disabled_rounded,
          color: Theme.of(context).colorScheme.error,
          size: 48,
        ),
        title: const Text('Bluetooth is Off'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Please turn on Bluetooth to scan for ESP32 devices.',
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 8),
            Text(
              'You can enable it from the Control Center or Settings.',
              style: TextStyle(fontSize: 12),
              textAlign: TextAlign.center,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(context).pop();
              openAppSettings();
            },
            child: const Text('Open Settings'),
          ),
        ],
      ),
    );
  }

  static void _showPermissionDialog(
    BuildContext context,
    String title,
    String message, {
    required bool showOpenSettings,
  }) {
    showDialog(
      context: context,
      builder: (BuildContext context) => AlertDialog(
        icon: Icon(
          Icons.lock_rounded,
          color: Theme.of(context).colorScheme.error,
          size: 48,
        ),
        title: Text(title),
        content: Text(
          message,
          textAlign: TextAlign.center,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          if (showOpenSettings)
            FilledButton(
              onPressed: () {
                Navigator.of(context).pop();
                openAppSettings();
              },
              child: const Text('Open Settings'),
            ),
        ],
      ),
    );
  }

  static void _showErrorDialog(
    BuildContext context,
    String title,
    String message, {
    bool showSettings = false,
  }) {
    showDialog(
      context: context,
      builder: (BuildContext context) => AlertDialog(
        icon: Icon(
          Icons.error_rounded,
          color: Theme.of(context).colorScheme.error,
          size: 48,
        ),
        title: Text(title),
        content: Text(
          message,
          textAlign: TextAlign.center,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
          if (showSettings)
            FilledButton(
              onPressed: () {
                Navigator.of(context).pop();
                openAppSettings();
              },
              child: const Text('Open Settings'),
            ),
        ],
      ),
    );
  }
}

