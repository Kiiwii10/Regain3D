import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/network/mesh_provisioning_service.dart';

final meshProvisioningServiceProvider = Provider<MeshProvisioningService>((ref) {
  final service = MeshProvisioningService();
  ref.onDispose(service.dispose);
  return service;
});
