// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'esp_device.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

EspDevice _$EspDeviceFromJson(Map<String, dynamic> json) {
  return _EspDevice.fromJson(json);
}

/// @nodoc
mixin _$EspDevice {
  String get id => throw _privateConstructorUsedError;
  String get deviceName => throw _privateConstructorUsedError;
  String get macAddress => throw _privateConstructorUsedError;
  String? get ipAddress => throw _privateConstructorUsedError;
  EspDeviceStatus get status => throw _privateConstructorUsedError;
  EspFirmwareInfo get firmwareInfo => throw _privateConstructorUsedError;
  String? get assignedPrinterId => throw _privateConstructorUsedError;
  DateTime? get lastSeen => throw _privateConstructorUsedError;
  DateTime? get provisionedAt => throw _privateConstructorUsedError;
  Map<String, dynamic>? get config => throw _privateConstructorUsedError;

  /// Serializes this EspDevice to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of EspDevice
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $EspDeviceCopyWith<EspDevice> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $EspDeviceCopyWith<$Res> {
  factory $EspDeviceCopyWith(EspDevice value, $Res Function(EspDevice) then) =
      _$EspDeviceCopyWithImpl<$Res, EspDevice>;
  @useResult
  $Res call(
      {String id,
      String deviceName,
      String macAddress,
      String? ipAddress,
      EspDeviceStatus status,
      EspFirmwareInfo firmwareInfo,
      String? assignedPrinterId,
      DateTime? lastSeen,
      DateTime? provisionedAt,
      Map<String, dynamic>? config});

  $EspDeviceStatusCopyWith<$Res> get status;
  $EspFirmwareInfoCopyWith<$Res> get firmwareInfo;
}

/// @nodoc
class _$EspDeviceCopyWithImpl<$Res, $Val extends EspDevice>
    implements $EspDeviceCopyWith<$Res> {
  _$EspDeviceCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of EspDevice
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? deviceName = null,
    Object? macAddress = null,
    Object? ipAddress = freezed,
    Object? status = null,
    Object? firmwareInfo = null,
    Object? assignedPrinterId = freezed,
    Object? lastSeen = freezed,
    Object? provisionedAt = freezed,
    Object? config = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      deviceName: null == deviceName
          ? _value.deviceName
          : deviceName // ignore: cast_nullable_to_non_nullable
              as String,
      macAddress: null == macAddress
          ? _value.macAddress
          : macAddress // ignore: cast_nullable_to_non_nullable
              as String,
      ipAddress: freezed == ipAddress
          ? _value.ipAddress
          : ipAddress // ignore: cast_nullable_to_non_nullable
              as String?,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as EspDeviceStatus,
      firmwareInfo: null == firmwareInfo
          ? _value.firmwareInfo
          : firmwareInfo // ignore: cast_nullable_to_non_nullable
              as EspFirmwareInfo,
      assignedPrinterId: freezed == assignedPrinterId
          ? _value.assignedPrinterId
          : assignedPrinterId // ignore: cast_nullable_to_non_nullable
              as String?,
      lastSeen: freezed == lastSeen
          ? _value.lastSeen
          : lastSeen // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      provisionedAt: freezed == provisionedAt
          ? _value.provisionedAt
          : provisionedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      config: freezed == config
          ? _value.config
          : config // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
    ) as $Val);
  }

  /// Create a copy of EspDevice
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $EspDeviceStatusCopyWith<$Res> get status {
    return $EspDeviceStatusCopyWith<$Res>(_value.status, (value) {
      return _then(_value.copyWith(status: value) as $Val);
    });
  }

  /// Create a copy of EspDevice
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $EspFirmwareInfoCopyWith<$Res> get firmwareInfo {
    return $EspFirmwareInfoCopyWith<$Res>(_value.firmwareInfo, (value) {
      return _then(_value.copyWith(firmwareInfo: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$EspDeviceImplCopyWith<$Res>
    implements $EspDeviceCopyWith<$Res> {
  factory _$$EspDeviceImplCopyWith(
          _$EspDeviceImpl value, $Res Function(_$EspDeviceImpl) then) =
      __$$EspDeviceImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String deviceName,
      String macAddress,
      String? ipAddress,
      EspDeviceStatus status,
      EspFirmwareInfo firmwareInfo,
      String? assignedPrinterId,
      DateTime? lastSeen,
      DateTime? provisionedAt,
      Map<String, dynamic>? config});

  @override
  $EspDeviceStatusCopyWith<$Res> get status;
  @override
  $EspFirmwareInfoCopyWith<$Res> get firmwareInfo;
}

/// @nodoc
class __$$EspDeviceImplCopyWithImpl<$Res>
    extends _$EspDeviceCopyWithImpl<$Res, _$EspDeviceImpl>
    implements _$$EspDeviceImplCopyWith<$Res> {
  __$$EspDeviceImplCopyWithImpl(
      _$EspDeviceImpl _value, $Res Function(_$EspDeviceImpl) _then)
      : super(_value, _then);

  /// Create a copy of EspDevice
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? deviceName = null,
    Object? macAddress = null,
    Object? ipAddress = freezed,
    Object? status = null,
    Object? firmwareInfo = null,
    Object? assignedPrinterId = freezed,
    Object? lastSeen = freezed,
    Object? provisionedAt = freezed,
    Object? config = freezed,
  }) {
    return _then(_$EspDeviceImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      deviceName: null == deviceName
          ? _value.deviceName
          : deviceName // ignore: cast_nullable_to_non_nullable
              as String,
      macAddress: null == macAddress
          ? _value.macAddress
          : macAddress // ignore: cast_nullable_to_non_nullable
              as String,
      ipAddress: freezed == ipAddress
          ? _value.ipAddress
          : ipAddress // ignore: cast_nullable_to_non_nullable
              as String?,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as EspDeviceStatus,
      firmwareInfo: null == firmwareInfo
          ? _value.firmwareInfo
          : firmwareInfo // ignore: cast_nullable_to_non_nullable
              as EspFirmwareInfo,
      assignedPrinterId: freezed == assignedPrinterId
          ? _value.assignedPrinterId
          : assignedPrinterId // ignore: cast_nullable_to_non_nullable
              as String?,
      lastSeen: freezed == lastSeen
          ? _value.lastSeen
          : lastSeen // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      provisionedAt: freezed == provisionedAt
          ? _value.provisionedAt
          : provisionedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      config: freezed == config
          ? _value._config
          : config // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$EspDeviceImpl implements _EspDevice {
  const _$EspDeviceImpl(
      {required this.id,
      required this.deviceName,
      required this.macAddress,
      this.ipAddress,
      required this.status,
      required this.firmwareInfo,
      this.assignedPrinterId,
      this.lastSeen,
      this.provisionedAt,
      final Map<String, dynamic>? config})
      : _config = config;

  factory _$EspDeviceImpl.fromJson(Map<String, dynamic> json) =>
      _$$EspDeviceImplFromJson(json);

  @override
  final String id;
  @override
  final String deviceName;
  @override
  final String macAddress;
  @override
  final String? ipAddress;
  @override
  final EspDeviceStatus status;
  @override
  final EspFirmwareInfo firmwareInfo;
  @override
  final String? assignedPrinterId;
  @override
  final DateTime? lastSeen;
  @override
  final DateTime? provisionedAt;
  final Map<String, dynamic>? _config;
  @override
  Map<String, dynamic>? get config {
    final value = _config;
    if (value == null) return null;
    if (_config is EqualUnmodifiableMapView) return _config;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  @override
  String toString() {
    return 'EspDevice(id: $id, deviceName: $deviceName, macAddress: $macAddress, ipAddress: $ipAddress, status: $status, firmwareInfo: $firmwareInfo, assignedPrinterId: $assignedPrinterId, lastSeen: $lastSeen, provisionedAt: $provisionedAt, config: $config)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$EspDeviceImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.deviceName, deviceName) ||
                other.deviceName == deviceName) &&
            (identical(other.macAddress, macAddress) ||
                other.macAddress == macAddress) &&
            (identical(other.ipAddress, ipAddress) ||
                other.ipAddress == ipAddress) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.firmwareInfo, firmwareInfo) ||
                other.firmwareInfo == firmwareInfo) &&
            (identical(other.assignedPrinterId, assignedPrinterId) ||
                other.assignedPrinterId == assignedPrinterId) &&
            (identical(other.lastSeen, lastSeen) ||
                other.lastSeen == lastSeen) &&
            (identical(other.provisionedAt, provisionedAt) ||
                other.provisionedAt == provisionedAt) &&
            const DeepCollectionEquality().equals(other._config, _config));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      deviceName,
      macAddress,
      ipAddress,
      status,
      firmwareInfo,
      assignedPrinterId,
      lastSeen,
      provisionedAt,
      const DeepCollectionEquality().hash(_config));

  /// Create a copy of EspDevice
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$EspDeviceImplCopyWith<_$EspDeviceImpl> get copyWith =>
      __$$EspDeviceImplCopyWithImpl<_$EspDeviceImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$EspDeviceImplToJson(
      this,
    );
  }
}

