import 'package:regain3d_provisioner/data/di/data_layer_injection.dart';
import 'package:regain3d_provisioner/domain/di/domain_layer_injection.dart';
import 'package:regain3d_provisioner/presentation/di/presentation_layer_injection.dart';
import 'package:get_it/get_it.dart';

final getIt = GetIt.instance;

class ServiceLocator {
  static Future<void> configureDependencies() async {
    await DataLayerInjection.configureDataLayerInjection();
    await DomainLayerInjection.configureDomainLayerInjection();
    await PresentationLayerInjection.configurePresentationLayerInjection();
  }
}
