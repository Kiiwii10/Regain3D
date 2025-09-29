import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../constants/colors.dart';
import '../device_discovery/device_scan_screen.dart';
import '../device_discovery/discovered_devices_screen.dart';
import '../provisioning/provisioning_screen.dart';
import '../../core/providers/discovered_devices_provider.dart';
import '../../core/providers/tab_navigation_provider.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      setState(() {
        _currentIndex = _tabController.index;
      });
      // Dismiss keyboard when switching tabs
      FocusManager.instance.primaryFocus?.unfocus();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Listen to navigation requests during build (as required by Riverpod)
    ref.listen<int?>(tabNavigationProvider, (prev, next) {
      if (next != null) {
        _tabController.animateTo(next);
        // Reset after handling
        ref.read(tabNavigationProvider.notifier).state = null;
      }
    });
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppColors.background,
              AppColors.surface,
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              _buildHeader(),
              _buildTabBar(),
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: const [
                    DeviceScanScreen(),
                    DiscoveredDevicesScreen(),
                    ProvisioningScreen(),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: AppColors.primaryGradient,
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(
                  Icons.wifi_tethering,
                  color: Colors.white,
                  size: 32,
                ),
              ).animate()
               .scale(duration: 600.ms, curve: Curves.elasticOut),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Regain3D',
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ).animate()
                     .fadeIn(duration: 800.ms)
                     .slideX(begin: -0.2, end: 0),
                    Text(
                      'BLE Provisioning',
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ).animate()
                     .fadeIn(duration: 800.ms, delay: 200.ms)
                     .slideX(begin: -0.2, end: 0),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTabBar() {
    final deviceCount = ref.watch(discoveredDevicesProvider).length;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.border,
          width: 1,
        ),
      ),
      child: TabBar(
        controller: _tabController,
        indicator: BoxDecoration(
          gradient: LinearGradient(
            colors: AppColors.primaryGradient,
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        indicatorSize: TabBarIndicatorSize.tab,
        dividerColor: Colors.transparent,
        labelColor: Colors.white,
        unselectedLabelColor: AppColors.textSecondary,
        labelStyle: const TextStyle(
          fontWeight: FontWeight.w600,
          fontSize: 14,
        ),
        padding: const EdgeInsets.all(4),
        tabs: [
          Tab(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.bluetooth_searching,
                  size: 20,
                  color: _currentIndex == 0 ? Colors.white : AppColors.textSecondary,
                ),
                const SizedBox(height: 4),
                Text(
                  'Scan',
                  style: TextStyle(
                    fontSize: 12,
                    color: _currentIndex == 0 ? Colors.white : AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Tab(
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.devices_other,
                      size: 20,
                      color: _currentIndex == 1 ? Colors.white : AppColors.textSecondary,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Devices',
                      style: TextStyle(
                        fontSize: 12,
                        color: _currentIndex == 1 ? Colors.white : AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                if (deviceCount > 0)
                  Positioned(
                    right: -4,
                    top: -4,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                      ),
                      constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                      child: Text(
                        '$deviceCount',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          Tab(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.wifi,
                  size: 20,
                  color: _currentIndex == 2 ? Colors.white : AppColors.textSecondary,
                ),
                const SizedBox(height: 4),
                Text(
                  'Network',
                  style: TextStyle(
                    fontSize: 12,
                    color: _currentIndex == 2 ? Colors.white : AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate()
     .fadeIn(duration: 600.ms, delay: 400.ms)
     .slideY(begin: 0.2, end: 0);
  }
}