abstract class _EspDevice implements EspDevice {
  const factory _EspDevice(
      {required final String id,
      required final String deviceName,
      required final String macAddress,
      final String? ipAddress,
      required final EspDeviceStatus status,
      required final EspFirmwareInfo firmwareInfo,
      final String? assignedPrinterId,
      final DateTime? lastSeen,
      final DateTime? provisionedAt,
      final Map<String, dynamic>? config}) = _$EspDeviceImpl;

  factory _EspDevice.fromJson(Map<String, dynamic> json) =
      _$EspDeviceImpl.fromJson;

  @override
  String get id;
  @override
  String get deviceName;
  @override
  String get macAddress;
  @override
  String? get ipAddress;
  @override
  EspDeviceStatus get status;
  @override
  EspFirmwareInfo get firmwareInfo;
  @override
  String? get assignedPrinterId;
  @override
  DateTime? get lastSeen;
  @override
  DateTime? get provisionedAt;
  @override
  Map<String, dynamic>? get config;

  /// Create a copy of EspDevice
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$EspDeviceImplCopyWith<_$EspDeviceImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

EspFirmwareInfo _$EspFirmwareInfoFromJson(Map<String, dynamic> json) {
  return _EspFirmwareInfo.fromJson(json);
}

/// @nodoc
mixin _$EspFirmwareInfo {
  String get version => throw _privateConstructorUsedError;
  List<String> get supportedSignatures => throw _privateConstructorUsedError;
  bool get isVerified => throw _privateConstructorUsedError;
  String? get signature => throw _privateConstructorUsedError;
  DateTime? get lastUpdate => throw _privateConstructorUsedError;

  /// Serializes this EspFirmwareInfo to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of EspFirmwareInfo
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $EspFirmwareInfoCopyWith<EspFirmwareInfo> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $EspFirmwareInfoCopyWith<$Res> {
  factory $EspFirmwareInfoCopyWith(
          EspFirmwareInfo value, $Res Function(EspFirmwareInfo) then) =
      _$EspFirmwareInfoCopyWithImpl<$Res, EspFirmwareInfo>;
  @useResult
  $Res call(
      {String version,
      List<String> supportedSignatures,
      bool isVerified,
      String? signature,
      DateTime? lastUpdate});
}

/// @nodoc
class _$EspFirmwareInfoCopyWithImpl<$Res, $Val extends EspFirmwareInfo>
    implements $EspFirmwareInfoCopyWith<$Res> {
  _$EspFirmwareInfoCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of EspFirmwareInfo
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? version = null,
    Object? supportedSignatures = null,
    Object? isVerified = null,
    Object? signature = freezed,
    Object? lastUpdate = freezed,
  }) {
    return _then(_value.copyWith(
      version: null == version
          ? _value.version
          : version // ignore: cast_nullable_to_non_nullable
              as String,
      supportedSignatures: null == supportedSignatures
          ? _value.supportedSignatures
          : supportedSignatures // ignore: cast_nullable_to_non_nullable
              as List<String>,
      isVerified: null == isVerified
          ? _value.isVerified
          : isVerified // ignore: cast_nullable_to_non_nullable
              as bool,
      signature: freezed == signature
          ? _value.signature
          : signature // ignore: cast_nullable_to_non_nullable
              as String?,
      lastUpdate: freezed == lastUpdate
          ? _value.lastUpdate
          : lastUpdate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$EspFirmwareInfoImplCopyWith<$Res>
    implements $EspFirmwareInfoCopyWith<$Res> {
  factory _$$EspFirmwareInfoImplCopyWith(_$EspFirmwareInfoImpl value,
          $Res Function(_$EspFirmwareInfoImpl) then) =
      __$$EspFirmwareInfoImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String version,
      List<String> supportedSignatures,
      bool isVerified,
      String? signature,
      DateTime? lastUpdate});
}

/// @nodoc
class __$$EspFirmwareInfoImplCopyWithImpl<$Res>
    extends _$EspFirmwareInfoCopyWithImpl<$Res, _$EspFirmwareInfoImpl>
    implements _$$EspFirmwareInfoImplCopyWith<$Res> {
  __$$EspFirmwareInfoImplCopyWithImpl(
      _$EspFirmwareInfoImpl _value, $Res Function(_$EspFirmwareInfoImpl) _then)
      : super(_value, _then);

  /// Create a copy of EspFirmwareInfo
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? version = null,
    Object? supportedSignatures = null,
    Object? isVerified = null,
    Object? signature = freezed,
    Object? lastUpdate = freezed,
  }) {
    return _then(_$EspFirmwareInfoImpl(
      version: null == version
          ? _value.version
          : version // ignore: cast_nullable_to_non_nullable
              as String,
      supportedSignatures: null == supportedSignatures
          ? _value._supportedSignatures
          : supportedSignatures // ignore: cast_nullable_to_non_nullable
              as List<String>,
      isVerified: null == isVerified
          ? _value.isVerified
          : isVerified // ignore: cast_nullable_to_non_nullable
              as bool,
      signature: freezed == signature
          ? _value.signature
          : signature // ignore: cast_nullable_to_non_nullable
              as String?,
      lastUpdate: freezed == lastUpdate
          ? _value.lastUpdate
          : lastUpdate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$EspFirmwareInfoImpl implements _EspFirmwareInfo {
  const _$EspFirmwareInfoImpl(
      {required this.version,
      required final List<String> supportedSignatures,
      required this.isVerified,
      this.signature,
      this.lastUpdate})
      : _supportedSignatures = supportedSignatures;

  factory _$EspFirmwareInfoImpl.fromJson(Map<String, dynamic> json) =>
      _$$EspFirmwareInfoImplFromJson(json);

  @override
  final String version;
  final List<String> _supportedSignatures;
  @override
  List<String> get supportedSignatures {
    if (_supportedSignatures is EqualUnmodifiableListView)
      return _supportedSignatures;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_supportedSignatures);
  }

  @override
  final bool isVerified;
  @override
  final String? signature;
  @override
  final DateTime? lastUpdate;

  @override
  String toString() {
    return 'EspFirmwareInfo(version: $version, supportedSignatures: $supportedSignatures, isVerified: $isVerified, signature: $signature, lastUpdate: $lastUpdate)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$EspFirmwareInfoImpl &&
            (identical(other.version, version) || other.version == version) &&
            const DeepCollectionEquality()
                .equals(other._supportedSignatures, _supportedSignatures) &&
            (identical(other.isVerified, isVerified) ||
                other.isVerified == isVerified) &&
            (identical(other.signature, signature) ||
                other.signature == signature) &&
            (identical(other.lastUpdate, lastUpdate) ||
                other.lastUpdate == lastUpdate));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      version,
      const DeepCollectionEquality().hash(_supportedSignatures),
      isVerified,
      signature,
      lastUpdate);

  /// Create a copy of EspFirmwareInfo
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$EspFirmwareInfoImplCopyWith<_$EspFirmwareInfoImpl> get copyWith =>
      __$$EspFirmwareInfoImplCopyWithImpl<_$EspFirmwareInfoImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$EspFirmwareInfoImplToJson(
      this,
    );
  }
}

abstract class _EspFirmwareInfo implements EspFirmwareInfo {
  const factory _EspFirmwareInfo(
      {required final String version,
      required final List<String> supportedSignatures,
      required final bool isVerified,
      final String? signature,
      final DateTime? lastUpdate}) = _$EspFirmwareInfoImpl;

  factory _EspFirmwareInfo.fromJson(Map<String, dynamic> json) =
      _$EspFirmwareInfoImpl.fromJson;

  @override
  String get version;
  @override
  List<String> get supportedSignatures;
  @override
  bool get isVerified;
  @override
  String? get signature;
  @override
  DateTime? get lastUpdate;

