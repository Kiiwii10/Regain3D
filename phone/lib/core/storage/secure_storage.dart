import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class WiFiCredentials {
  final String ssid;
  final String password;

  const WiFiCredentials({required this.ssid, required this.password});

  bool get isValid => ssid.isNotEmpty && password.isNotEmpty;
}

class SecureStorage {
  static const _ssidKey = 'wifi_ssid';
  static const _passwordKey = 'wifi_password';

  final FlutterSecureStorage _storage;

  SecureStorage({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  Future<void> saveWiFiCredentials(String ssid, String password) async {
    await _storage.write(key: _ssidKey, value: ssid);
    await _storage.write(key: _passwordKey, value: password);
  }

  Future<WiFiCredentials> getWiFiCredentials() async {
    final ssid = await _storage.read(key: _ssidKey) ?? '';
    final password = await _storage.read(key: _passwordKey) ?? '';
    return WiFiCredentials(ssid: ssid, password: password);
  }
}

final secureStorageProvider = Provider<SecureStorage>((ref) {
  return SecureStorage();
});
