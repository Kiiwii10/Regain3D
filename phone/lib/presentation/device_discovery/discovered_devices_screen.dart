import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_reactive_ble/flutter_reactive_ble.dart';
import '../../domain/entity/esp_device.dart';
import '../../core/providers/discovered_devices_provider.dart';
import '../../core/providers/mesh_provisioning_provider.dart';
import '../../core/storage/secure_storage.dart';
import '../../core/providers/tab_navigation_provider.dart';

class DiscoveredDevicesScreen extends ConsumerStatefulWidget {
  const DiscoveredDevicesScreen({super.key});

  @override
  ConsumerState<DiscoveredDevicesScreen> createState() => _DiscoveredDevicesScreenState();
}

class _DiscoveredDevicesScreenState extends ConsumerState<DiscoveredDevicesScreen> {
  static const String _psk = 'Regain3D_PreShared_Key';
  bool _isProvisioning = false;
  String? _currentError;
  StreamSubscription<ProvisioningResult>? _resultsSub;

  @override
  void dispose() {
    _resultsSub?.cancel();
    super.dispose();
  }

  Future<void> _provisionDevice(DiscoveredDevice device) async {
    final meshService = ref.read(meshProvisioningServiceProvider);
    await meshService.stopScan();

    final creds = await ref.read(secureStorageProvider).getWiFiCredentials();
    if (!creds.isValid) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Configure WiFi in Network tab')),
      );
      return;
    }

    if (!mounted) return;
    setState(() {
      _isProvisioning = true;
      _currentError = null;
    });

    _resultsSub?.cancel();
    _resultsSub = meshService.provisioningResults.listen((result) {
      result.when(
        success: (_, __, ___) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Provisioning complete')),
          );
        },
        failure: (_, __, error) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Provisioning failed: $error')),
          );
        },
      );
    });

    try {
      await meshService.startProvisioning(
          creds.ssid, creds.password, device, _psk);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _currentError = 'Provisioning error: ${e.toString()}';
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _isProvisioning = false;
      });
    }
  }

  void _goToScanTab() {
    ref.read(tabNavigationProvider.notifier).state = 0;
  }

  int _parseAdvStatus(DiscoveredDevice device) {
    final data = device.manufacturerData;
    if (data.length >= 2 + 8 + 1) {
      return data[2 + 8];
    }
    return 0;
  }

  String _statusText(int status) {
    switch (status) {
      case 1:
        return 'Provisioning...';
      case 2:
        return 'Provisioned';
      default:
        return 'Ready to provision';
    }
  }

  @override
  Widget build(BuildContext context) {
    final devices = ref.watch(discoveredDevicesProvider);
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          // Top-centered button to navigate to the Scan tab
          Center(
            child: FilledButton.icon(
              onPressed: _goToScanTab,
              icon: const Icon(Icons.bluetooth_searching_rounded),
              label: const Text('Go to Scan'),
            ),
          ),
          const SizedBox(height: 12),
          if (_currentError != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Text(
                _currentError!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
          Expanded(
            child: devices.isEmpty
                ? const Center(child: Text('No devices discovered'))
                : Card(
                    child: ListView.builder(
                      itemCount: devices.length,
                      itemBuilder: (context, index) {
                        final device = devices[index];
                        final status = _parseAdvStatus(device);
                        final statusText = _statusText(status);
                        return ListTile(
                          title: Text(device.name.isNotEmpty ? device.name : device.id),
                          subtitle: Text(statusText),
                          onTap: status == 0 && !_isProvisioning
                              ? () => _provisionDevice(device)
                              : null,
                        );
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