  /// Create a copy of EspFirmwareInfo
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$EspFirmwareInfoImplCopyWith<_$EspFirmwareInfoImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

EspDeviceStatus _$EspDeviceStatusFromJson(Map<String, dynamic> json) {
  switch (json['runtimeType']) {
    case 'discovered':
      return Discovered.fromJson(json);
    case 'connecting':
      return Connecting.fromJson(json);
    case 'connected':
      return Connected.fromJson(json);
    case 'provisioning':
      return Provisioning.fromJson(json);
    case 'provisioned':
      return Provisioned.fromJson(json);
    case 'error':
      return Error.fromJson(json);
    case 'offline':
      return Offline.fromJson(json);

    default:
      throw CheckedFromJsonException(json, 'runtimeType', 'EspDeviceStatus',
          'Invalid union type "${json['runtimeType']}"!');
  }
}

/// @nodoc
mixin _$EspDeviceStatus {
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() discovered,
    required TResult Function() connecting,
    required TResult Function() connected,
    required TResult Function() provisioning,
    required TResult Function(String networkName, String ipAddress) provisioned,
    required TResult Function(String message) error,
    required TResult Function() offline,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? discovered,
    TResult? Function()? connecting,
    TResult? Function()? connected,
    TResult? Function()? provisioning,
    TResult? Function(String networkName, String ipAddress)? provisioned,
    TResult? Function(String message)? error,
    TResult? Function()? offline,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? discovered,
    TResult Function()? connecting,
    TResult Function()? connected,
    TResult Function()? provisioning,
    TResult Function(String networkName, String ipAddress)? provisioned,
    TResult Function(String message)? error,
    TResult Function()? offline,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(Discovered value) discovered,
    required TResult Function(Connecting value) connecting,
    required TResult Function(Connected value) connected,
    required TResult Function(Provisioning value) provisioning,
    required TResult Function(Provisioned value) provisioned,
    required TResult Function(Error value) error,
    required TResult Function(Offline value) offline,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(Discovered value)? discovered,
    TResult? Function(Connecting value)? connecting,
    TResult? Function(Connected value)? connected,
    TResult? Function(Provisioning value)? provisioning,
    TResult? Function(Provisioned value)? provisioned,
    TResult? Function(Error value)? error,
    TResult? Function(Offline value)? offline,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(Discovered value)? discovered,
    TResult Function(Connecting value)? connecting,
    TResult Function(Connected value)? connected,
    TResult Function(Provisioning value)? provisioning,
    TResult Function(Provisioned value)? provisioned,
    TResult Function(Error value)? error,
    TResult Function(Offline value)? offline,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;

  /// Serializes this EspDeviceStatus to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $EspDeviceStatusCopyWith<$Res> {
  factory $EspDeviceStatusCopyWith(
          EspDeviceStatus value, $Res Function(EspDeviceStatus) then) =
      _$EspDeviceStatusCopyWithImpl<$Res, EspDeviceStatus>;
}

/// @nodoc
class _$EspDeviceStatusCopyWithImpl<$Res, $Val extends EspDeviceStatus>
    implements $EspDeviceStatusCopyWith<$Res> {
  _$EspDeviceStatusCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of EspDeviceStatus
  /// with the given fields replaced by the non-null parameter values.
}

/// @nodoc
abstract class _$$DiscoveredImplCopyWith<$Res> {
  factory _$$DiscoveredImplCopyWith(
          _$DiscoveredImpl value, $Res Function(_$DiscoveredImpl) then) =
      __$$DiscoveredImplCopyWithImpl<$Res>;
}

/// @nodoc
class __$$DiscoveredImplCopyWithImpl<$Res>
    extends _$EspDeviceStatusCopyWithImpl<$Res, _$DiscoveredImpl>
    implements _$$DiscoveredImplCopyWith<$Res> {
  __$$DiscoveredImplCopyWithImpl(
      _$DiscoveredImpl _value, $Res Function(_$DiscoveredImpl) _then)
      : super(_value, _then);

  /// Create a copy of EspDeviceStatus
  /// with the given fields replaced by the non-null parameter values.
}

/// @nodoc
@JsonSerializable()
class _$DiscoveredImpl implements Discovered {
  const _$DiscoveredImpl({final String? $type}) : $type = $type ?? 'discovered';

  factory _$DiscoveredImpl.fromJson(Map<String, dynamic> json) =>
      _$$DiscoveredImplFromJson(json);

  @JsonKey(name: 'runtimeType')
  final String $type;

  @override
  String toString() {
    return 'EspDeviceStatus.discovered()';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType && other is _$DiscoveredImpl);
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => runtimeType.hashCode;

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() discovered,
    required TResult Function() connecting,
    required TResult Function() connected,
    required TResult Function() provisioning,
    required TResult Function(String networkName, String ipAddress) provisioned,
    required TResult Function(String message) error,
    required TResult Function() offline,
  }) {
    return discovered();
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? discovered,
    TResult? Function()? connecting,
    TResult? Function()? connected,
    TResult? Function()? provisioning,
    TResult? Function(String networkName, String ipAddress)? provisioned,
    TResult? Function(String message)? error,
    TResult? Function()? offline,
  }) {
    return discovered?.call();
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? discovered,
    TResult Function()? connecting,
    TResult Function()? connected,
    TResult Function()? provisioning,
    TResult Function(String networkName, String ipAddress)? provisioned,
    TResult Function(String message)? error,
    TResult Function()? offline,
    required TResult orElse(),
  }) {
    if (discovered != null) {
      return discovered();
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(Discovered value) discovered,
    required TResult Function(Connecting value) connecting,
    required TResult Function(Connected value) connected,
    required TResult Function(Provisioning value) provisioning,
    required TResult Function(Provisioned value) provisioned,
    required TResult Function(Error value) error,
    required TResult Function(Offline value) offline,
  }) {
    return discovered(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(Discovered value)? discovered,
    TResult? Function(Connecting value)? connecting,
    TResult? Function(Connected value)? connected,
    TResult? Function(Provisioning value)? provisioning,
    TResult? Function(Provisioned value)? provisioned,
    TResult? Function(Error value)? error,
    TResult? Function(Offline value)? offline,
  }) {
    return discovered?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(Discovered value)? discovered,
    TResult Function(Connecting value)? connecting,
    TResult Function(Connected value)? connected,
    TResult Function(Provisioning value)? provisioning,
    TResult Function(Provisioned value)? provisioned,
    TResult Function(Error value)? error,
    TResult Function(Offline value)? offline,
    required TResult orElse(),
  }) {
    if (discovered != null) {
      return discovered(this);
    }
    return orElse();
  }

  @override
  Map<String, dynamic> toJson() {
    return _$$DiscoveredImplToJson(
      this,
    );
  }
}

abstract class Discovered implements EspDeviceStatus {
  const factory Discovered() = _$DiscoveredImpl;

  factory Discovered.fromJson(Map<String, dynamic> json) =
      _$DiscoveredImpl.fromJson;
}

/// @nodoc
abstract class _$$ConnectingImplCopyWith<$Res> {
  factory _$$ConnectingImplCopyWith(
          _$ConnectingImpl value, $Res Function(_$ConnectingImpl) then) =
      __$$ConnectingImplCopyWithImpl<$Res>;
}

/// @nodoc
class __$$ConnectingImplCopyWithImpl<$Res>
    extends _$EspDeviceStatusCopyWithImpl<$Res, _$ConnectingImpl>
    implements _$$ConnectingImplCopyWith<$Res> {
  __$$ConnectingImplCopyWithImpl(
      _$ConnectingImpl _value, $Res Function(_$ConnectingImpl) _then)
      : super(_value, _then);

  /// Create a copy of EspDeviceStatus
  /// with the given fields replaced by the non-null parameter values.
}

/// @nodoc
@JsonSerializable()
class _$ConnectingImpl implements Connecting {
  const _$ConnectingImpl({final String? $type}) : $type = $type ?? 'connecting';

  factory _$ConnectingImpl.fromJson(Map<String, dynamic> json) =>
      _$$ConnectingImplFromJson(json);

  @JsonKey(name: 'runtimeType')
  final String $type;

  @override
  String toString() {
    return 'EspDeviceStatus.connecting()';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType && other is _$ConnectingImpl);
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => runtimeType.hashCode;

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() discovered,
    required TResult Function() connecting,
    required TResult Function() connected,
    required TResult Function() provisioning,
    required TResult Function(String networkName, String ipAddress) provisioned,
    required TResult Function(String message) error,
    required TResult Function() offline,
  }) {
    return connecting();
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? discovered,
    TResult? Function()? connecting,
    TResult? Function()? connected,
    TResult? Function()? provisioning,
    TResult? Function(String networkName, String ipAddress)? provisioned,
    TResult? Function(String message)? error,
    TResult? Function()? offline,
  }) {
    return connecting?.call();
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? discovered,
    TResult Function()? connecting,
    TResult Function()? connected,
    TResult Function()? provisioning,
    TResult Function(String networkName, String ipAddress)? provisioned,
    TResult Function(String message)? error,
    TResult Function()? offline,
    required TResult orElse(),
  }) {
    if (connecting != null) {
      return connecting();
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(Discovered value) discovered,
    required TResult Function(Connecting value) connecting,
    required TResult Function(Connected value) connected,
    required TResult Function(Provisioning value) provisioning,
    required TResult Function(Provisioned value) provisioned,
    required TResult Function(Error value) error,
    required TResult Function(Offline value) offline,
  }) {
    return connecting(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(Discovered value)? discovered,
    TResult? Function(Connecting value)? connecting,
    TResult? Function(Connected value)? connected,
    TResult? Function(Provisioning value)? provisioning,
    TResult? Function(Provisioned value)? provisioned,
    TResult? Function(Error value)? error,
    TResult? Function(Offline value)? offline,
  }) {
    return connecting?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(Discovered value)? discovered,
    TResult Function(Connecting value)? connecting,
    TResult Function(Connected value)? connected,
    TResult Function(Provisioning value)? provisioning,
    TResult Function(Provisioned value)? provisioned,
    TResult Function(Error value)? error,
    TResult Function(Offline value)? offline,
    required TResult orElse(),
  }) {
    if (connecting != null) {
      return connecting(this);
    }
    return orElse();
  }

  @override
  Map<String, dynamic> toJson() {
    return _$$ConnectingImplToJson(
      this,
    );
  }
}

abstract class Connecting implements EspDeviceStatus {
  const factory Connecting() = _$ConnectingImpl;

