import 'dart:async';
import '../../../domain/entity/esp_device.dart';

abstract class EspSmartConfigService {
  Future<void> startProvisioning({
    required ProvisioningConfig config,
    Duration timeout = const Duration(seconds: 60),
  });
  Future<void> stopProvisioning();
  Stream<ProvisioningResult> get provisioningResults;
  Future<bool> isProvisioningActive();
  void dispose();
}

class EspSmartConfigServiceImpl implements EspSmartConfigService {
  final StreamController<ProvisioningResult> _provisioningController =
      StreamController<ProvisioningResult>.broadcast();


  bool _isProvisioning = false;

  @override
  Stream<ProvisioningResult> get provisioningResults => _provisioningController.stream;

  @override
  Future<void> startProvisioning({
    required ProvisioningConfig config,
    Duration timeout = const Duration(seconds: 60),
  }) async {
    if (_isProvisioning) {
      throw Exception('Provisioning is already in progress');
    }

    _isProvisioning = true;

    try {
      // Simulate SmartConfig provisioning process
      // This is a placeholder implementation - replace with actual ESPTouch API calls
      await Future.delayed(const Duration(seconds: 2));

      // Simulate successful provisioning of 1-3 devices
      final deviceCount = 1 + (DateTime.now().millisecondsSinceEpoch % 3);

      for (int i = 0; i < deviceCount; i++) {
        final deviceId = 'ESP32-SMART-${DateTime.now().millisecondsSinceEpoch + i}';
        final deviceName = '${config.devicePrefix}-${deviceId.substring(deviceId.length - 6)}';
        final ipAddress = '192.168.1.${100 + i}';

        final provisionedDevice = EspDevice(
          id: deviceId,
          deviceName: deviceName,
          macAddress: deviceId,
          ipAddress: ipAddress,
          status: EspDeviceStatus.provisioned(
            networkName: config.ssid,
            ipAddress: ipAddress,
          ),
          firmwareInfo: EspFirmwareInfo(
            version: 'SmartConfig-v1.0',
            supportedSignatures: ['SmartConfig-ESP32'],
            isVerified: true,
            signature: 'SmartConfig-ESP32',
            lastUpdate: DateTime.now(),
          ),
          provisionedAt: DateTime.now(),
          config: config.customConfig,
        );

        _provisioningController.add(
          ProvisioningResult.success(
            device: provisionedDevice,
            networkName: config.ssid,
            ipAddress: ipAddress,
          ),
        );

        // Small delay between device results
        await Future.delayed(const Duration(milliseconds: 500));
      }

    } catch (e) {
      _provisioningController.add(
        ProvisioningResult.failure(
          deviceId: 'unknown',
          error: 'SmartConfig provisioning failed: ${e.toString()}',
          failedStep: ProvisioningStep.sendingCredentials,
        ),
      );
    } finally {
      _isProvisioning = false;
    }
  }

  @override
  Future<void> stopProvisioning() async {
    _isProvisioning = false;
  }

  @override
  Future<bool> isProvisioningActive() async {
    return _isProvisioning;
  }



  void dispose() {
    stopProvisioning();
    _provisioningController.close();
  }
}
