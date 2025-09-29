import 'package:flutter/material.dart';

class AppColors {
  AppColors._(); // this basically makes it so you can't instantiate this class

  // Primary brand colors
  static const Color primary = Color(0xFF6366F1); // Indigo
  static const Color primaryLight = Color(0xFF818CF8);
  static const Color primaryDark = Color(0xFF4338CA);

  // Accent colors
  static const Color accent = Color(0xFF06B6D4); // Cyan
  static const Color accentLight = Color(0xFF22D3EE);
  static const Color accentDark = Color(0xFF0891B2);

  // Background colors
  static const Color background = Color(0xFF0F172A); // Slate 900
  static const Color surface = Color(0xFF1E293B); // Slate 800
  static const Color surfaceVariant = Color(0xFF334155); // Slate 700

  // Status colors
  static const Color success = Color(0xFF10B981); // Emerald
  static const Color warning = Color(0xFFF59E0B); // Amber
  static const Color error = Color(0xFFEF4444); // Red
  static const Color info = Color(0xFF3B82F6); // Blue

  // Text colors
  static const Color textPrimary = Color(0xFFF1F5F9); // Slate 100
  static const Color textSecondary = Color(0xFF94A3B8); // Slate 400
  static const Color textTertiary = Color(0xFF64748B); // Slate 500
  static const Color textOnPrimary = Colors.white;

  // Border colors
  static const Color border = Color(0xFF334155); // Slate 700
  static const Color borderLight = Color(0xFF475569); // Slate 600

  // Gradient colors
  static const List<Color> primaryGradient = [
    Color(0xFF6366F1),
    Color(0xFF8B5CF6),
    Color(0xFFA855F7),
  ];

  static const List<Color> accentGradient = [
    Color(0xFF06B6D4),
    Color(0xFF22D3EE),
    Color(0xFF67E8F9),
  ];

  // Device status colors
  static const Color deviceOnline = Color(0xFF10B981);
  static const Color deviceOffline = Color(0xFF64748B);
  static const Color deviceError = Color(0xFFEF4444);
  static const Color deviceProvisioning = Color(0xFFF59E0B);
}