  factory Connecting.fromJson(Map<String, dynamic> json) =
      _$ConnectingImpl.fromJson;
}

/// @nodoc
abstract class _$$ConnectedImplCopyWith<$Res> {
  factory _$$ConnectedImplCopyWith(
          _$ConnectedImpl value, $Res Function(_$ConnectedImpl) then) =
      __$$ConnectedImplCopyWithImpl<$Res>;
}

/// @nodoc
class __$$ConnectedImplCopyWithImpl<$Res>
    extends _$EspDeviceStatusCopyWithImpl<$Res, _$ConnectedImpl>
    implements _$$ConnectedImplCopyWith<$Res> {
  __$$ConnectedImplCopyWithImpl(
      _$ConnectedImpl _value, $Res Function(_$ConnectedImpl) _then)
      : super(_value, _then);

  /// Create a copy of EspDeviceStatus
  /// with the given fields replaced by the non-null parameter values.
}

/// @nodoc
@JsonSerializable()
class _$ConnectedImpl implements Connected {
  const _$ConnectedImpl({final String? $type}) : $type = $type ?? 'connected';

  factory _$ConnectedImpl.fromJson(Map<String, dynamic> json) =>
      _$$ConnectedImplFromJson(json);

  @JsonKey(name: 'runtimeType')
  final String $type;

  @override
  String toString() {
    return 'EspDeviceStatus.connected()';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType && other is _$ConnectedImpl);
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => runtimeType.hashCode;

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() discovered,
    required TResult Function() connecting,
    required TResult Function() connected,
    required TResult Function() provisioning,
    required TResult Function(String networkName, String ipAddress) provisioned,
    required TResult Function(String message) error,
    required TResult Function() offline,
  }) {
    return connected();
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? discovered,
    TResult? Function()? connecting,
    TResult? Function()? connected,
    TResult? Function()? provisioning,
    TResult? Function(String networkName, String ipAddress)? provisioned,
    TResult? Function(String message)? error,
    TResult? Function()? offline,
  }) {
    return connected?.call();
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? discovered,
    TResult Function()? connecting,
    TResult Function()? connected,
    TResult Function()? provisioning,
    TResult Function(String networkName, String ipAddress)? provisioned,
    TResult Function(String message)? error,
    TResult Function()? offline,
    required TResult orElse(),
  }) {
    if (connected != null) {
      return connected();
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(Discovered value) discovered,
    required TResult Function(Connecting value) connecting,
    required TResult Function(Connected value) connected,
    required TResult Function(Provisioning value) provisioning,
    required TResult Function(Provisioned value) provisioned,
    required TResult Function(Error value) error,
    required TResult Function(Offline value) offline,
  }) {
    return connected(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(Discovered value)? discovered,
    TResult? Function(Connecting value)? connecting,
    TResult? Function(Connected value)? connected,
    TResult? Function(Provisioning value)? provisioning,
    TResult? Function(Provisioned value)? provisioned,
    TResult? Function(Error value)? error,
    TResult? Function(Offline value)? offline,
  }) {
    return connected?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(Discovered value)? discovered,
    TResult Function(Connecting value)? connecting,
    TResult Function(Connected value)? connected,
    TResult Function(Provisioning value)? provisioning,
    TResult Function(Provisioned value)? provisioned,
    TResult Function(Error value)? error,
    TResult Function(Offline value)? offline,
    required TResult orElse(),
  }) {
    if (connected != null) {
      return connected(this);
    }
    return orElse();
  }

  @override
  Map<String, dynamic> toJson() {
    return _$$ConnectedImplToJson(
      this,
    );
  }
}

abstract class Connected implements EspDeviceStatus {
  const factory Connected() = _$ConnectedImpl;

  factory Connected.fromJson(Map<String, dynamic> json) =
      _$ConnectedImpl.fromJson;
}

/// @nodoc
abstract class _$$ProvisioningImplCopyWith<$Res> {
  factory _$$ProvisioningImplCopyWith(
          _$ProvisioningImpl value, $Res Function(_$ProvisioningImpl) then) =
      __$$ProvisioningImplCopyWithImpl<$Res>;
}

/// @nodoc
class __$$ProvisioningImplCopyWithImpl<$Res>
    extends _$EspDeviceStatusCopyWithImpl<$Res, _$ProvisioningImpl>
    implements _$$ProvisioningImplCopyWith<$Res> {
  __$$ProvisioningImplCopyWithImpl(
      _$ProvisioningImpl _value, $Res Function(_$ProvisioningImpl) _then)
      : super(_value, _then);

  /// Create a copy of EspDeviceStatus
  /// with the given fields replaced by the non-null parameter values.
}

/// @nodoc
@JsonSerializable()
class _$ProvisioningImpl implements Provisioning {
  const _$ProvisioningImpl({final String? $type})
      : $type = $type ?? 'provisioning';

  factory _$ProvisioningImpl.fromJson(Map<String, dynamic> json) =>
      _$$ProvisioningImplFromJson(json);

  @JsonKey(name: 'runtimeType')
  final String $type;

  @override
  String toString() {
    return 'EspDeviceStatus.provisioning()';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType && other is _$ProvisioningImpl);
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => runtimeType.hashCode;

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() discovered,
    required TResult Function() connecting,
    required TResult Function() connected,
    required TResult Function() provisioning,
    required TResult Function(String networkName, String ipAddress) provisioned,
    required TResult Function(String message) error,
    required TResult Function() offline,
  }) {
    return provisioning();
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? discovered,
    TResult? Function()? connecting,
    TResult? Function()? connected,
    TResult? Function()? provisioning,
    TResult? Function(String networkName, String ipAddress)? provisioned,
    TResult? Function(String message)? error,
    TResult? Function()? offline,
  }) {
    return provisioning?.call();
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? discovered,
    TResult Function()? connecting,
    TResult Function()? connected,
    TResult Function()? provisioning,
    TResult Function(String networkName, String ipAddress)? provisioned,
    TResult Function(String message)? error,
    TResult Function()? offline,
    required TResult orElse(),
  }) {
    if (provisioning != null) {
      return provisioning();
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(Discovered value) discovered,
    required TResult Function(Connecting value) connecting,
    required TResult Function(Connected value) connected,
    required TResult Function(Provisioning value) provisioning,
    required TResult Function(Provisioned value) provisioned,
    required TResult Function(Error value) error,
    required TResult Function(Offline value) offline,
  }) {
    return provisioning(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(Discovered value)? discovered,
    TResult? Function(Connecting value)? connecting,
    TResult? Function(Connected value)? connected,
    TResult? Function(Provisioning value)? provisioning,
    TResult? Function(Provisioned value)? provisioned,
    TResult? Function(Error value)? error,
    TResult? Function(Offline value)? offline,
  }) {
    return provisioning?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(Discovered value)? discovered,
    TResult Function(Connecting value)? connecting,
    TResult Function(Connected value)? connected,
    TResult Function(Provisioning value)? provisioning,
    TResult Function(Provisioned value)? provisioned,
    TResult Function(Error value)? error,
    TResult Function(Offline value)? offline,
    required TResult orElse(),
  }) {
    if (provisioning != null) {
      return provisioning(this);
    }
    return orElse();
  }

  @override
  Map<String, dynamic> toJson() {
    return _$$ProvisioningImplToJson(
      this,
    );
  }
}

abstract class Provisioning implements EspDeviceStatus {
  const factory Provisioning() = _$ProvisioningImpl;

  factory Provisioning.fromJson(Map<String, dynamic> json) =
      _$ProvisioningImpl.fromJson;
}

/// @nodoc
abstract class _$$ProvisionedImplCopyWith<$Res> {
  factory _$$ProvisionedImplCopyWith(
          _$ProvisionedImpl value, $Res Function(_$ProvisionedImpl) then) =
      __$$ProvisionedImplCopyWithImpl<$Res>;
  @useResult
  $Res call({String networkName, String ipAddress});
}

