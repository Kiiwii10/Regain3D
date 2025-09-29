import 'dart:async';

import 'package:regain3d_provisioner/data/local/datasources/post/post_datasource.dart';
import 'package:regain3d_provisioner/data/network/apis/posts/post_api.dart';
import 'package:regain3d_provisioner/data/repository/post/post_repository_impl.dart';
import 'package:regain3d_provisioner/data/repository/setting/setting_repository_impl.dart';
import 'package:regain3d_provisioner/data/repository/user/user_repository_impl.dart';
import 'package:regain3d_provisioner/data/sharedpref/shared_preference_helper.dart';
import 'package:regain3d_provisioner/domain/repository/post/post_repository.dart';
import 'package:regain3d_provisioner/domain/repository/setting/setting_repository.dart';
import 'package:regain3d_provisioner/domain/repository/user/user_repository.dart';

import '../../../di/service_locator.dart';

class RepositoryModule {
  static Future<void> configureRepositoryModuleInjection() async {
    // repository:--------------------------------------------------------------
    getIt.registerSingleton<SettingRepository>(SettingRepositoryImpl(
      getIt<SharedPreferenceHelper>(),
    ));

    getIt.registerSingleton<UserRepository>(UserRepositoryImpl(
      getIt<SharedPreferenceHelper>(),
    ));

    getIt.registerSingleton<PostRepository>(PostRepositoryImpl(
      getIt<PostApi>(),
      getIt<PostDataSource>(),
    ));
  }
}
