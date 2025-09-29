import 'package:regain3d_provisioner/domain/entity/esp_device.dart';

abstract class EspProvisioningRepository {
  Future<void> startScan({
    Duration timeout = const Duration(seconds: 30),
    List<String>? allowedSignatures,
  });
  Future<void> stopScan();
  Stream<List<BleScanResult>> get scanResults;
  Future<ProvisioningResult> provisionDevice({
    required String deviceId,
    required ProvisioningConfig config,
  });
  Future<EspDevice?> getDeviceInfo(String deviceId);
  Future<List<EspDevice>> getProvisionedDevices();
  Future<void> removeDevice(String deviceId);
  Future<bool> verifyFirmwareSignature(String deviceId);
  Future<void> saveProvisioningConfig(ProvisioningConfig config);
  Future<ProvisioningConfig?> getSavedProvisioningConfig();
  Future<void> saveDevice(EspDevice device);
  Future<void> updateDeviceStatus(String deviceId, EspDeviceStatus status);
}

class EspProvisioningRepositoryImpl implements EspProvisioningRepository {
  final EspBleProvisioningService _provisioningService;
  final LocalStorageService _storageService;

  EspProvisioningRepositoryImpl({
    required EspBleProvisioningService provisioningService,
    required LocalStorageService storageService,
  })  : _provisioningService = provisioningService,
        _storageService = storageService;

  @override
  Future<void> startScan({
    Duration timeout = const Duration(seconds: 30),
    List<String>? allowedSignatures,
  }) async {
    await _provisioningService.startScan(
      timeout: timeout,
      allowedSignatures: allowedSignatures,
    );
  }

  @override
  Future<void> stopScan() async {
    await _provisioningService.stopScan();
  }

  @override
  Stream<List<BleScanResult>> get scanResults => _provisioningService.scanResults;

  @override
  Future<ProvisioningResult> provisionDevice({
    required String deviceId,
    required ProvisioningConfig config,
  }) async {
    final result = await _provisioningService.provisionDevice(
      deviceId: deviceId,
      config: config,
    );

    // Save successful provisioning
    if (result is ProvisioningSuccess) {
      await saveDevice(result.device);
    }

    return result;
  }

  @override
  Future<EspDevice?> getDeviceInfo(String deviceId) async {
    // Try to get from service first
    final device = await _provisioningService.getDeviceInfo(deviceId);
    if (device != null) {
      return device;
    }

    // Fallback to local storage
    return await _storageService.getDevice(deviceId);
  }

  @override
  Future<List<EspDevice>> getProvisionedDevices() async {
    return await _storageService.getAllDevices();
  }

  @override
  Future<void> removeDevice(String deviceId) async {
    await _storageService.removeDevice(deviceId);
    await _provisioningService.disconnectDevice(deviceId);
  }

  @override
  Future<bool> verifyFirmwareSignature(String deviceId) async {
    return await _provisioningService.verifyFirmwareSignature(deviceId);
  }

  @override
  Future<void> saveProvisioningConfig(ProvisioningConfig config) async {
    await _storageService.saveProvisioningConfig(config);
  }

  @override
  Future<ProvisioningConfig?> getSavedProvisioningConfig() async {
    return await _storageService.getProvisioningConfig();
  }

  @override
  Future<void> saveDevice(EspDevice device) async {
    await _storageService.saveDevice(device);
  }

  @override
  Future<void> updateDeviceStatus(String deviceId, EspDeviceStatus status) async {
    await _storageService.updateDeviceStatus(deviceId, status);
  }
}