/// @nodoc
class __$$ProvisionedImplCopyWithImpl<$Res>
    extends _$EspDeviceStatusCopyWithImpl<$Res, _$ProvisionedImpl>
    implements _$$ProvisionedImplCopyWith<$Res> {
  __$$ProvisionedImplCopyWithImpl(
      _$ProvisionedImpl _value, $Res Function(_$ProvisionedImpl) _then)
      : super(_value, _then);

  /// Create a copy of EspDeviceStatus
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? networkName = null,
    Object? ipAddress = null,
  }) {
    return _then(_$ProvisionedImpl(
      networkName: null == networkName
          ? _value.networkName
          : networkName // ignore: cast_nullable_to_non_nullable
              as String,
      ipAddress: null == ipAddress
          ? _value.ipAddress
          : ipAddress // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ProvisionedImpl implements Provisioned {
  const _$ProvisionedImpl(
      {required this.networkName, required this.ipAddress, final String? $type})
      : $type = $type ?? 'provisioned';

  factory _$ProvisionedImpl.fromJson(Map<String, dynamic> json) =>
      _$$ProvisionedImplFromJson(json);

  @override
  final String networkName;
  @override
  final String ipAddress;

  @JsonKey(name: 'runtimeType')
  final String $type;

  @override
  String toString() {
    return 'EspDeviceStatus.provisioned(networkName: $networkName, ipAddress: $ipAddress)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ProvisionedImpl &&
            (identical(other.networkName, networkName) ||
                other.networkName == networkName) &&
            (identical(other.ipAddress, ipAddress) ||
                other.ipAddress == ipAddress));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, networkName, ipAddress);

  /// Create a copy of EspDeviceStatus
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ProvisionedImplCopyWith<_$ProvisionedImpl> get copyWith =>
      __$$ProvisionedImplCopyWithImpl<_$ProvisionedImpl>(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() discovered,
    required TResult Function() connecting,
    required TResult Function() connected,
    required TResult Function() provisioning,
    required TResult Function(String networkName, String ipAddress) provisioned,
    required TResult Function(String message) error,
    required TResult Function() offline,
  }) {
    return provisioned(networkName, ipAddress);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? discovered,
    TResult? Function()? connecting,
    TResult? Function()? connected,
    TResult? Function()? provisioning,
    TResult? Function(String networkName, String ipAddress)? provisioned,
    TResult? Function(String message)? error,
    TResult? Function()? offline,
  }) {
    return provisioned?.call(networkName, ipAddress);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? discovered,
    TResult Function()? connecting,
    TResult Function()? connected,
    TResult Function()? provisioning,
    TResult Function(String networkName, String ipAddress)? provisioned,
    TResult Function(String message)? error,
    TResult Function()? offline,
    required TResult orElse(),
  }) {
    if (provisioned != null) {
      return provisioned(networkName, ipAddress);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(Discovered value) discovered,
    required TResult Function(Connecting value) connecting,
    required TResult Function(Connected value) connected,
    required TResult Function(Provisioning value) provisioning,
    required TResult Function(Provisioned value) provisioned,
    required TResult Function(Error value) error,
    required TResult Function(Offline value) offline,
  }) {
    return provisioned(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(Discovered value)? discovered,
    TResult? Function(Connecting value)? connecting,
    TResult? Function(Connected value)? connected,
    TResult? Function(Provisioning value)? provisioning,
    TResult? Function(Provisioned value)? provisioned,
    TResult? Function(Error value)? error,
    TResult? Function(Offline value)? offline,
  }) {
    return provisioned?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(Discovered value)? discovered,
    TResult Function(Connecting value)? connecting,
    TResult Function(Connected value)? connected,
    TResult Function(Provisioning value)? provisioning,
    TResult Function(Provisioned value)? provisioned,
    TResult Function(Error value)? error,
    TResult Function(Offline value)? offline,
    required TResult orElse(),
  }) {
    if (provisioned != null) {
      return provisioned(this);
    }
    return orElse();
  }

  @override
  Map<String, dynamic> toJson() {
    return _$$ProvisionedImplToJson(
      this,
    );
  }
}

abstract class Provisioned implements EspDeviceStatus {
  const factory Provisioned(
      {required final String networkName,
      required final String ipAddress}) = _$ProvisionedImpl;

  factory Provisioned.fromJson(Map<String, dynamic> json) =
      _$ProvisionedImpl.fromJson;

  String get networkName;
  String get ipAddress;

  /// Create a copy of EspDeviceStatus
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ProvisionedImplCopyWith<_$ProvisionedImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$ErrorImplCopyWith<$Res> {
  factory _$$ErrorImplCopyWith(
          _$ErrorImpl value, $Res Function(_$ErrorImpl) then) =
      __$$ErrorImplCopyWithImpl<$Res>;
  @useResult
  $Res call({String message});
}

/// @nodoc
class __$$ErrorImplCopyWithImpl<$Res>
    extends _$EspDeviceStatusCopyWithImpl<$Res, _$ErrorImpl>
    implements _$$ErrorImplCopyWith<$Res> {
  __$$ErrorImplCopyWithImpl(
      _$ErrorImpl _value, $Res Function(_$ErrorImpl) _then)
      : super(_value, _then);

  /// Create a copy of EspDeviceStatus
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? message = null,
  }) {
    return _then(_$ErrorImpl(
      message: null == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ErrorImpl implements Error {
  const _$ErrorImpl({required this.message, final String? $type})
      : $type = $type ?? 'error';

  factory _$ErrorImpl.fromJson(Map<String, dynamic> json) =>
      _$$ErrorImplFromJson(json);

  @override
  final String message;

  @JsonKey(name: 'runtimeType')
  final String $type;

  @override
  String toString() {
    return 'EspDeviceStatus.error(message: $message)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ErrorImpl &&
            (identical(other.message, message) || other.message == message));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, message);

  /// Create a copy of EspDeviceStatus
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ErrorImplCopyWith<_$ErrorImpl> get copyWith =>
      __$$ErrorImplCopyWithImpl<_$ErrorImpl>(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() discovered,
    required TResult Function() connecting,
    required TResult Function() connected,
    required TResult Function() provisioning,
    required TResult Function(String networkName, String ipAddress) provisioned,
    required TResult Function(String message) error,
    required TResult Function() offline,
  }) {
    return error(message);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? discovered,
    TResult? Function()? connecting,
    TResult? Function()? connected,
    TResult? Function()? provisioning,
    TResult? Function(String networkName, String ipAddress)? provisioned,
    TResult? Function(String message)? error,
    TResult? Function()? offline,
  }) {
    return error?.call(message);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? discovered,
    TResult Function()? connecting,
    TResult Function()? connected,
    TResult Function()? provisioning,
    TResult Function(String networkName, String ipAddress)? provisioned,
    TResult Function(String message)? error,
    TResult Function()? offline,
    required TResult orElse(),
  }) {
    if (error != null) {
      return error(message);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(Discovered value) discovered,
    required TResult Function(Connecting value) connecting,
    required TResult Function(Connected value) connected,
    required TResult Function(Provisioning value) provisioning,
    required TResult Function(Provisioned value) provisioned,
    required TResult Function(Error value) error,
    required TResult Function(Offline value) offline,
  }) {
    return error(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(Discovered value)? discovered,
    TResult? Function(Connecting value)? connecting,
    TResult? Function(Connected value)? connected,
    TResult? Function(Provisioning value)? provisioning,
    TResult? Function(Provisioned value)? provisioned,
    TResult? Function(Error value)? error,
    TResult? Function(Offline value)? offline,
  }) {
    return error?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(Discovered value)? discovered,
    TResult Function(Connecting value)? connecting,
    TResult Function(Connected value)? connected,
    TResult Function(Provisioning value)? provisioning,
    TResult Function(Provisioned value)? provisioned,
    TResult Function(Error value)? error,
    TResult Function(Offline value)? offline,
    required TResult orElse(),
  }) {
    if (error != null) {
      return error(this);
    }
    return orElse();
  }

  @override
  Map<String, dynamic> toJson() {
    return _$$ErrorImplToJson(
      this,
    );
  }
}

abstract class Error implements EspDeviceStatus {
  const factory Error({required final String message}) = _$ErrorImpl;

  factory Error.fromJson(Map<String, dynamic> json) = _$ErrorImpl.fromJson;

  String get message;

  /// Create a copy of EspDeviceStatus
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ErrorImplCopyWith<_$ErrorImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$OfflineImplCopyWith<$Res> {
  factory _$$OfflineImplCopyWith(
          _$OfflineImpl value, $Res Function(_$OfflineImpl) then) =
      __$$OfflineImplCopyWithImpl<$Res>;
}

/// @nodoc
class __$$OfflineImplCopyWithImpl<$Res>
    extends _$EspDeviceStatusCopyWithImpl<$Res, _$OfflineImpl>
    implements _$$OfflineImplCopyWith<$Res> {
  __$$OfflineImplCopyWithImpl(
      _$OfflineImpl _value, $Res Function(_$OfflineImpl) _then)
      : super(_value, _then);

  /// Create a copy of EspDeviceStatus
  /// with the given fields replaced by the non-null parameter values.
}

/// @nodoc
@JsonSerializable()
class _$OfflineImpl implements Offline {
  const _$OfflineImpl({final String? $type}) : $type = $type ?? 'offline';

  factory _$OfflineImpl.fromJson(Map<String, dynamic> json) =>
      _$$OfflineImplFromJson(json);

  @JsonKey(name: 'runtimeType')
  final String $type;

