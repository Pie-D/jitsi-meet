# Ví dụ tích hợp Jitsi Meet SDK vào Flutter

## Cấu trúc Flutter Project

```
flutter_project/
├── android/
│   ├── app/
│   │   ├── build.gradle
│   │   └── libs/
│   │       └── jitsi-meet-sdk.aar  (copy từ build output)
│   ├── build.gradle
│   └── settings.gradle
└── lib/
    └── main.dart
```

## Cấu hình android/app/build.gradle

```gradle
android {
    // ... existing config ...
    
    repositories {
        flatDir {
            dirs 'libs'
        }
        google()
        mavenCentral()
        mavenLocal()  // Nếu dùng Maven Local
    }
}

dependencies {
    // Option 1: Sử dụng AAR trực tiếp
    implementation(name: 'jitsi-meet-sdk', ext: 'aar')
    
    // Option 2: Sử dụng Maven Local
    // implementation 'org.jitsi.react:jitsi-meet-sdk:0.0.0'
    
    // Các dependencies khác của Flutter...
    implementation 'androidx.appcompat:appcompat:1.4.1'
    // ...
}
```

## Sử dụng trong Dart code

```dart
import 'package:flutter/material.dart';
import 'package:jitsi_meet_flutter_sdk/jitsi_meet_flutter_sdk.dart';

class MeetingScreen extends StatelessWidget {
  final String roomName;
  final String userDisplayName;

  MeetingScreen({
    required this.roomName,
    required this.userDisplayName,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: JitsiMeet(
        roomNameOrUrl: roomName,
        userDisplayName: userDisplayName,
        // ImmersiveView sẽ tự động có sẵn trong SDK
        // Bạn có thể bật/tắt qua UI trong meeting
      ),
    );
  }
}
```

## Kiểm tra ImmersiveView đã có trong SDK

Sau khi build AAR và tích hợp vào Flutter, bạn có thể kiểm tra:

1. Mở meeting trong Flutter app
2. Vào Toolbox
3. Tìm icon ImmersiveView (icon mới đã được thay đổi)
4. Bấm để bật ImmersiveView
5. Kiểm tra background và 5 slots hiển thị đúng

## Troubleshooting

### Flutter không tìm thấy AAR

Đảm bảo:
- File AAR đã được copy vào `android/app/libs/`
- `build.gradle` đã có `flatDir` repository
- Đã chạy `flutter clean` và `flutter pub get`

### Lỗi dependency conflicts

Nếu có conflict với React Native dependencies:
```gradle
configurations.all {
    resolutionStrategy {
        force 'com.facebook.react:react-native:0.77.2'
    }
}
```

### Build size lớn

AAR đã bao gồm toàn bộ React Native bundle và assets, nên size sẽ lớn (~50-100MB). Đây là bình thường.



