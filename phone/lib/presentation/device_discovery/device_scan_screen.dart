import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter/services.dart';
import 'package:flutter_reactive_ble/flutter_reactive_ble.dart';
import 'package:device_info_plus/device_info_plus.dart';
import '../../domain/entity/esp_device.dart';
import '../../core/providers/mesh_provisioning_provider.dart';
import '../../core/providers/discovered_devices_provider.dart';
import '../../core/providers/network_config_provider.dart';
import '../../core/storage/secure_storage.dart';
import '../widgets/scan_button.dart';
import 'dart:io';
import 'dart:async';

class DeviceScanScreen extends ConsumerStatefulWidget {
  const DeviceScanScreen({super.key});

  @override
  ConsumerState<DeviceScanScreen> createState() => _DeviceScanScreenState();
}


Future<bool> checkAndRequestBluetoothPermissions(BuildContext context) async {
  final reactiveBle = FlutterReactiveBle();
  try {
    // First check if Bluetooth is supported
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

    // Platform-specific permission handling
    if (Platform.isAndroid) {
      return await _handleAndroidPermissions(context, reactiveBle);
    } else if (Platform.isIOS) {
      return await _handleIOSPermissions(context, reactiveBle);
    }

    return false;
  } catch (e) {
    print('Permission check error: $e');
    return false;
  }
}

