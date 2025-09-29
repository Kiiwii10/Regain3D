/// Creating custom color palettes is part of creating a custom app. The idea is to create
/// your class of custom colors, in this case `CompanyColors` and then create a `ThemeData`
/// object with those colors you just defined.
///
/// Resource:
/// A good resource would be this website: http://mcg.mbitson.com/
/// You simply need to put in the colour you wish to use, and it will generate all shades
/// for you. Your primary colour will be the `500` value.
///
/// Colour Creation:
/// In order to create the custom colours you need to create a `Map<int, Color>` object
/// which will have all the shade values. `const Color(0xFF...)` will be how you create
/// the colours. The six character hex code is what follows. If you wanted the colour
/// #114488 or #D39090 as primary colours in your setting, then you would have
/// `const Color(0x114488)` and `const Color(0xD39090)`, respectively.
///
/// Usage:
/// In order to use this newly created setting or even the colours in it, you would just
/// `import` this file in your project, anywhere you needed it.
/// `import 'path/to/setting.dart';`
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppThemeData {
  static const _lightFillColor = Colors.black;
  static const _darkFillColor = Colors.white;

  static final Color _lightFocusColor = Colors.black.withOpacity(0.12);
  static final Color _darkFocusColor = Colors.white.withOpacity(0.12);

  static ThemeData lightThemeData =
  themeData(lightColorScheme, _lightFocusColor);
  static ThemeData darkThemeData = themeData(darkColorScheme, _darkFocusColor);

  static ThemeData themeData(ColorScheme colorScheme, Color focusColor) {
    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      textTheme: _textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: colorScheme.onSurface),
        titleTextStyle: _textTheme.titleLarge?.copyWith(
          color: colorScheme.onSurface,
          fontWeight: FontWeight.w600,
        ),
      ),
      cardTheme: CardTheme(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: colorScheme.outline.withOpacity(0.2),
            width: 1,
          ),
        ),
        color: colorScheme.surfaceContainer,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(64, 48),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          elevation: 0,
          minimumSize: const Size(64, 48),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colorScheme.surfaceContainer,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(
            color: colorScheme.outline.withOpacity(0.3),
          ),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(
            color: colorScheme.outline.withOpacity(0.3),
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(
            color: colorScheme.primary,
            width: 2,
          ),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(
            color: colorScheme.error,
          ),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(
            color: colorScheme.error,
            width: 2,
          ),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        backgroundColor: colorScheme.inverseSurface,
        contentTextStyle: _textTheme.bodyMedium?.copyWith(
          color: colorScheme.onInverseSurface,
        ),
      ),
      scaffoldBackgroundColor: colorScheme.surface,
      highlightColor: Colors.transparent,
      focusColor: focusColor,
    );
  }

  static const ColorScheme lightColorScheme = ColorScheme(
    brightness: Brightness.light,
    primary: Color(0xFF6366F1),
    onPrimary: Color(0xFFFFFFFF),
    primaryContainer: Color(0xFFE0E7FF),
    onPrimaryContainer: Color(0xFF1E1B3C),
    secondary: Color(0xFF06B6D4),
    onSecondary: Color(0xFFFFFFFF),
    secondaryContainer: Color(0xFFE6FFFA),
    onSecondaryContainer: Color(0xFF003A32),
    tertiary: Color(0xFF8B5CF6),
    onTertiary: Color(0xFFFFFFFF),
    tertiaryContainer: Color(0xFFF3E8FF),
    onTertiaryContainer: Color(0xFF2D1B3D),
    error: Color(0xFFEF4444),
    onError: Color(0xFFFFFFFF),
    errorContainer: Color(0xFFFEF2F2),
    onErrorContainer: Color(0xFF7F1D1D),
    surface: Color(0xFFFEFEFE),
    onSurface: Color(0xFF1A1A1A),
    surfaceContainer: Color(0xFFF8FAFC),
    surfaceContainerHigh: Color(0xFFF1F5F9),
    onSurfaceVariant: Color(0xFF475569),
    outline: Color(0xFFCBD5E1),
    outlineVariant: Color(0xFFE2E8F0),
    shadow: Color(0xFF000000),
    scrim: Color(0xFF000000),
    inverseSurface: Color(0xFF2D3748),
    onInverseSurface: Color(0xFFF7FAFC),
    inversePrimary: Color(0xFFA5B4FC),
    surfaceDim: Color(0xFFE2E8F0),
    surfaceBright: Color(0xFFFFFFFF),
    surfaceContainerLowest: Color(0xFFFFFFFF),
    surfaceContainerLow: Color(0xFFFCFCFC),
    surfaceContainerHighest: Color(0xFFECF1F8),
  );

  static const ColorScheme darkColorScheme = ColorScheme(
    brightness: Brightness.dark,
    primary: Color(0xFFA5B4FC),
    onPrimary: Color(0xFF1E1B3C),
    primaryContainer: Color(0xFF3730A3),
    onPrimaryContainer: Color(0xFFE0E7FF),
    secondary: Color(0xFF67E8F9),
    onSecondary: Color(0xFF003A32),
    secondaryContainer: Color(0xFF00504A),
    onSecondaryContainer: Color(0xFFE6FFFA),
    tertiary: Color(0xFFC084FC),
    onTertiary: Color(0xFF2D1B3D),
    tertiaryContainer: Color(0xFF5B21B6),
    onTertiaryContainer: Color(0xFFF3E8FF),
    error: Color(0xFFFCA5A5),
    onError: Color(0xFF7F1D1D),
    errorContainer: Color(0xFFDC2626),
    onErrorContainer: Color(0xFFFEF2F2),
    surface: Color(0xFF0F172A),
    onSurface: Color(0xFFE2E8F0),
    surfaceContainer: Color(0xFF1E293B),
    surfaceContainerHigh: Color(0xFF334155),
    onSurfaceVariant: Color(0xFF94A3B8),
    outline: Color(0xFF475569),
    outlineVariant: Color(0xFF334155),
    shadow: Color(0xFF000000),
    scrim: Color(0xFF000000),
    inverseSurface: Color(0xFFE2E8F0),
    onInverseSurface: Color(0xFF2D3748),
    inversePrimary: Color(0xFF6366F1),
    surfaceDim: Color(0xFF0F172A),
    surfaceBright: Color(0xFF475569),
    surfaceContainerLowest: Color(0xFF020617),
    surfaceContainerLow: Color(0xFF1E293B),
    surfaceContainerHighest: Color(0xFF475569),
  );

  static const _regular = FontWeight.w400;
  static const _medium = FontWeight.w500;
  static const _semiBold = FontWeight.w600;
  static const _bold = FontWeight.w700;

  static final TextTheme _textTheme = TextTheme(
    headlineMedium: GoogleFonts.montserrat(fontWeight: _bold, fontSize: 20.0),
    bodySmall: GoogleFonts.oswald(fontWeight: _semiBold, fontSize: 16.0),
    headlineSmall: GoogleFonts.oswald(fontWeight: _medium, fontSize: 16.0),
    titleMedium: GoogleFonts.montserrat(fontWeight: _medium, fontSize: 16.0),
    labelSmall: GoogleFonts.montserrat(fontWeight: _medium, fontSize: 12.0),
    bodyLarge: GoogleFonts.montserrat(fontWeight: _regular, fontSize: 14.0),
    titleSmall: GoogleFonts.montserrat(fontWeight: _medium, fontSize: 14.0),
    bodyMedium: GoogleFonts.montserrat(fontWeight: _regular, fontSize: 16.0),
    titleLarge: GoogleFonts.montserrat(fontWeight: _bold, fontSize: 16.0),
    labelLarge: GoogleFonts.montserrat(fontWeight: _semiBold, fontSize: 14.0),
  );
}