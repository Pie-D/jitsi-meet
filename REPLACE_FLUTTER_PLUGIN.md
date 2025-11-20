# Hướng dẫn thay thế jitsi_meet_flutter_sdk bằng Custom AAR SDK

## Tổng quan

Plugin `jitsi_meet_flutter_sdk` là một wrapper Flutter, bên trong nó sử dụng native SDK (AAR cho Android). Để thay thế bằng custom AAR, bạn có 2 cách:

## Cách 1: Modify plugin để sử dụng Custom AAR (Khuyến nghị)

Giữ nguyên API Flutter, chỉ thay đổi dependency Android.

### Bước 1: Fork plugin `jitsi_meet_flutter_sdk`

```bash
# Clone repository
git clone https://github.com/jitsi/jitsi-meet-flutter-sdk.git
cd jitsi-meet-flutter-sdk
```

### Bước 2: Modify Android dependency

Sửa file `android/build.gradle` trong plugin:

**Trước (sử dụng Maven Central):**
```gradle
dependencies {
    implementation 'org.jitsi.react:jitsi-meet-sdk:10.3.0'
}
```

**Sau (sử dụng Custom AAR):**

**Option A: Sử dụng Local AAR**
```gradle
repositories {
    flatDir {
        dirs 'libs'
    }
}

dependencies {
    // Copy custom AAR vào android/libs/ của plugin
    implementation(name: 'sdk-release', ext: 'aar')
}
```

**Option B: Sử dụng Maven Local**
```gradle
repositories {
    mavenLocal()
    // ... other repos
}

dependencies {
    // Sử dụng version từ custom build
    implementation 'org.jitsi.react:jitsi-meet-sdk:0.0.0'
}
```

**Option C: Sử dụng Local Path**
```gradle
dependencies {
    // Point trực tiếp đến AAR file
    implementation files('path/to/your/sdk-release.aar')
}
```

### Bước 3: Build và sử dụng plugin

```bash
# Publish plugin local
cd jitsi-meet-flutter-sdk
flutter pub publish --dry-run  # Kiểm tra
# Hoặc sử dụng local path
```

Trong Flutter project của bạn, update `pubspec.yaml`:

```yaml
dependencies:
  jitsi_meet_flutter_sdk:
    path: ../jitsi-meet-flutter-sdk  # Path đến modified plugin
```

### Bước 4: Code Flutter không cần thay đổi

Code Dart của bạn giữ nguyên 100%:

```dart
import 'package:jitsi_meet_flutter_sdk/jitsi_meet_flutter_sdk.dart';

// Code của bạn không cần thay đổi gì
joinMeetingOnline(String roomId) async {
  var options = JitsiMeetConferenceOptions(
    room: roomId,
    serverURL: '${Environment.MEETING_API}/',
    // ... config giữ nguyên
  );
  
  await _jitsiMeetPlugin.join(options, listener);
}
```

## Cách 2: Sử dụng Custom AAR trực tiếp (Không dùng plugin)

Nếu bạn muốn bypass plugin hoàn toàn, tạo custom implementation.

### Bước 1: Copy AAR vào Flutter project

```bash
mkdir -p flutter_project/android/app/libs
cp jitsi-meet/android/sdk/build/outputs/aar/sdk-release.aar \
   flutter_project/android/app/libs/jitsi-meet-sdk.aar
```

### Bước 2: Cấu hình Android

**android/app/build.gradle:**
```gradle
android {
    // ... existing config
}

repositories {
    flatDir {
        dirs 'libs'
    }
    google()
    mavenCentral()
}

dependencies {
    implementation(name: 'jitsi-meet-sdk', ext: 'aar')
    
    // Các dependencies cần thiết (từ SDK)
    implementation 'androidx.appcompat:appcompat:1.4.1'
    implementation 'com.facebook.react:react-android:0.77.2'
    implementation 'com.facebook.react:hermes-android:0.77.2'
    // ... thêm các dependencies khác từ SDK
}
```

### Bước 3: Tạo Platform Channel

**android/app/src/main/kotlin/.../MainActivity.kt:**
```kotlin
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import org.jitsi.meet.sdk.JitsiMeetActivity
import org.jitsi.meet.sdk.JitsiMeetConferenceOptions
import org.jitsi.meet.sdk.JitsiMeetUserInfo

class MainActivity: FlutterActivity() {
    private val CHANNEL = "com.example.jitsi/custom"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "joinMeeting" -> {
                        val roomId = call.argument<String>("roomId")
                        val serverURL = call.argument<String>("serverURL")
                        val displayName = call.argument<String>("displayName")
                        val token = call.argument<String>("token")
                        
                        val options = JitsiMeetConferenceOptions.Builder()
                            .setRoom(roomId)
                            .setServerURL(serverURL)
                            .setUserInfo(JitsiMeetUserInfo().apply {
                                this.displayName = displayName
                            })
                            .setToken(token)
                            .build()
                        
                        JitsiMeetActivity.launch(this, options)
                        result.success(true)
                    }
                    else -> result.notImplemented()
                }
            }
    }
}
```

### Bước 4: Code Flutter mới