Future<bool> _handleAndroidPermissions(
    BuildContext context, FlutterReactiveBle ble) async {
  // Check Android SDK version
  final androidInfo = await DeviceInfoPlugin().androidInfo;
  final sdkInt = androidInfo.version.sdkInt;
  
  Map<Permission, PermissionStatus> statuses = {};
  
  if (sdkInt >= 31) {
    // Android 12+ requires new Bluetooth permissions
    statuses = await [
      Permission.bluetoothScan,
      Permission.bluetoothConnect,
      Permission.bluetoothAdvertise,
      Permission.location,
    ].request();
  } else {
    // Android < 12 requires location permission for BLE
    statuses = await [
      Permission.bluetooth,
      Permission.location,
    ].request();
  }
  
  // Check if all permissions are granted
  bool allGranted = statuses.values.every(
    (status) => status == PermissionStatus.granted
  );
  
  if (!allGranted) {
    // Check which permissions were denied
    bool permanentlyDenied = statuses.values.any(
      (status) => status == PermissionStatus.permanentlyDenied
    );
    
    if (permanentlyDenied) {
      _showPermissionDialog(
        context,
        'Permissions Required',
        'Bluetooth and location permissions are required to scan for ESP32 devices. '
        'Please enable them in Settings.',
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
  
  // Check if Bluetooth is actually enabled
  final status = await ble.statusStream.first;
  if (status != BleStatus.ready) {
    _showBluetoothDisabledDialog(context);
    return false;
  }

  return true;
}
Future<bool> _handleIOSPermissions(
    BuildContext context, FlutterReactiveBle ble) async {
  // iOS handles Bluetooth permissions differently
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

  // Check Bluetooth state
  final status = await ble.statusStream.first;
  if (status != BleStatus.ready) {
    _showBluetoothDisabledDialog(context);
    return false;
  }

  return true;
}

void _showBluetoothDisabledDialog(BuildContext context) {
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

void _showPermissionDialog(
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

void _showErrorDialog(
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
            child: const Text('Settings'),
          ),
      ],
    ),
  );
}


class _DeviceScanScreenState extends ConsumerState<DeviceScanScreen>
    with TickerProviderStateMixin, AutomaticKeepAliveClientMixin {

  late AnimationController _pulseController;
  bool _isProvisioning = false;
  bool _isScanning = false;
  // Network configuration is tracked via networkConfiguredProvider
  String? _currentError;
  StreamSubscription<DiscoveredDevice>? _scanSubscription;
  Timer? _scanTimeoutTimer;
  static const String _psk = 'Regain3D_PreShared_Key';

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat(reverse: true);

    _checkNetworkConfigurationOnInit();
  }

  void _checkNetworkConfigurationOnInit() async {
    final creds = await ref.read(secureStorageProvider).getWiFiCredentials();
    ref.read(networkConfiguredProvider.notifier).state = creds.isValid;
  }

  @override
  void dispose() {
    _scanSubscription?.cancel();
    _scanTimeoutTimer?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  bool get wantKeepAlive => true;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Recheck network configuration when returning to this screen
    _checkNetworkConfigurationOnInit();
  }

  Future<void> _checkNetworkConfiguration() async {
    final creds = await ref.read(secureStorageProvider).getWiFiCredentials();
    final isValid = creds.isValid;
    ref.read(networkConfiguredProvider.notifier).state = isValid;
    if (!isValid) _showNetworkRequiredMessage();
  }


  void _showNetworkRequiredMessage() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              Icons.warning_rounded,
              color: Theme.of(context).colorScheme.onErrorContainer,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Please configure WiFi network in Network tab first',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onErrorContainer,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
        backgroundColor: Theme.of(context).colorScheme.errorContainer,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 4),
        action: SnackBarAction(
          label: 'Configure',
          textColor: Theme.of(context).colorScheme.onErrorContainer,
          onPressed: () {
            // Navigate to network tab
            DefaultTabController.of(context).animateTo(1);
          },
        ),
      ),
    );
  }


  void _showBluetoothDisabledDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        icon: Icon(
          Icons.bluetooth_disabled_rounded,
          color: Theme.of(context).colorScheme.error,
          size: 48,
        ),
        title: const Text('Bluetooth Disabled'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Bluetooth is currently disabled on your device.',
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Text(
              'Please enable Bluetooth to scan for ESP32 devices.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton.icon(
            onPressed: () {
              Navigator.of(context).pop();
              _openBluetoothSettings();
            },
            icon: const Icon(Icons.bluetooth_rounded),
            label: const Text('Enable Bluetooth'),
          ),
        ],
      ),
    );
  }

  void _openBluetoothSettings() async {
    try {
      // Try to open Bluetooth settings directly
      const platform = MethodChannel('bluetooth_settings');
      await platform.invokeMethod('openBluetoothSettings');
    } catch (e) {
      // Fallback to general settings
      openAppSettings();
    }
  }

  void _startScan() async {
    setState(() {
      _currentError = null;
    });

    final hasPermissions = await checkAndRequestBluetoothPermissions(context);
    if (!hasPermissions) return;

    if (!ref.read(networkConfiguredProvider)) {
      await _checkNetworkConfiguration();
      if (!ref.read(networkConfiguredProvider)) {
        _showNetworkRequiredMessage();
        return;
      }
    }

    setState(() {
      _isScanning = true;
    });

    ref.read(discoveredDevicesProvider.notifier).clear();

    final meshService = ref.read(meshProvisioningServiceProvider);
    _scanSubscription?.cancel();
    _scanSubscription =
        meshService.scanForDevices(_psk).listen((device) {
      ref.read(discoveredDevicesProvider.notifier).addOrUpdate(device);
      // Toast removed; tab badge indicates discovery progress
    });

    // Auto-stop scanning after 1 minute if not manually stopped
    _scanTimeoutTimer?.cancel();
    _scanTimeoutTimer = Timer(const Duration(minutes: 1), () {
      if (mounted && _isScanning) {
        _stopScan();
      }
    });
  }

  Future<void> _stopScan() async {
    _scanTimeoutTimer?.cancel();
    await _scanSubscription?.cancel();
    setState(() {
      _isScanning = false;
    });
    final meshService = ref.read(meshProvisioningServiceProvider);
    await meshService.stopScan();
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return GestureDetector(
      onTap: () {
        // Dismiss keyboard when tapping outside text fields
        FocusManager.instance.primaryFocus?.unfocus();
      },
      child: Column(
        children: [
          // Error section at the top
          if (_currentError != null) _buildErrorSection(),
          
          // Main content
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  // Show instruction text only when not provisioning and no results and network is configured
                  if (!_isProvisioning && ref.watch(networkConfiguredProvider))
                    _buildInstructionText(),
                  
                  // Centered scan section
                  Expanded(
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          // Only show scan button if network is configured
                          if (ref.watch(networkConfiguredProvider))
                            _buildScanSection(),

                          // Show info section when no network is configured
                          if (!ref.watch(networkConfiguredProvider)) ...[
                            _buildInfoSection(),
                          ] else if (!_isScanning) ...[
                            // Show smaller info section when network IS configured but no results yet
                            const SizedBox(height: 32),
                            _buildReadyToScanInfo(),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorSection() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Theme.of(context).colorScheme.error.withOpacity(0.3),
        ),
      ),
      child: Row(
        children: [
          Icon(
            Icons.error_rounded,
            color: Theme.of(context).colorScheme.onErrorContainer,
            size: 24,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Error',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onErrorContainer,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _currentError!,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onErrorContainer,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () {
              setState(() {
                _currentError = null;
              });
            },
            icon: Icon(
              Icons.close_rounded,
              color: Theme.of(context).colorScheme.onErrorContainer,
            ),
            tooltip: 'Dismiss',
          ),
        ],
      ),
    ).animate()
     .slideY(begin: -0.5, end: 0, duration: 300.ms)
     .fadeIn(duration: 300.ms);
  }

  Widget _buildInstructionText() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
      child: Text(
        'Tap to Scan and Provision',
        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
          fontWeight: FontWeight.w600,
          color: Theme.of(context).colorScheme.onSurface,
        ),
        textAlign: TextAlign.center,
      ),
    ).animate()
     .fadeIn(duration: 600.ms)
     .slideY(begin: -0.2, end: 0);
  }

  Widget _buildInfoSection() {
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 400),
      child: Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.secondaryContainer,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.info_outline_rounded,
                      color: Theme.of(context).colorScheme.onSecondaryContainer,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Text(
                      'Setup Required',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ).animate()
               .fadeIn(duration: 600.ms)
               .slideX(begin: -0.2, end: 0),
              const SizedBox(height: 16),
              Text(
                'Configure your WiFi network settings in the Network tab before scanning.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ).animate()
               .fadeIn(duration: 600.ms, delay: 100.ms)
               .slideY(begin: 0.2, end: 0),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primaryContainer.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: Theme.of(context).colorScheme.primary.withOpacity(0.3),
                    width: 1,
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.wifi_rounded,
                      color: Theme.of(context).colorScheme.primary,
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Network → Configure → Scan',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ).animate()
               .fadeIn(duration: 600.ms, delay: 200.ms)
               .slideY(begin: 0.2, end: 0),
            ],
          ),
        ),
      ),
    );
  }





  Widget _buildReadyToScanInfo() {
    return Container(
      constraints: const BoxConstraints(maxWidth: 300),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.tertiaryContainer.withOpacity(0.3),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Theme.of(context).colorScheme.tertiary.withOpacity(0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.check_circle_rounded,
            color: Theme.of(context).colorScheme.tertiary,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Network configured. Ready to scan!',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.tertiary,
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    ).animate()
     .fadeIn(duration: 400.ms)
     .slideY(begin: 0.2, end: 0);
  }

  Widget _buildScanSection() {
    return Column(
      children: [
        ScanButton(
          isScanning: _isScanning,
          onStartScan: _startScan,
          onStopScan: _stopScan,
          pulseController: _pulseController,
        ),
        if (_isScanning) ...[
          const SizedBox(height: 16),
          Text(
            'Scanning for ESP32 devices...',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ).animate(
            onPlay: (controller) => controller.repeat(),
          ).fadeIn(duration: 1000.ms).then(delay: 500.ms).fadeOut(duration: 1000.ms),
        ],
      ],
    );
  }

}
