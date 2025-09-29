import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sembast/sembast_io.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;
import '../../../domain/entity/esp_device.dart';

abstract class LocalStorageService {
  Future<void> saveDevice(EspDevice device);
  Future<EspDevice?> getDevice(String deviceId);
  Future<List<EspDevice>> getAllDevices();
  Future<void> removeDevice(String deviceId);
  Future<void> updateDeviceStatus(String deviceId, EspDeviceStatus status);
  Future<void> saveProvisioningConfig(ProvisioningConfig config);
  Future<ProvisioningConfig?> getProvisioningConfig();
  Future<void> saveScanSettings(ScanSettings settings);
  Future<ScanSettings?> getScanSettings();
}

class ScanSettings {
  final Duration scanTimeout;
  final List<String> allowedSignatures;
  final bool autoConnect;

  const ScanSettings({
    this.scanTimeout = const Duration(seconds: 30),
    this.allowedSignatures = const [],
    this.autoConnect = false,
  });

  factory ScanSettings.fromJson(Map<String, dynamic> json) {
    return ScanSettings(
      scanTimeout: Duration(seconds: json['scanTimeoutSeconds'] ?? 30),
      allowedSignatures: List<String>.from(json['allowedSignatures'] ?? []),
      autoConnect: json['autoConnect'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'scanTimeoutSeconds': scanTimeout.inSeconds,
      'allowedSignatures': allowedSignatures,
      'autoConnect': autoConnect,
    };
  }
}

class LocalStorageServiceImpl implements LocalStorageService {
  static const String _devicesStoreName = 'esp_devices';
  static const String _configStoreName = 'provisioning_config';
  static const String _settingsStoreName = 'scan_settings';

  late final Database _database;
  late final StoreRef<String, Map<String, dynamic>> _devicesStore;
  late final StoreRef<String, Map<String, dynamic>> _configStore;
  late final StoreRef<String, Map<String, dynamic>> _settingsStore;
  late final SharedPreferences _prefs;

  bool _isInitialized = false;

  LocalStorageServiceImpl() {
    _devicesStore = StoreRef<String, Map<String, dynamic>>(_devicesStoreName);
    _configStore = StoreRef<String, Map<String, dynamic>>(_configStoreName);
    _settingsStore = StoreRef<String, Map<String, dynamic>>(_settingsStoreName);
  }

  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      // Initialize SharedPreferences
      _prefs = await SharedPreferences.getInstance();

      // Initialize Sembast database
      final appDir = await getApplicationDocumentsDirectory();
      final dbPath = path.join(appDir.path, 'regain3d_provisioner.db');
      _database = await databaseFactoryIo.openDatabase(dbPath);

      _isInitialized = true;
    } catch (e) {
      throw Exception('Failed to initialize local storage: $e');
    }
  }

  Future<void> _ensureInitialized() async {
    if (!_isInitialized) {
      await initialize();
    }
  }

  @override
  Future<void> saveDevice(EspDevice device) async {
    await _ensureInitialized();

    try {
      final deviceJson = device.toJson();
      await _devicesStore.record(device.id).put(_database, deviceJson);
    } catch (e) {
      throw Exception('Failed to save device: $e');
    }
  }

  @override
  Future<EspDevice?> getDevice(String deviceId) async {
    await _ensureInitialized();

    try {
      final deviceJson = await _devicesStore.record(deviceId).get(_database);
      if (deviceJson == null) return null;

      return EspDevice.fromJson(deviceJson);
    } catch (e) {
      throw Exception('Failed to get device: $e');
    }
  }

  @override
  Future<List<EspDevice>> getAllDevices() async {
    await _ensureInitialized();

    try {
      final devicesJson = await _devicesStore.find(_database);
      return devicesJson
          .map((record) => EspDevice.fromJson(record.value))
          .toList();
    } catch (e) {
      throw Exception('Failed to get all devices: $e');
    }
  }

  @override
  Future<void> removeDevice(String deviceId) async {
    await _ensureInitialized();

    try {
      await _devicesStore.record(deviceId).delete(_database);
    } catch (e) {
      throw Exception('Failed to remove device: $e');
    }
  }

  @override
  Future<void> updateDeviceStatus(String deviceId, EspDeviceStatus status) async {
    await _ensureInitialized();

    try {
      final existingDevice = await getDevice(deviceId);
      if (existingDevice == null) return;

      final updatedDevice = existingDevice.copyWith(
        status: status,
        lastSeen: DateTime.now(),
      );

      await saveDevice(updatedDevice);
    } catch (e) {
      throw Exception('Failed to update device status: $e');
    }
  }

  @override
  Future<void> saveProvisioningConfig(ProvisioningConfig config) async {
    await _ensureInitialized();

    try {
      final configJson = config.toJson();
      await _configStore.record('default').put(_database, configJson);

      // Also save to SharedPreferences for quick access
      await _prefs.setString('last_provisioning_config', jsonEncode(configJson));
    } catch (e) {
      throw Exception('Failed to save provisioning config: $e');
    }
  }

  @override
  Future<ProvisioningConfig?> getProvisioningConfig() async {
    await _ensureInitialized();

    try {
      // Try SharedPreferences first for quick access
      final savedConfigJson = _prefs.getString('last_provisioning_config');
      if (savedConfigJson != null) {
        final configMap = jsonDecode(savedConfigJson) as Map<String, dynamic>;
        return ProvisioningConfig.fromJson(configMap);
      }

      // Fallback to database
      final configJson = await _configStore.record('default').get(_database);
      if (configJson == null) return null;

      return ProvisioningConfig.fromJson(configJson);
    } catch (e) {
      throw Exception('Failed to get provisioning config: $e');
    }
  }

  @override
  Future<void> saveScanSettings(ScanSettings settings) async {
    await _ensureInitialized();

    try {
      final settingsJson = settings.toJson();
      await _settingsStore.record('default').put(_database, settingsJson);
    } catch (e) {
      throw Exception('Failed to save scan settings: $e');
    }
  }

  @override
  Future<ScanSettings?> getScanSettings() async {
    await _ensureInitialized();

    try {
      final settingsJson = await _settingsStore.record('default').get(_database);
      if (settingsJson == null) return null;

      return ScanSettings.fromJson(settingsJson);
    } catch (e) {
      throw Exception('Failed to get scan settings: $e');
    }
  }

  Future<void> clearAllData() async {
    await _ensureInitialized();

    try {
      await _devicesStore.drop(_database);
      await _configStore.drop(_database);
      await _settingsStore.drop(_database);
      await _prefs.clear();
    } catch (e) {
      throw Exception('Failed to clear all data: $e');
    }
  }

  void dispose() {
    _database.close();
  }
}
