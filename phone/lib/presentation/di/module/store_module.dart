import 'dart:async';

import 'package:regain3d_provisioner/core/stores/error/error_store.dart';
import 'package:regain3d_provisioner/core/stores/form/form_store.dart';
import 'package:regain3d_provisioner/domain/repository/setting/setting_repository.dart';
import 'package:regain3d_provisioner/domain/usecase/post/get_post_usecase.dart';
import 'package:regain3d_provisioner/domain/usecase/user/is_logged_in_usecase.dart';
import 'package:regain3d_provisioner/domain/usecase/user/login_usecase.dart';
import 'package:regain3d_provisioner/domain/usecase/user/save_login_in_status_usecase.dart';
import 'package:regain3d_provisioner/presentation/home/store/language/language_store.dart';
import 'package:regain3d_provisioner/presentation/home/store/theme/theme_store.dart';
import 'package:regain3d_provisioner/presentation/login/store/login_store.dart';
import 'package:regain3d_provisioner/presentation/post/store/post_store.dart';

import '../../../di/service_locator.dart';

class StoreModule {
  static Future<void> configureStoreModuleInjection() async {
    // factories:---------------------------------------------------------------
    getIt.registerFactory(() => ErrorStore());
    getIt.registerFactory(() => FormErrorStore());
    getIt.registerFactory(
      () => FormStore(getIt<FormErrorStore>(), getIt<ErrorStore>()),
    );

    // stores:------------------------------------------------------------------
    getIt.registerSingleton<UserStore>(
      UserStore(
        getIt<IsLoggedInUseCase>(),
        getIt<SaveLoginStatusUseCase>(),
        getIt<LoginUseCase>(),
        getIt<FormErrorStore>(),
        getIt<ErrorStore>(),
      ),
    );

    getIt.registerSingleton<PostStore>(
      PostStore(
        getIt<GetPostUseCase>(),
        getIt<ErrorStore>(),
      ),
    );

    getIt.registerSingleton<ThemeStore>(
      ThemeStore(
        getIt<SettingRepository>(),
        getIt<ErrorStore>(),
      ),
    );

    getIt.registerSingleton<LanguageStore>(
      LanguageStore(
        getIt<SettingRepository>(),
        getIt<ErrorStore>(),
      ),
    );
  }
}
