import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Request a tab change by setting a target index (0-based).
/// HomeScreen listens, performs the navigation, then resets this to null.
final tabNavigationProvider = StateProvider<int?>((ref) => null);

