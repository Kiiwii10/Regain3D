import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Reflects whether WiFi network credentials are configured (non-empty SSID and password).
final networkConfiguredProvider = StateProvider<bool>((ref) => false);

