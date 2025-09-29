import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../constants/colors.dart';
import '../../domain/entity/esp_device.dart';

class DeviceCard extends StatelessWidget {
  final BleScanResult device;
  final VoidCallback onTap;

  const DeviceCard({
    super.key,
    required this.device,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final rssiStrength = _getRssiStrength(device.rssi);
    final signature = device.manufacturerData['signature'] as String?;
    final version = device.manufacturerData['version'] as String?;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: AppColors.border,
            width: 1,
          ),
        ),
        child: Row(
          children: [
            // Device Icon
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: signature != null && _isValidSignature(signature)
                      ? AppColors.primaryGradient
                      : [AppColors.error, AppColors.error.withOpacity(0.6)],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                Icons.developer_board,
                color: Colors.white,
                size: 24,
              ),
            ).animate()
             .scale(duration: 400.ms, curve: Curves.elasticOut),
            const SizedBox(width: 16),

            // Device Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          device.deviceName,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w600,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      _buildStatusBadge(signature),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'ID: ${device.deviceId}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                  if (version != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      'Version: $version',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.textTertiary,
                      ),
                    ),
                  ],
                ],
              ),
            ),

            // Signal Strength & RSSI
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: rssiStrength.color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${device.rssi}dBm',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: rssiStrength.color,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(
                      Icons.wifi,
                      size: 16,
                      color: rssiStrength.color,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      rssiStrength.label,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: rssiStrength.color,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    ).animate()
     .fadeIn(duration: 600.ms)
     .slideX(begin: 0.2, end: 0);
  }

  Widget _buildStatusBadge(String? signature) {
    final isValid = signature != null && _isValidSignature(signature);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isValid ? AppColors.success : AppColors.error,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        isValid ? 'Verified' : 'Unknown',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  bool _isValidSignature(String signature) {
    const validSignatures = [
      'REGain3D-v1.0',
      'REGain3D-v1.1',
      'REGain3D-v2.0',
    ];
    return validSignatures.contains(signature);
  }

  _RssiStrength _getRssiStrength(int rssi) {
    if (rssi >= -50) {
      return const _RssiStrength('Excellent', AppColors.success);
    } else if (rssi >= -60) {
      return const _RssiStrength('Good', AppColors.info);
    } else if (rssi >= -70) {
      return const _RssiStrength('Fair', AppColors.warning);
    } else {
      return const _RssiStrength('Poor', AppColors.error);
    }
  }
}

class _RssiStrength {
  final String label;
  final Color color;

  const _RssiStrength(this.label, this.color);
}
