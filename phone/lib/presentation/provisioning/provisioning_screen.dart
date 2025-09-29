import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../constants/colors.dart';
import '../../core/storage/secure_storage.dart';
import '../../core/providers/network_config_provider.dart';

class ProvisioningScreen extends ConsumerStatefulWidget {
  const ProvisioningScreen({super.key});

  @override
  ConsumerState<ProvisioningScreen> createState() => _ProvisioningScreenState();
}

class _ProvisioningScreenState extends ConsumerState<ProvisioningScreen> {
  final _formKey = GlobalKey<FormState>();
  final _ssidController = TextEditingController();
  final _passwordController = TextEditingController();

  // Focus nodes for better keyboard and focus management
  final _ssidFocusNode = FocusNode();
  final _passwordFocusNode = FocusNode();

  bool _isObscurePassword = true;

  @override
  void initState() {
    super.initState();
    _loadSavedConfiguration();
  }

  @override
  void dispose() {
    _ssidController.dispose();
    _passwordController.dispose();
    _ssidFocusNode.dispose();
    _passwordFocusNode.dispose();
    super.dispose();
  }

  void _loadSavedConfiguration() async {
    final storage = ref.read(secureStorageProvider);
    final creds = await storage.getWiFiCredentials();
    if (mounted) {
      setState(() {
        if (_ssidController.text.isEmpty && creds.ssid.isNotEmpty) {
          _ssidController.text = creds.ssid;
        }
        if (_passwordController.text.isEmpty && creds.password.isNotEmpty) {
          _passwordController.text = creds.password;
        }
      });
      // Update reactive flag for other tabs (e.g., Scan)
      ref.read(networkConfiguredProvider.notifier).state = creds.isValid;
    }
  }

  void _saveConfiguration() async {
    if (_formKey.currentState?.validate() ?? false) {
      final storage = ref.read(secureStorageProvider);

      // Save WiFi configuration
      await storage.saveWiFiCredentials(
          _ssidController.text, _passwordController.text);

      // Inform the app that configuration is available
      final configured =
          _ssidController.text.isNotEmpty && _passwordController.text.isNotEmpty;
      ref.read(networkConfiguredProvider.notifier).state = configured;

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(
                  Icons.check_circle_rounded,
                  color: Theme.of(context).colorScheme.onTertiaryContainer,
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Text(
                    'WiFi configuration saved successfully',
                    style: TextStyle(fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
            backgroundColor: Theme.of(context).colorScheme.tertiaryContainer,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }

      // Provisioning is now triggered from the Scan tab where the user selects
      // a device. We only save the network configuration here.
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        // Dismiss keyboard when tapping outside text fields
        FocusManager.instance.primaryFocus?.unfocus();
      },
      child: Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(),
            const SizedBox(height: 32),
            Expanded(
              child: _buildProvisioningForm(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Network Settings',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.bold,
          ),
        ).animate()
         .fadeIn(duration: 600.ms)
         .slideX(begin: -0.2, end: 0),
        const SizedBox(height: 8),
        Text(
          'Configure WiFi network for ESP32 provisioning',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: AppColors.textSecondary,
          ),
        ).animate()
         .fadeIn(duration: 600.ms, delay: 200.ms)
         .slideX(begin: -0.2, end: 0),
      ],
    );
  }

  Widget _buildProvisioningForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.only(bottom: 16),
      child: Form(
        key: _formKey,
        child: Column(
          children: [
            _buildWifiSection(),
            const SizedBox(height: 32),
            _buildSaveButton(),
          ],
        ),
      ),
    );
  }

  Widget _buildWifiSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primaryContainer,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Icons.wifi_rounded,
                    color: Theme.of(context).colorScheme.onPrimaryContainer,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 16),
                Text(
                  'WiFi Network',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ).animate()
             .fadeIn(duration: 600.ms)
             .slideX(begin: -0.2, end: 0),
            const SizedBox(height: 24),

            // SSID Field
            TextFormField(
              controller: _ssidController,
              focusNode: _ssidFocusNode,
              textInputAction: TextInputAction.next,
              onFieldSubmitted: (_) {
                FocusScope.of(context).requestFocus(_passwordFocusNode);
              },
              decoration: InputDecoration(
                labelText: 'Network Name (SSID)',
                hintText: 'Enter your WiFi network name',
                prefixIcon: Icon(
                  Icons.wifi_rounded,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                helperText: 'The name of your WiFi network',
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter WiFi network name';
                }
                if (value.length < 2) {
                  return 'Network name must be at least 2 characters';
                }
                if (value.length > 32) {
                  return 'Network name cannot exceed 32 characters';
                }
                return null;
              },
            ).animate()
             .fadeIn(duration: 600.ms, delay: 100.ms)
             .slideY(begin: 0.2, end: 0),

            const SizedBox(height: 20),

            // Password Field
            TextFormField(
              controller: _passwordController,
              focusNode: _passwordFocusNode,
              obscureText: _isObscurePassword,
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) {
                _passwordFocusNode.unfocus();
                _saveConfiguration();
              },
              decoration: InputDecoration(
                labelText: 'WiFi Password',
                hintText: 'Enter your WiFi password',
                prefixIcon: Icon(
                  Icons.lock_rounded,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                suffixIcon: IconButton(
                  icon: Icon(
                    _isObscurePassword ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                  onPressed: () {
                    if (mounted) {
                      setState(() {
                        _isObscurePassword = !_isObscurePassword;
                      });
                    }
                  },
                  tooltip: _isObscurePassword ? 'Show password' : 'Hide password',
                ),
                helperText: 'Your WiFi network password',
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter WiFi password';
                }
                if (value.length < 8) {
                  return 'Password must be at least 8 characters';
                }
                if (value.length > 63) {
                  return 'Password cannot exceed 63 characters';
                }
                return null;
              },
            ).animate()
             .fadeIn(duration: 600.ms, delay: 200.ms)
             .slideY(begin: 0.2, end: 0),

            const SizedBox(height: 20),

            // Info Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.secondaryContainer.withOpacity(0.3),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: Theme.of(context).colorScheme.secondary.withOpacity(0.3),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline_rounded,
                    color: Theme.of(context).colorScheme.secondary,
                    size: 22,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Network Configuration',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Theme.of(context).colorScheme.secondary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'ESP32 devices will connect to this WiFi network after BLE provisioning is complete.',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ).animate()
             .fadeIn(duration: 600.ms, delay: 300.ms)
             .slideY(begin: 0.2, end: 0),
          ],
        ),
      ),
    );
  }

  Widget _buildSaveButton() {
    return SizedBox(
      width: double.infinity,
      child: FilledButton.icon(
        onPressed: _saveConfiguration,
        icon: const Icon(Icons.save_rounded),
        label: const Text(
          'Save WiFi Configuration',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
        style: FilledButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    ).animate()
     .fadeIn(duration: 600.ms, delay: 400.ms)
     .slideY(begin: 0.2, end: 0);
  }
}