**lib/services/jitsi_service.dart:**
```dart
import 'package:flutter/services.dart';

class CustomJitsiService {
  static const MethodChannel _channel = MethodChannel('com.example.jitsi/custom');

  Future<void> joinMeeting({
    required String roomId,
    required String serverURL,
    required String displayName,
    String? token,
  }) async {
    try {
      await _channel.invokeMethod('joinMeeting', {
        'roomId': roomId,
        'serverURL': serverURL,
        'displayName': displayName,
        'token': token,
      });
    } on PlatformException catch (e) {
      print("Failed to join meeting: ${e.message}");
    }
  }
}
```

**Sử dụng:**
```dart
import 'package:your_app/services/jitsi_service.dart';

final jitsiService = CustomJitsiService();

await jitsiService.joinMeeting(
  roomId: roomId,
  serverURL: '${Environment.MEETING_API}/',
  displayName: Get.find<SignInController>().storedUsername.value,
  token: tokenJwt,
);
```

## So sánh 2 cách

| Tiêu chí | Cách 1 (Modify Plugin) | Cách 2 (Direct AAR) |
|----------|----------------------|---------------------|
| **Độ phức tạp** | Thấp | Cao |
| **Thay đổi code Dart** | Không | Có |
| **Maintainability** | Dễ | Khó |
| **Tính năng đầy đủ** | Có (giữ nguyên API) | Cần implement lại |
| **Khuyến nghị** | ✅ | ❌ |

## Cách 1 - Chi tiết Implementation

### 1. Fork và modify plugin

```bash
# Clone plugin
git clone https://github.com/jitsi/jitsi-meet-flutter-sdk.git custom-jitsi-plugin
cd custom-jitsi-plugin
```

### 2. Copy Custom AAR vào plugin

```bash
mkdir -p android/libs
cp /path/to/jitsi-meet/android/sdk/build/outputs/aar/sdk-release.aar \
   android/libs/sdk-release.aar
```

### 3. Modify android/build.gradle

```gradle
group 'com.jitsi'
version '1.0.0-SNAPSHOT'

buildscript {
    ext.kotlin_version = '1.7.10'
    repositories {
        google()
        mavenCentral()
    }

    dependencies {
        classpath 'com.android.tools.build:gradle:7.2.0'
        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version"
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
        flatDir {
            dirs 'libs'  // Thêm flatDir để load AAR local
        }
    }
}

apply plugin: 'com.android.library'
apply plugin: 'kotlin-android'

android {
    compileSdkVersion 33

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }

    kotlinOptions {
        jvmTarget = '1.8'
    }

    sourceSets {
        main.java.srcDirs += 'src/main/kotlin'
    }

    defaultConfig {
        minSdkVersion 26
    }
}

dependencies {
    // Sử dụng custom AAR thay vì Maven Central
    implementation(name: 'sdk-release', ext: 'aar')
    
    // Các dependencies khác giữ nguyên
}
```

### 4. Sử dụng trong Flutter project

**pubspec.yaml:**
```yaml
dependencies:
  flutter:
    sdk: flutter
  jitsi_meet_flutter_sdk:
    path: ../custom-jitsi-plugin  # Path đến modified plugin
```

**Code Dart giữ nguyên 100%:**
```dart
joinMeetingOnline(String roomId) async {
  String tokenJwt = await AuthService().convertKeycloakTokenToJitsiToken(
      Get.find<SignInController>().storedToken.value);
      
  var options = JitsiMeetConferenceOptions(
    room: roomId,
    serverURL: '${Environment.MEETING_API}/',
    configOverrides: {
      "startWithAudioMuted": false,
      "startWithVideoMuted": false,
      // ... config giữ nguyên
    },
    featureFlags: {
      "unsaferoomwarning.enabled": false,
      "ios.screensharing.enabled": true,
    },
    userInfo: JitsiMeetUserInfo(
      displayName: Get.find<SignInController>().storedUsername.value,
      email: Get.find<SignInController>().storedEmail.value,
    ),
    token: tokenJwt,
  );

  var listener = JitsiMeetEventListener(
    // ... listeners giữ nguyên
  );

  await _jitsiMeetPlugin.join(options, listener);
}
```

## Troubleshooting

### Lỗi: "Could not find org.jitsi.react:jitsi-meet-sdk"

- Đảm bảo AAR đã được copy vào `android/libs/`
- Kiểm tra `flatDir` repository đã được thêm
- Chạy `flutter clean` và `flutter pub get`

### Lỗi: "Multiple dex files"

- Đảm bảo không có duplicate dependencies
- Kiểm tra `android/app/build.gradle` không có conflict với plugin

### ImmersiveView không hiện

- Đảm bảo custom AAR đã được build với ImmersiveView code
- Kiểm tra feature flags và config có đúng không

## Kết luận

**Khuyến nghị: Sử dụng Cách 1 (Modify Plugin)**

- ✅ Giữ nguyên 100% code Dart
- ✅ Dễ maintain và update
- ✅ Tận dụng tất cả features của plugin
- ✅ Custom AAR với ImmersiveView sẽ tự động có sẵn

Bạn chỉ cần:
1. Fork plugin
2. Copy custom AAR vào `android/libs/`
3. Modify `android/build.gradle` để sử dụng local AAR
4. Sử dụng plugin qua `path:` trong `pubspec.yaml`
5. Code Dart giữ nguyên hoàn toàn!



