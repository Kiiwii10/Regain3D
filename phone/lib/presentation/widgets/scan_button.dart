import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../constants/colors.dart';

class ScanButton extends StatelessWidget {
  final bool isScanning;
  final VoidCallback onStartScan;
  final VoidCallback onStopScan;
  final AnimationController pulseController;

  const ScanButton({
    super.key,
    required this.isScanning,
    required this.onStartScan,
    required this.onStopScan,
    required this.pulseController,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: isScanning ? onStopScan : onStartScan,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        width: 120,
        height: 120,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: LinearGradient(
            colors: isScanning
                ? [AppColors.warning, AppColors.warning.withValues(alpha: 0.6)]
                : AppColors.primaryGradient,
          ),
          boxShadow: [
            BoxShadow(
              color: (isScanning ? AppColors.warning : AppColors.primary).withValues(alpha: 0.3),
              blurRadius: 20,
              spreadRadius: 5,
            ),
          ],
        ),
        child: AnimatedBuilder(
          animation: pulseController,
          builder: (context, child) {
            return Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: (isScanning ? AppColors.warning : AppColors.primary).withValues(alpha: 0.5),
                  width: isScanning ? pulseController.value * 4 : 2,
                ),
              ),
              child: child,
            );
          },
          child: Icon(
            isScanning ? Icons.stop : Icons.search,
            color: Colors.white,
            size: 48,
          ),
        ),
      ).animate(target: isScanning ? 1 : 0)
       .scale(
         begin: const Offset(1, 1),
         end: const Offset(1.05, 1.05),
         duration: 500.ms,
         curve: Curves.easeInOut,
       ),
    );
  }
}
