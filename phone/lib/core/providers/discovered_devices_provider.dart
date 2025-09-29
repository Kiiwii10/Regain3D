import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_reactive_ble/flutter_reactive_ble.dart';

class DiscoveredDevicesNotifier extends StateNotifier<List<DiscoveredDevice>> {
  DiscoveredDevicesNotifier() : super([]);

  void addOrUpdate(DiscoveredDevice device) {
    final index = state.indexWhere((d) => d.id == device.id);
    if (index >= 0) {
      final updated = [...state];
      updated[index] = device;
      state = updated;
    } else {
      state = [...state, device];
    }
  }

  void clear() => state = [];
}

final discoveredDevicesProvider =
    StateNotifierProvider<DiscoveredDevicesNotifier, List<DiscoveredDevice>>(
  (ref) => DiscoveredDevicesNotifier(),
);
