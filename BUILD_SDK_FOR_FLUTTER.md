# Hướng dẫn đóng gói Jitsi Meet SDK cho Flutter

Hướng dẫn này sẽ giúp bạn build Android AAR SDK từ source code Jitsi Meet đã được customize (bao gồm ImmersiveView) để sử dụng trong project Flutter.

## Yêu cầu

- Node.js và npm/yarn đã cài đặt
- Android Studio với Android SDK và NDK
- Java JDK 17+
- Gradle đã cài đặt

## Bước 1: Cài đặt dependencies

```bash
# Cài đặt Node modules
npm install

# Hoặc nếu dùng yarn
yarn install
```

## Bước 2: Build Android AAR SDK

### Cách 1: Build trực tiếp (Đơn giản nhất)

```bash
cd android
./gradlew :sdk:assembleRelease
```

File AAR sẽ được tạo tại:
```
android/sdk/build/outputs/aar/sdk-release.aar
```

### Cách 2: Publish lên Maven Local (Khuyến nghị)

```bash
cd android
./gradlew :sdk:publishToMavenLocal
```

SDK sẽ được publish vào Maven Local repository của bạn tại:
```
~/.m2/repository/org/jitsi/react/jitsi-meet-sdk/<version>/
```

## Bước 3: Sử dụng trong Flutter Project

### Option A: Sử dụng AAR trực tiếp (Local AAR)

1. **Copy AAR vào Flutter project:**

   ```bash
   # Tạo thư mục libs trong android/app (nếu chưa có)
   mkdir -p <flutter_project>/android/app/libs
   
   # Copy AAR file
   cp android/sdk/build/outputs/aar/sdk-release.aar <flutter_project>/android/app/libs/jitsi-meet-sdk.aar
   ```

2. **Cấu hình trong `android/app/build.gradle` của Flutter:**

   ```gradle
   repositories {
       flatDir {
           dirs 'libs'
       }
   }
   
   dependencies {
       implementation(name: 'jitsi-meet-sdk', ext: 'aar')
       // ... các dependencies khác
   }
   ```

### Option B: Sử dụng Maven Local (Khuyến nghị)

1. **Cấu hình trong `android/build.gradle` của Flutter:**

   ```gradle
   allprojects {
       repositories {
           google()
           mavenCentral()
           mavenLocal() // Thêm dòng này
           // ... các repositories khác
       }
   }
   ```

2. **Cấu hình trong `android/app/build.gradle` của Flutter:**

   ```gradle
   dependencies {
       implementation 'org.jitsi.react:jitsi-meet-sdk:<version>'
       // ... các dependencies khác
   }
   ```

   **Lưu ý:** Thay `<version>` bằng version từ `android/gradle.properties` (sdkVersion).

### Option C: Sử dụng với Jitsi Meet Flutter SDK plugin

Nếu bạn đang dùng `jitsi_meet_flutter_sdk` plugin, bạn có thể:

1. **Fork và modify plugin:**

   - Fork repository `jitsi_meet_flutter_sdk`
   - Thay đổi dependency trong `android/build.gradle` của plugin để trỏ đến local AAR hoặc Maven Local

2. **Hoặc override dependency trong Flutter project:**

   ```gradle
   // Trong android/app/build.gradle của Flutter project
   configurations.all {
       resolutionStrategy {
           force 'org.jitsi.react:jitsi-meet-sdk:<version>'
       }
   }
   ```

## Bước 4: Build Flutter App

```bash
cd <flutter_project>
flutter clean
flutter pub get
flutter build apk --release
```

## Kiểm tra version SDK

Version SDK được định nghĩa trong `android/gradle.properties`:

```properties
sdkVersion=10.3.0
```

Bạn có thể override version bằng biến môi trường:

```bash
export OVERRIDE_SDK_VERSION=10.3.0-custom
./gradlew :sdk:assembleRelease
```

## Troubleshooting

### Lỗi: "Could not find org.jitsi.react:jitsi-meet-sdk"

- Đảm bảo đã thêm `mavenLocal()` vào repositories
- Kiểm tra AAR đã được publish đúng chưa: `ls ~/.m2/repository/org/jitsi/react/jitsi-meet-sdk/`

### Lỗi: "Missing React Native dependencies"

- Đảm bảo đã chạy `npm install` trong Jitsi Meet source
- Kiểm tra `node_modules` đã được cài đặt đầy đủ

### Lỗi: "NDK not found"

- Cài đặt NDK qua Android Studio SDK Manager
- Hoặc set `ANDROID_NDK_HOME` environment variable

## Lưu ý quan trọng

1. **JavaScript Bundle:** AAR đã bao gồm JavaScript bundle đã được bundle sẵn, không cần Metro bundler khi chạy trong Flutter app.

2. **Assets và Resources:** Tất cả assets (images, sounds) và resources đã được đóng gói trong AAR.

3. **Custom Features:** Các tính năng đã customize (như ImmersiveView) sẽ có sẵn trong AAR.

4. **Version Compatibility:** Đảm bảo version SDK tương thích với Flutter plugin version bạn đang dùng.

## Build với Libre Build (không có Google Services)

```bash
export LIBRE_BUILD=true
cd android
./gradlew :sdk:assembleRelease
```

## Publish lên Maven Repository riêng

Nếu bạn muốn publish lên Maven repository của công ty:

```bash
export MVN_REPO=https://your-maven-repo.com/releases
export MVN_USER=your-username
export MVN_PASSWORD=your-password
cd android
./gradlew :sdk:publish
```

Hoặc dùng script có sẵn:

```bash
cd android/scripts
./release-sdk.sh <maven-repo-path-or-url>
```

## Kết luận

Sau khi build xong, bạn có:
- **AAR file:** `android/sdk/build/outputs/aar/sdk-release.aar`
- **Hoặc Maven Local:** SDK đã được publish vào `~/.m2/repository/`

Bạn có thể sử dụng AAR này trong Flutter project như hướng dẫn ở trên. Tất cả các tính năng đã customize (bao gồm ImmersiveView với icon mới) sẽ có sẵn trong SDK.



