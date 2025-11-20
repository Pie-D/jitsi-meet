# Ví dụ cụ thể: Modify jitsi_meet_flutter_sdk để dùng Custom AAR

## Setup ban đầu

Giả sử bạn có:
- Custom AAR: `D:\CMC\jitsi-meet\android\sdk\build\outputs\aar\sdk-release.aar`
- Flutter project: `D:\Projects\flutter_app`

## Bước 1: Clone plugin

```bash
cd D:\Projects
git clone https://github.com/jitsi/jitsi-meet-flutter-sdk.git custom-jitsi-plugin
cd custom-jitsi-plugin
```

## Bước 2: Copy Custom AAR vào plugin

```bash
# Tạo thư mục libs
mkdir android\libs

# Copy AAR từ Jitsi Meet source
copy D:\CMC\jitsi-meet\android\sdk\build\outputs\aar\sdk-release.aar android\libs\sdk-release.aar
```

## Bước 3: Modify android/build.gradle

**File: `custom-jitsi-plugin/android/build.gradle`**

**Trước:**
```gradle
dependencies {
    implementation 'org.jitsi.react:jitsi-meet-sdk:10.3.0'
}
```

**Sau:**
```gradle
repositories {
    google()
    mavenCentral()
    flatDir {
        dirs 'libs'  // Thêm dòng này
    }
}

dependencies {
    // Thay thế Maven dependency bằng local AAR
    implementation(name: 'sdk-release', ext: 'aar')
    // implementation 'org.jitsi.react:jitsi-meet-sdk:10.3.0'  // Comment hoặc xóa
}
```

## Bước 4: Update version (optional)

**File: `custom-jitsi-plugin/pubspec.yaml`**

```yaml
name: jitsi_meet_flutter_sdk
description: Custom Jitsi Meet SDK with ImmersiveView
version: 10.3.0-custom  # Thêm suffix để phân biệt
```

## Bước 5: Sử dụng trong Flutter project

**File: `flutter_app/pubspec.yaml`**

```yaml
dependencies:
  flutter:
    sdk: flutter
  get:
    ^4.6.6
  # ... other dependencies
  
  # Sử dụng custom plugin local
  jitsi_meet_flutter_sdk:
    path: ../custom-jitsi-plugin  # Đường dẫn tương đối
```

**Chạy:**
```bash
cd flutter_app
flutter pub get
```

## Bước 6: Code Dart giữ nguyên 100%

**File: `flutter_app/lib/services/meeting_service.dart`**

```dart
import 'package:jitsi_meet_flutter_sdk/jitsi_meet_flutter_sdk.dart';
import 'package:flutter/material.dart';

class MeetingService {
  final JitsiMeet _jitsiMeetPlugin = JitsiMeet();

  Future<void> joinMeetingOnline(String roomId) async {
    String tokenJwt = await AuthService().convertKeycloakTokenToJitsiToken(
        Get.find<SignInController>().storedToken.value);
        
    var options = JitsiMeetConferenceOptions(
      room: roomId,
      serverURL: '${Environment.MEETING_API}/',
      configOverrides: {
        "startWithAudioMuted": false,
        "startWithVideoMuted": false,
        "enableNoisyMicDetection": true,
        "enableNoAudioDetection": true,
        "disablePolls": true,
      },
      featureFlags: {
        "unsaferoomwarning.enabled": false,
        "ios.screensharing.enabled": true,
        // ImmersiveView sẽ tự động có sẵn trong SDK custom
      },
      userInfo: JitsiMeetUserInfo(
        displayName: Get.find<SignInController>().storedUsername.value,
        email: Get.find<SignInController>().storedEmail.value,
      ),
      token: tokenJwt,
    );

    var listener = JitsiMeetEventListener(
      conferenceJoined: (url) {
        debugPrint("conferenceJoined: url: $url");
      },
      conferenceTerminated: (url, error) {
        debugPrint("conferenceTerminated: url: $url, error: $error");
      },
      conferenceWillJoin: (url) {
        debugPrint("conferenceWillJoin: url: $url");
      },
      participantJoined: (email, name, role, participantId) {
        debugPrint(
          "participantJoined: email: $email, name: $name, role: $role, "
          "participantId: $participantId",
        );
      },
      participantLeft: (participantId) {
        debugPrint("participantLeft: participantId: $participantId");
      },
      audioMutedChanged: (muted) {
        debugPrint("audioMutedChanged: isMuted: $muted");
      },
      videoMutedChanged: (muted) {
        debugPrint("videoMutedChanged: isMuted: $muted");
      },
      endpointTextMessageReceived: (senderId, message) {
        debugPrint(
            "endpointTextMessageReceived: senderId: $senderId, message: $message");
      },
      screenShareToggled: (participantId, sharing) {
        debugPrint(
          "screenShareToggled: participantId: $participantId, "
          "isSharing: $sharing",
        );
      },
      chatMessageReceived: (senderId, message, isPrivate, timestamp) {
        debugPrint(
          "chatMessageReceived: senderId: $senderId, message: $message, "
          "isPrivate: $isPrivate, timestamp: $timestamp",
        );
      },
      chatToggled: (isOpen) => debugPrint("chatToggled: isOpen: $isOpen"),
      participantsInfoRetrieved: (participantsInfo) {
        debugPrint(
            "participantsInfoRetrieved: participantsInfo: $participantsInfo");
      },
      readyToClose: () {
        debugPrint("readyToClose");
      },
    );

    await _jitsiMeetPlugin.join(options, listener);
  }
}
```

