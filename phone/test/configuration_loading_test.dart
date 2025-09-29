import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_reactive_ble/flutter_reactive_ble.dart';

import 'package:regain3d_provisioner/presentation/device_discovery/device_scan_screen.dart';
import 'package:regain3d_provisioner/presentation/device_discovery/discovered_devices_screen.dart';
import 'package:regain3d_provisioner/presentation/widgets/scan_button.dart';
import 'package:regain3d_provisioner/core/providers/discovered_devices_provider.dart';
import 'package:regain3d_provisioner/core/providers/mesh_provisioning_provider.dart';
import 'package:regain3d_provisioner/core/data/network/mesh_provisioning_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
  });

  testWidgets('DeviceScanScreen shows scan button when config present',
      (tester) async {
    FlutterSecureStorage.setMockInitialValues(
        {'wifi_ssid': 'ssid', 'wifi_password': 'pass'});
    await tester.pumpWidget(const ProviderScope(
      child: MaterialApp(home: DeviceScanScreen()),
    ));
    await tester.pumpAndSettle();
    expect(find.byType(ScanButton), findsOneWidget);
  });

  testWidgets('DiscoveredDevicesScreen prompts config when missing',
      (tester) async {
    final device = DiscoveredDevice(
      id: '1',
      name: 'TestDevice',
      serviceUuids: const [],
      manufacturerData: List<int>.filled(11, 0),
      rssi: -50,
    );
    await tester.pumpWidget(ProviderScope(
      overrides: [
        discoveredDevicesProvider.overrideWith(
          (ref) => FakeDiscoveredDevicesNotifier([device]),
        ),
        meshProvisioningServiceProvider
            .overrideWithValue(FakeMeshProvisioningService()),
      ],
      child: const MaterialApp(
        home: Scaffold(body: DiscoveredDevicesScreen()),
      ),
    ));
    await tester.pumpAndSettle();
    await tester.tap(find.text('TestDevice'));
    await tester.pump();
    expect(find.text('Configure WiFi in Network tab'), findsOneWidget);
  });
}

class FakeDiscoveredDevicesNotifier
    extends StateNotifier<List<DiscoveredDevice>> {
  FakeDiscoveredDevicesNotifier(List<DiscoveredDevice> devices)
      : super(devices);
}

class FakeMeshProvisioningService implements MeshProvisioningService {
  @override
  Stream<MeshProvisioningStatus> get statusStream => const Stream.empty();

  @override
  Stream<ProvisioningResult> get provisioningResults => const Stream.empty();

  @override
  Stream<DiscoveredDevice> scanForDevices(String psk) => const Stream.empty();

  @override
  Future<void> startProvisioning(
      String ssid, String password, DiscoveredDevice device, String psk) async {}

  @override
  Future<void> stopProvisioning() async {}

  @override
  Future<void> stopScan() async {}

  @override
  void dispose() {}
}