  @override
  String toString() {
    return 'EspDeviceStatus.offline()';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType && other is _$OfflineImpl);
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => runtimeType.hashCode;

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() discovered,
    required TResult Function() connecting,
    required TResult Function() connected,
    required TResult Function() provisioning,
    required TResult Function(String networkName, String ipAddress) provisioned,
    required TResult Function(String message) error,
    required TResult Function() offline,
  }) {
    return offline();
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? discovered,
    TResult? Function()? connecting,
    TResult? Function()? connected,
    TResult? Function()? provisioning,
    TResult? Function(String networkName, String ipAddress)? provisioned,
    TResult? Function(String message)? error,
    TResult? Function()? offline,
  }) {
    return offline?.call();
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? discovered,
    TResult Function()? connecting,
    TResult Function()? connected,
    TResult Function()? provisioning,
    TResult Function(String networkName, String ipAddress)? provisioned,
    TResult Function(String message)? error,
    TResult Function()? offline,
    required TResult orElse(),
  }) {
    if (offline != null) {
      return offline();
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(Discovered value) discovered,
    required TResult Function(Connecting value) connecting,
    required TResult Function(Connected value) connected,
    required TResult Function(Provisioning value) provisioning,
    required TResult Function(Provisioned value) provisioned,
    required TResult Function(Error value) error,
    required TResult Function(Offline value) offline,
  }) {
    return offline(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(Discovered value)? discovered,
    TResult? Function(Connecting value)? connecting,
    TResult? Function(Connected value)? connected,
    TResult? Function(Provisioning value)? provisioning,
    TResult? Function(Provisioned value)? provisioned,
    TResult? Function(Error value)? error,
    TResult? Function(Offline value)? offline,
  }) {
    return offline?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(Discovered value)? discovered,
    TResult Function(Connecting value)? connecting,
    TResult Function(Connected value)? connected,
    TResult Function(Provisioning value)? provisioning,
    TResult Function(Provisioned value)? provisioned,
    TResult Function(Error value)? error,
    TResult Function(Offline value)? offline,
    required TResult orElse(),
  }) {
    if (offline != null) {
      return offline(this);
    }
    return orElse();
  }

  @override
  Map<String, dynamic> toJson() {
    return _$$OfflineImplToJson(
      this,
    );
  }
}

abstract class Offline implements EspDeviceStatus {
  const factory Offline() = _$OfflineImpl;

  factory Offline.fromJson(Map<String, dynamic> json) = _$OfflineImpl.fromJson;
}

BleScanResult _$BleScanResultFromJson(Map<String, dynamic> json) {
  return _BleScanResult.fromJson(json);
}

/// @nodoc
mixin _$BleScanResult {
  String get deviceId => throw _privateConstructorUsedError;
  String get deviceName => throw _privateConstructorUsedError;
  int get rssi => throw _privateConstructorUsedError;
  Map<String, dynamic> get manufacturerData =>
      throw _privateConstructorUsedError;
  List<String> get serviceUuids => throw _privateConstructorUsedError;
  DateTime? get lastSeen => throw _privateConstructorUsedError;

  /// Serializes this BleScanResult to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of BleScanResult
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $BleScanResultCopyWith<BleScanResult> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $BleScanResultCopyWith<$Res> {
  factory $BleScanResultCopyWith(
          BleScanResult value, $Res Function(BleScanResult) then) =
      _$BleScanResultCopyWithImpl<$Res, BleScanResult>;
  @useResult
  $Res call(
      {String deviceId,
      String deviceName,
      int rssi,
      Map<String, dynamic> manufacturerData,
      List<String> serviceUuids,
      DateTime? lastSeen});
}

/// @nodoc
class _$BleScanResultCopyWithImpl<$Res, $Val extends BleScanResult>
    implements $BleScanResultCopyWith<$Res> {
  _$BleScanResultCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of BleScanResult
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? deviceId = null,
    Object? deviceName = null,
    Object? rssi = null,
    Object? manufacturerData = null,
    Object? serviceUuids = null,
    Object? lastSeen = freezed,
  }) {
    return _then(_value.copyWith(
      deviceId: null == deviceId
          ? _value.deviceId
          : deviceId // ignore: cast_nullable_to_non_nullable
              as String,
      deviceName: null == deviceName
          ? _value.deviceName
          : deviceName // ignore: cast_nullable_to_non_nullable
              as String,
      rssi: null == rssi
          ? _value.rssi
          : rssi // ignore: cast_nullable_to_non_nullable
              as int,
      manufacturerData: null == manufacturerData
          ? _value.manufacturerData
          : manufacturerData // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>,
      serviceUuids: null == serviceUuids
          ? _value.serviceUuids
          : serviceUuids // ignore: cast_nullable_to_non_nullable
              as List<String>,
      lastSeen: freezed == lastSeen
          ? _value.lastSeen
          : lastSeen // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$BleScanResultImplCopyWith<$Res>
    implements $BleScanResultCopyWith<$Res> {
  factory _$$BleScanResultImplCopyWith(
          _$BleScanResultImpl value, $Res Function(_$BleScanResultImpl) then) =
      __$$BleScanResultImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String deviceId,
      String deviceName,
      int rssi,
      Map<String, dynamic> manufacturerData,
      List<String> serviceUuids,
      DateTime? lastSeen});
}

/// @nodoc
class __$$BleScanResultImplCopyWithImpl<$Res>
    extends _$BleScanResultCopyWithImpl<$Res, _$BleScanResultImpl>
    implements _$$BleScanResultImplCopyWith<$Res> {
  __$$BleScanResultImplCopyWithImpl(
      _$BleScanResultImpl _value, $Res Function(_$BleScanResultImpl) _then)
      : super(_value, _then);

  /// Create a copy of BleScanResult
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? deviceId = null,
    Object? deviceName = null,
    Object? rssi = null,
    Object? manufacturerData = null,
    Object? serviceUuids = null,
    Object? lastSeen = freezed,
  }) {
    return _then(_$BleScanResultImpl(
      deviceId: null == deviceId
          ? _value.deviceId
          : deviceId // ignore: cast_nullable_to_non_nullable
              as String,
      deviceName: null == deviceName
          ? _value.deviceName
          : deviceName // ignore: cast_nullable_to_non_nullable
              as String,
      rssi: null == rssi
          ? _value.rssi
          : rssi // ignore: cast_nullable_to_non_nullable
              as int,
      manufacturerData: null == manufacturerData
          ? _value._manufacturerData
          : manufacturerData // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>,
      serviceUuids: null == serviceUuids
          ? _value._serviceUuids
          : serviceUuids // ignore: cast_nullable_to_non_nullable
              as List<String>,
      lastSeen: freezed == lastSeen
          ? _value.lastSeen
          : lastSeen // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$BleScanResultImpl implements _BleScanResult {
  const _$BleScanResultImpl(
      {required this.deviceId,
      required this.deviceName,
      required this.rssi,
      required final Map<String, dynamic> manufacturerData,
      required final List<String> serviceUuids,
      this.lastSeen})
      : _manufacturerData = manufacturerData,
        _serviceUuids = serviceUuids;

  factory _$BleScanResultImpl.fromJson(Map<String, dynamic> json) =>
      _$$BleScanResultImplFromJson(json);

  @override
  final String deviceId;
  @override
  final String deviceName;
  @override
  final int rssi;
  final Map<String, dynamic> _manufacturerData;
  @override
  Map<String, dynamic> get manufacturerData {
    if (_manufacturerData is EqualUnmodifiableMapView) return _manufacturerData;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_manufacturerData);
  }

  final List<String> _serviceUuids;
  @override
  List<String> get serviceUuids {
    if (_serviceUuids is EqualUnmodifiableListView) return _serviceUuids;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_serviceUuids);
  }

  @override
  final DateTime? lastSeen;

  @override
  String toString() {
    return 'BleScanResult(deviceId: $deviceId, deviceName: $deviceName, rssi: $rssi, manufacturerData: $manufacturerData, serviceUuids: $serviceUuids, lastSeen: $lastSeen)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$BleScanResultImpl &&
            (identical(other.deviceId, deviceId) ||
                other.deviceId == deviceId) &&
            (identical(other.deviceName, deviceName) ||
                other.deviceName == deviceName) &&
            (identical(other.rssi, rssi) || other.rssi == rssi) &&
            const DeepCollectionEquality()
                .equals(other._manufacturerData, _manufacturerData) &&
            const DeepCollectionEquality()
                .equals(other._serviceUuids, _serviceUuids) &&
            (identical(other.lastSeen, lastSeen) ||
                other.lastSeen == lastSeen));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      deviceId,
      deviceName,
      rssi,
      const DeepCollectionEquality().hash(_manufacturerData),
      const DeepCollectionEquality().hash(_serviceUuids),
      lastSeen);

  /// Create a copy of BleScanResult
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$BleScanResultImplCopyWith<_$BleScanResultImpl> get copyWith =>
      __$$BleScanResultImplCopyWithImpl<_$BleScanResultImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$BleScanResultImplToJson(
      this,
    );
  }
}

abstract class _BleScanResult implements BleScanResult {
  const factory _BleScanResult(
      {required final String deviceId,
      required final String deviceName,
      required final int rssi,
      required final Map<String, dynamic> manufacturerData,
      required final List<String> serviceUuids,
      final DateTime? lastSeen}) = _$BleScanResultImpl;

  factory _BleScanResult.fromJson(Map<String, dynamic> json) =
      _$BleScanResultImpl.fromJson;

  @override
  String get deviceId;
  @override
  String get deviceName;
  @override
  int get rssi;
  @override
  Map<String, dynamic> get manufacturerData;
  @override
  List<String> get serviceUuids;
  @override
  DateTime? get lastSeen;