**KHÔNG CẦN THAY ĐỔI GÌ!** Code giữ nguyên hoàn toàn.

## Bước 7: Build và test

```bash
cd flutter_app

# Clean và rebuild
flutter clean
flutter pub get

# Build APK
flutter build apk --release

# Hoặc run trên device
flutter run
```

## Kiểm tra ImmersiveView

Sau khi join meeting:
1. Vào Toolbox (bar dưới màn hình)
2. Tìm icon **ImmersiveView** (icon mới đã được thay đổi)
3. Bấm để bật ImmersiveView
4. Kiểm tra:
   - Background CMC hiển thị
   - 5 slots nằm ngang trên 1 hàng
   - Slots vuông, có border màu vàng nhạt
   - Avatar và tên hiển thị khi camera tắt

## Cấu trúc thư mục sau khi setup

```
D:\Projects\
├── custom-jitsi-plugin\          # Modified plugin
│   ├── android\
│   │   ├── libs\
│   │   │   └── sdk-release.aar   # Custom AAR
│   │   └── build.gradle          # Modified để dùng local AAR
│   └── pubspec.yaml
│
└── flutter_app\                   # Flutter project
    ├── android\
    ├── lib\
    │   └── services\
    │       └── meeting_service.dart
    └── pubspec.yaml               # Reference đến custom-jitsi-plugin
```

## Update AAR mới

Khi bạn build lại AAR từ Jitsi Meet source:

```bash
# 1. Build AAR mới
cd D:\CMC\jitsi-meet\android
gradlew.bat :sdk:assembleRelease

# 2. Copy AAR mới vào plugin
copy android\sdk\build\outputs\aar\sdk-release.aar ^
     D:\Projects\custom-jitsi-plugin\android\libs\sdk-release.aar

# 3. Rebuild Flutter app
cd D:\Projects\flutter_app
flutter clean
flutter pub get
flutter build apk --release
```

## Troubleshooting

### Lỗi: "Could not find sdk-release.aar"

**Giải pháp:**
- Kiểm tra file AAR đã được copy vào `android/libs/`
- Đảm bảo `flatDir` repository đã được thêm trong `build.gradle`
- Chạy `flutter clean` và `flutter pub get`

### Lỗi: "Duplicate class found"

**Giải pháp:**
- Xóa dependency cũ `'org.jitsi.react:jitsi-meet-sdk:10.3.0'` hoàn toàn
- Chạy `flutter clean`

### ImmersiveView không hiện

**Giải pháp:**
- Đảm bảo AAR đã được build với ImmersiveView code
- Kiểm tra version AAR có đúng không
- Rebuild Flutter app: `flutter clean && flutter pub get && flutter build apk`

## Lợi ích của cách này

✅ **Không cần thay đổi code Dart** - Giữ nguyên 100%  
✅ **Dễ maintain** - Chỉ cần update AAR khi có thay đổi  
✅ **Tận dụng plugin** - Tất cả features của plugin vẫn hoạt động  
✅ **Custom features** - ImmersiveView và các customizations tự động có sẵn  
✅ **Version control** - Có thể track changes trong Git

## Kết luận

Với cách này, bạn:
1. **Không cần thay đổi code Dart** - Code `joinMeetingOnline()` giữ nguyên
2. **Chỉ cần modify plugin một lần** - Setup ban đầu
3. **Update AAR dễ dàng** - Copy và rebuild khi có thay đổi
4. **Tận dụng đầy đủ features** - ImmersiveView và tất cả customizations