  /// Create a copy of BleScanResult
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$BleScanResultImplCopyWith<_$BleScanResultImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

ProvisioningConfig _$ProvisioningConfigFromJson(Map<String, dynamic> json) {
  return _ProvisioningConfig.fromJson(json);
}

/// @nodoc
mixin _$ProvisioningConfig {
  String get ssid => throw _privateConstructorUsedError;
  String get password => throw _privateConstructorUsedError;
  String get devicePrefix => throw _privateConstructorUsedError;
  Map<String, dynamic>? get customConfig => throw _privateConstructorUsedError;
  List<String>? get allowedSignatures => throw _privateConstructorUsedError;

  /// Serializes this ProvisioningConfig to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of ProvisioningConfig
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ProvisioningConfigCopyWith<ProvisioningConfig> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ProvisioningConfigCopyWith<$Res> {
  factory $ProvisioningConfigCopyWith(
          ProvisioningConfig value, $Res Function(ProvisioningConfig) then) =
      _$ProvisioningConfigCopyWithImpl<$Res, ProvisioningConfig>;
  @useResult
  $Res call(
      {String ssid,
      String password,
      String devicePrefix,
      Map<String, dynamic>? customConfig,
      List<String>? allowedSignatures});
}

/// @nodoc
class _$ProvisioningConfigCopyWithImpl<$Res, $Val extends ProvisioningConfig>
    implements $ProvisioningConfigCopyWith<$Res> {
  _$ProvisioningConfigCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ProvisioningConfig
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? ssid = null,
    Object? password = null,
    Object? devicePrefix = null,
    Object? customConfig = freezed,
    Object? allowedSignatures = freezed,
  }) {
    return _then(_value.copyWith(
      ssid: null == ssid
          ? _value.ssid
          : ssid // ignore: cast_nullable_to_non_nullable
              as String,
      password: null == password
          ? _value.password
          : password // ignore: cast_nullable_to_non_nullable
              as String,
      devicePrefix: null == devicePrefix
          ? _value.devicePrefix
          : devicePrefix // ignore: cast_nullable_to_non_nullable
              as String,
      customConfig: freezed == customConfig
          ? _value.customConfig
          : customConfig // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      allowedSignatures: freezed == allowedSignatures
          ? _value.allowedSignatures
          : allowedSignatures // ignore: cast_nullable_to_non_nullable
              as List<String>?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ProvisioningConfigImplCopyWith<$Res>
    implements $ProvisioningConfigCopyWith<$Res> {
  factory _$$ProvisioningConfigImplCopyWith(_$ProvisioningConfigImpl value,
          $Res Function(_$ProvisioningConfigImpl) then) =
      __$$ProvisioningConfigImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String ssid,
      String password,
      String devicePrefix,
      Map<String, dynamic>? customConfig,
      List<String>? allowedSignatures});
}

/// @nodoc
class __$$ProvisioningConfigImplCopyWithImpl<$Res>
    extends _$ProvisioningConfigCopyWithImpl<$Res, _$ProvisioningConfigImpl>
    implements _$$ProvisioningConfigImplCopyWith<$Res> {
  __$$ProvisioningConfigImplCopyWithImpl(_$ProvisioningConfigImpl _value,
      $Res Function(_$ProvisioningConfigImpl) _then)
      : super(_value, _then);

  /// Create a copy of ProvisioningConfig
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? ssid = null,
    Object? password = null,
    Object? devicePrefix = null,
    Object? customConfig = freezed,
    Object? allowedSignatures = freezed,
  }) {
    return _then(_$ProvisioningConfigImpl(
      ssid: null == ssid
          ? _value.ssid
          : ssid // ignore: cast_nullable_to_non_nullable
              as String,
      password: null == password
          ? _value.password
          : password // ignore: cast_nullable_to_non_nullable
              as String,
      devicePrefix: null == devicePrefix
          ? _value.devicePrefix
          : devicePrefix // ignore: cast_nullable_to_non_nullable
              as String,
      customConfig: freezed == customConfig
          ? _value._customConfig
          : customConfig // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      allowedSignatures: freezed == allowedSignatures
          ? _value._allowedSignatures
          : allowedSignatures // ignore: cast_nullable_to_non_nullable
              as List<String>?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ProvisioningConfigImpl implements _ProvisioningConfig {
  const _$ProvisioningConfigImpl(
      {required this.ssid,
      required this.password,
      required this.devicePrefix,
      final Map<String, dynamic>? customConfig,
      final List<String>? allowedSignatures})
      : _customConfig = customConfig,
        _allowedSignatures = allowedSignatures;

  factory _$ProvisioningConfigImpl.fromJson(Map<String, dynamic> json) =>
      _$$ProvisioningConfigImplFromJson(json);

  @override
  final String ssid;
  @override
  final String password;
  @override
  final String devicePrefix;
  final Map<String, dynamic>? _customConfig;
  @override
  Map<String, dynamic>? get customConfig {
    final value = _customConfig;
    if (value == null) return null;
    if (_customConfig is EqualUnmodifiableMapView) return _customConfig;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  final List<String>? _allowedSignatures;
  @override
  List<String>? get allowedSignatures {
    final value = _allowedSignatures;
    if (value == null) return null;
    if (_allowedSignatures is EqualUnmodifiableListView)
      return _allowedSignatures;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(value);
  }

  @override
  String toString() {
    return 'ProvisioningConfig(ssid: $ssid, password: $password, devicePrefix: $devicePrefix, customConfig: $customConfig, allowedSignatures: $allowedSignatures)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ProvisioningConfigImpl &&
            (identical(other.ssid, ssid) || other.ssid == ssid) &&
            (identical(other.password, password) ||
                other.password == password) &&
            (identical(other.devicePrefix, devicePrefix) ||
                other.devicePrefix == devicePrefix) &&
            const DeepCollectionEquality()
                .equals(other._customConfig, _customConfig) &&
            const DeepCollectionEquality()
                .equals(other._allowedSignatures, _allowedSignatures));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      ssid,
      password,
      devicePrefix,
      const DeepCollectionEquality().hash(_customConfig),
      const DeepCollectionEquality().hash(_allowedSignatures));

  /// Create a copy of ProvisioningConfig
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ProvisioningConfigImplCopyWith<_$ProvisioningConfigImpl> get copyWith =>
      __$$ProvisioningConfigImplCopyWithImpl<_$ProvisioningConfigImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ProvisioningConfigImplToJson(
      this,
    );
  }
}

abstract class _ProvisioningConfig implements ProvisioningConfig {
  const factory _ProvisioningConfig(
      {required final String ssid,
      required final String password,
      required final String devicePrefix,
      final Map<String, dynamic>? customConfig,
      final List<String>? allowedSignatures}) = _$ProvisioningConfigImpl;

  factory _ProvisioningConfig.fromJson(Map<String, dynamic> json) =
      _$ProvisioningConfigImpl.fromJson;

  @override
  String get ssid;
  @override
  String get password;
  @override
  String get devicePrefix;
  @override
  Map<String, dynamic>? get customConfig;
  @override
  List<String>? get allowedSignatures;

  /// Create a copy of ProvisioningConfig
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ProvisioningConfigImplCopyWith<_$ProvisioningConfigImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

ProvisioningResult _$ProvisioningResultFromJson(Map<String, dynamic> json) {
  switch (json['runtimeType']) {
    case 'success':
      return ProvisioningSuccess.fromJson(json);
    case 'failure':
      return ProvisioningFailure.fromJson(json);

    default:
      throw CheckedFromJsonException(json, 'runtimeType', 'ProvisioningResult',
          'Invalid union type "${json['runtimeType']}"!');
  }
}

/// @nodoc
mixin _$ProvisioningResult {
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(
            EspDevice device, String networkName, String ipAddress)
        success,
    required TResult Function(
            String deviceId, String error, ProvisioningStep failedStep)
        failure,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(EspDevice device, String networkName, String ipAddress)?
        success,
    TResult? Function(
            String deviceId, String error, ProvisioningStep failedStep)?
        failure,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(EspDevice device, String networkName, String ipAddress)?
        success,
    TResult Function(
            String deviceId, String error, ProvisioningStep failedStep)?
        failure,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(ProvisioningSuccess value) success,
    required TResult Function(ProvisioningFailure value) failure,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(ProvisioningSuccess value)? success,
    TResult? Function(ProvisioningFailure value)? failure,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(ProvisioningSuccess value)? success,
    TResult Function(ProvisioningFailure value)? failure,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;

  /// Serializes this ProvisioningResult to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ProvisioningResultCopyWith<$Res> {
  factory $ProvisioningResultCopyWith(
          ProvisioningResult value, $Res Function(ProvisioningResult) then) =
      _$ProvisioningResultCopyWithImpl<$Res, ProvisioningResult>;
}

/// @nodoc
class _$ProvisioningResultCopyWithImpl<$Res, $Val extends ProvisioningResult>
    implements $ProvisioningResultCopyWith<$Res> {
  _$ProvisioningResultCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ProvisioningResult
  /// with the given fields replaced by the non-null parameter values.
}

/// @nodoc
abstract class _$$ProvisioningSuccessImplCopyWith<$Res> {
  factory _$$ProvisioningSuccessImplCopyWith(_$ProvisioningSuccessImpl value,
          $Res Function(_$ProvisioningSuccessImpl) then) =
      __$$ProvisioningSuccessImplCopyWithImpl<$Res>;
  @useResult
  $Res call({EspDevice device, String networkName, String ipAddress});

  $EspDeviceCopyWith<$Res> get device;
}

/// @nodoc
class __$$ProvisioningSuccessImplCopyWithImpl<$Res>
    extends _$ProvisioningResultCopyWithImpl<$Res, _$ProvisioningSuccessImpl>
    implements _$$ProvisioningSuccessImplCopyWith<$Res> {
  __$$ProvisioningSuccessImplCopyWithImpl(_$ProvisioningSuccessImpl _value,
      $Res Function(_$ProvisioningSuccessImpl) _then)
      : super(_value, _then);

  /// Create a copy of ProvisioningResult
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? device = null,
    Object? networkName = null,
    Object? ipAddress = null,
  }) {
    return _then(_$ProvisioningSuccessImpl(
      device: null == device
          ? _value.device
          : device // ignore: cast_nullable_to_non_nullable
              as EspDevice,
      networkName: null == networkName
          ? _value.networkName
          : networkName // ignore: cast_nullable_to_non_nullable
              as String,
      ipAddress: null == ipAddress
          ? _value.ipAddress
          : ipAddress // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }

  /// Create a copy of ProvisioningResult
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $EspDeviceCopyWith<$Res> get device {
    return $EspDeviceCopyWith<$Res>(_value.device, (value) {
      return _then(_value.copyWith(device: value));
    });
  }
}

/// @nodoc
@JsonSerializable()
class _$ProvisioningSuccessImpl implements ProvisioningSuccess {
  const _$ProvisioningSuccessImpl(
      {required this.device,
      required this.networkName,
      required this.ipAddress,
      final String? $type})
      : $type = $type ?? 'success';

  factory _$ProvisioningSuccessImpl.fromJson(Map<String, dynamic> json) =>
      _$$ProvisioningSuccessImplFromJson(json);

  @override
  final EspDevice device;
  @override
  final String networkName;
  @override
  final String ipAddress;

  @JsonKey(name: 'runtimeType')
  final String $type;

  @override
  String toString() {
    return 'ProvisioningResult.success(device: $device, networkName: $networkName, ipAddress: $ipAddress)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ProvisioningSuccessImpl &&
            (identical(other.device, device) || other.device == device) &&
            (identical(other.networkName, networkName) ||
                other.networkName == networkName) &&
            (identical(other.ipAddress, ipAddress) ||
                other.ipAddress == ipAddress));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, device, networkName, ipAddress);

  /// Create a copy of ProvisioningResult
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ProvisioningSuccessImplCopyWith<_$ProvisioningSuccessImpl> get copyWith =>
      __$$ProvisioningSuccessImplCopyWithImpl<_$ProvisioningSuccessImpl>(
          this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(
            EspDevice device, String networkName, String ipAddress)
        success,
    required TResult Function(
            String deviceId, String error, ProvisioningStep failedStep)
        failure,
  }) {
    return success(device, networkName, ipAddress);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(EspDevice device, String networkName, String ipAddress)?
        success,
    TResult? Function(
            String deviceId, String error, ProvisioningStep failedStep)?
        failure,
  }) {
    return success?.call(device, networkName, ipAddress);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(EspDevice device, String networkName, String ipAddress)?
        success,
    TResult Function(
            String deviceId, String error, ProvisioningStep failedStep)?
        failure,
    required TResult orElse(),
  }) {
    if (success != null) {
      return success(device, networkName, ipAddress);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(ProvisioningSuccess value) success,
    required TResult Function(ProvisioningFailure value) failure,
  }) {
    return success(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(ProvisioningSuccess value)? success,
    TResult? Function(ProvisioningFailure value)? failure,
  }) {
    return success?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(ProvisioningSuccess value)? success,
    TResult Function(ProvisioningFailure value)? failure,
    required TResult orElse(),
  }) {
    if (success != null) {
      return success(this);
    }
    return orElse();
  }

  @override
  Map<String, dynamic> toJson() {
    return _$$ProvisioningSuccessImplToJson(
      this,
    );
  }
}

abstract class ProvisioningSuccess implements ProvisioningResult {
  const factory ProvisioningSuccess(
      {required final EspDevice device,
      required final String networkName,
      required final String ipAddress}) = _$ProvisioningSuccessImpl;

  factory ProvisioningSuccess.fromJson(Map<String, dynamic> json) =
      _$ProvisioningSuccessImpl.fromJson;

  EspDevice get device;
  String get networkName;
  String get ipAddress;

  /// Create a copy of ProvisioningResult
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ProvisioningSuccessImplCopyWith<_$ProvisioningSuccessImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$ProvisioningFailureImplCopyWith<$Res> {
  factory _$$ProvisioningFailureImplCopyWith(_$ProvisioningFailureImpl value,
          $Res Function(_$ProvisioningFailureImpl) then) =
      __$$ProvisioningFailureImplCopyWithImpl<$Res>;
  @useResult
  $Res call({String deviceId, String error, ProvisioningStep failedStep});
}

/// @nodoc
class __$$ProvisioningFailureImplCopyWithImpl<$Res>
    extends _$ProvisioningResultCopyWithImpl<$Res, _$ProvisioningFailureImpl>
    implements _$$ProvisioningFailureImplCopyWith<$Res> {
  __$$ProvisioningFailureImplCopyWithImpl(_$ProvisioningFailureImpl _value,
      $Res Function(_$ProvisioningFailureImpl) _then)
      : super(_value, _then);

  /// Create a copy of ProvisioningResult
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? deviceId = null,
    Object? error = null,
    Object? failedStep = null,
  }) {
    return _then(_$ProvisioningFailureImpl(
      deviceId: null == deviceId
          ? _value.deviceId
          : deviceId // ignore: cast_nullable_to_non_nullable
              as String,
      error: null == error
          ? _value.error
          : error // ignore: cast_nullable_to_non_nullable
              as String,
      failedStep: null == failedStep
          ? _value.failedStep
          : failedStep // ignore: cast_nullable_to_non_nullable
              as ProvisioningStep,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ProvisioningFailureImpl implements ProvisioningFailure {
  const _$ProvisioningFailureImpl(
      {required this.deviceId,
      required this.error,
      required this.failedStep,
      final String? $type})
      : $type = $type ?? 'failure';

  factory _$ProvisioningFailureImpl.fromJson(Map<String, dynamic> json) =>
      _$$ProvisioningFailureImplFromJson(json);

  @override
  final String deviceId;
  @override
  final String error;
  @override
  final ProvisioningStep failedStep;

  @JsonKey(name: 'runtimeType')
  final String $type;

  @override
  String toString() {
    return 'ProvisioningResult.failure(deviceId: $deviceId, error: $error, failedStep: $failedStep)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ProvisioningFailureImpl &&
            (identical(other.deviceId, deviceId) ||
                other.deviceId == deviceId) &&
            (identical(other.error, error) || other.error == error) &&
            (identical(other.failedStep, failedStep) ||
                other.failedStep == failedStep));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, deviceId, error, failedStep);

  /// Create a copy of ProvisioningResult
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ProvisioningFailureImplCopyWith<_$ProvisioningFailureImpl> get copyWith =>
      __$$ProvisioningFailureImplCopyWithImpl<_$ProvisioningFailureImpl>(
          this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(
            EspDevice device, String networkName, String ipAddress)
        success,
    required TResult Function(
            String deviceId, String error, ProvisioningStep failedStep)
        failure,
  }) {
    return failure(deviceId, error, failedStep);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(EspDevice device, String networkName, String ipAddress)?
        success,
    TResult? Function(
            String deviceId, String error, ProvisioningStep failedStep)?
        failure,
  }) {
    return failure?.call(deviceId, error, failedStep);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(EspDevice device, String networkName, String ipAddress)?
        success,
    TResult Function(
            String deviceId, String error, ProvisioningStep failedStep)?
        failure,
    required TResult orElse(),
  }) {
    if (failure != null) {
      return failure(deviceId, error, failedStep);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(ProvisioningSuccess value) success,
    required TResult Function(ProvisioningFailure value) failure,
  }) {
    return failure(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(ProvisioningSuccess value)? success,
    TResult? Function(ProvisioningFailure value)? failure,
  }) {
    return failure?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(ProvisioningSuccess value)? success,
    TResult Function(ProvisioningFailure value)? failure,
    required TResult orElse(),
  }) {
    if (failure != null) {
      return failure(this);
    }
    return orElse();
  }

  @override
  Map<String, dynamic> toJson() {
    return _$$ProvisioningFailureImplToJson(
      this,
    );
  }
}

abstract class ProvisioningFailure implements ProvisioningResult {
  const factory ProvisioningFailure(
      {required final String deviceId,
      required final String error,
      required final ProvisioningStep failedStep}) = _$ProvisioningFailureImpl;

  factory ProvisioningFailure.fromJson(Map<String, dynamic> json) =
      _$ProvisioningFailureImpl.fromJson;

  String get deviceId;
  String get error;
  ProvisioningStep get failedStep;

  /// Create a copy of ProvisioningResult
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ProvisioningFailureImplCopyWith<_$ProvisioningFailureImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
