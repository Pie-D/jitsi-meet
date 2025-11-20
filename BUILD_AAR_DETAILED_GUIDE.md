# Hướng dẫn chi tiết Build Android AAR SDK

Hướng dẫn từng bước để build file AAR từ source code Jitsi Meet đã được customize.

## Yêu cầu hệ thống

### 1. Kiểm tra phần mềm đã cài đặt

**Node.js và npm:**
```bash
node --version
# Cần: v16.x trở lên

npm --version
# Cần: v7.x trở lên
```

**Java JDK:**
```bash
java -version
# Cần: JDK 17 trở lên
```

**Android SDK và NDK:**
- Android Studio đã cài đặt
- Android SDK Platform 35
- Android NDK version 27.1.12297006
- Cài qua Android Studio > SDK Manager

**Gradle:**
```bash
cd android
gradlew.bat --version
# Sẽ tự động download Gradle nếu chưa có
```

## Bước 1: Cài đặt Dependencies

### 1.1. Cài đặt Node Modules

```bash
# Di chuyển vào thư mục gốc của project
cd D:\CMC\jitsi-meet

# Kiểm tra node_modules đã có chưa
if exist node_modules (
    echo node_modules already exists
) else (
    echo Installing node_modules...
)

# Cài đặt dependencies
npm install

# Nếu gặp lỗi, thử:
npm install --legacy-peer-deps

# Hoặc dùng yarn (nếu có)
yarn install
```

**Kiểm tra kết quả:**
```bash
# Kiểm tra node_modules đã được tạo
dir node_modules | findstr /C:"react-native"
```

### 1.2. Kiểm tra Android SDK Path

```bash
# Kiểm tra biến môi trường ANDROID_HOME
echo %ANDROID_HOME%

# Nếu chưa set, set trong System Properties > Environment Variables
# Ví dụ: C:\Users\YourName\AppData\Local\Android\Sdk
```

**Hoặc tạo file `android/local.properties`:**
```properties
sdk.dir=C\:\\Users\\YourName\\AppData\\Local\\Android\\Sdk
```

## Bước 2: Clean và Prepare Build

### 2.1. Clean Build Cache

```bash
cd D:\CMC\jitsi-meet\android

# Clean Gradle cache
gradlew.bat clean

# Clean React Native cache
cd ..
npm run clean
# Hoặc
rmdir /s /q node_modules\.cache 2>nul
```

### 2.2. Kiểm tra Gradle Properties

**File: `android/gradle.properties`**

Đảm bảo có các cấu hình sau:
```properties
org.gradle.jvmargs=-Xmx4048m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8

android.useAndroidX=true
android.enableJetifier=true

# Version SDK
sdkVersion=0.0.0
```

## Bước 3: Build AAR Release

### 3.1. Build Command (Cách đơn giản nhất)

```bash
cd D:\CMC\jitsi-meet\android

# Build release AAR
gradlew.bat :sdk:assembleRelease
```

**Giải thích:**
- `:sdk` - Module SDK cần build
- `assembleRelease` - Build variant release

### 3.2. Build với Output Chi tiết

```bash
cd D:\CMC\jitsi-meet\android

# Build với log chi tiết
gradlew.bat :sdk:assembleRelease --info

# Hoặc với debug output
gradlew.bat :sdk:assembleRelease --stacktrace
```

### 3.3. Build với Clean (Khuyến nghị)

```bash
cd D:\CMC\jitsi-meet\android

# Clean trước khi build
gradlew.bat clean :sdk:assembleRelease
```

## Bước 4: Kiểm tra Output

### 4.1. Vị trí File AAR

Sau khi build thành công, file AAR sẽ ở:

```
D:\CMC\jitsi-meet\android\sdk\build\outputs\aar\sdk-release.aar
```

### 4.2. Kiểm tra File đã được tạo

```bash
# Kiểm tra file tồn tại
dir D:\CMC\jitsi-meet\android\sdk\build\outputs\aar\sdk-release.aar

# Kiểm tra kích thước file (thường 50-100MB)
for %%A in ("D:\CMC\jitsi-meet\android\sdk\build\outputs\aar\sdk-release.aar") do echo %%~zA bytes
```

### 4.3. Kiểm tra Metadata AAR

**Cách 1: Dùng 7-Zip hoặc WinRAR**
- Mở file `.aar` như một file ZIP
- Kiểm tra có các thư mục:
  - `classes.jar` - Compiled Java code
  - `AndroidManifest.xml` - Manifest
  - `res/` - Resources
  - `assets/` - Assets (bao gồm JS bundle)

**Cách 2: Dùng Gradle task**

```bash
cd D:\CMC\jitsi-meet\android
gradlew.bat :sdk:dependencies
```

## Bước 5: Build với Script Tự động

### 5.1. Sử dụng Script có sẵn

```bash
cd D:\CMC\jitsi-meet\android\scripts
build-sdk-for-flutter.bat release
```

### 5.2. Tạo Script Custom

**File: `build-aar.bat`**
```batch
@echo off
setlocal

echo ========================================
echo Building Jitsi Meet SDK AAR
echo ========================================
echo.

SET PROJECT_DIR=D:\CMC\jitsi-meet
SET ANDROID_DIR=%PROJECT_DIR%\android
SET AAR_OUTPUT=%ANDROID_DIR%\sdk\build\outputs\aar\sdk-release.aar

echo Step 1: Checking Node.js...
where node >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found!
    EXIT /B 1
)
node --version
echo.

echo Step 2: Installing npm dependencies...
cd /d "%PROJECT_DIR%"
IF NOT EXIST node_modules (
    echo Installing...
    call npm install
    IF %ERRORLEVEL% NEQ 0 (
        echo ERROR: npm install failed
        EXIT /B 1
    )
) ELSE (
    echo node_modules exists, skipping...
)
echo.

echo Step 3: Building Android AAR...
cd /d "%ANDROID_DIR%"
call gradlew.bat clean :sdk:assembleRelease
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build failed!
    EXIT /B 1
)
echo.

echo Step 4: Verifying output...
IF EXIST "%AAR_OUTPUT%" (
    echo.
    echo ========================================
    echo Build SUCCESS!
    echo ========================================
    echo.
    echo AAR Location:
    echo %AAR_OUTPUT%
    echo.
    FOR %%A IN ("%AAR_OUTPUT%") DO (
        echo File Size: %%~zA bytes (%%~zA / 1024 / 1024 MB)
    )
    echo.
    echo You can now use this AAR in your Flutter project!
) ELSE (
    echo ERROR: AAR file not found!
    EXIT /B 1
)

endlocal
```

**Sử dụng:**
```bash
# Chạy script
build-aar.bat
```

## Bước 6: Troubleshooting

### 6.1. Lỗi "Node.js not found"

**Giải pháp:**
```bash
# Kiểm tra Node.js đã cài
where node

# Nếu không có, cài đặt từ:
# https://nodejs.org/

# Hoặc thêm vào PATH
set PATH=%PATH%;C:\Program Files\nodejs\
```

### 6.2. Lỗi "Gradle build failed"

**Kiểm tra:**
```bash
# Xem log chi tiết
cd android
gradlew.bat :sdk:assembleRelease --stacktrace --info > build.log 2>&1

# Xem file log
notepad build.log
```

**Các lỗi thường gặp:**

**a) "NDK not found"**
```bash
# Cài NDK qua Android Studio
# Hoặc set trong local.properties:
ndk.dir=C\:\\Users\\YourName\\AppData\\Local\\Android\\Sdk\\ndk\\27.1.12297006
```

**b) "SDK not found"**
```bash
# Tạo android/local.properties:
sdk.dir=C\:\\Users\\YourName\\AppData\\Local\\Android\\Sdk
```

**c) "Out of memory"**
```bash
# Tăng memory trong gradle.properties:
org.gradle.jvmargs=-Xmx6144m -XX:+HeapDumpOnOutOfMemoryError
```

### 6.3. Lỗi "npm install failed"

**Giải pháp:**
```bash
# Xóa cache và cài lại
rmdir /s /q node_modules
rmdir /s /q package-lock.json
npm cache clean --force
npm install
```

### 6.4. Lỗi "React Native bundle failed"

**Kiểm tra:**
```bash
# Build JS bundle manually
npx react-native bundle --platform android --dev false --entry-file index.android.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/
```

### 6.5. Lỗi "Duplicate classes"

**Giải pháp:**
```bash
# Clean và rebuild
cd android
gradlew.bat clean
gradlew.bat :sdk:assembleRelease
```

## Bước 7: Verify AAR Content

### 7.1. Kiểm tra JavaScript Bundle

```bash
# Extract AAR (đổi extension thành .zip)
copy android\sdk\build\outputs\aar\sdk-release.aar temp.zip

# Extract và kiểm tra
# Mở temp.zip, kiểm tra assets/index.android.bundle có tồn tại
```

### 7.2. Kiểm tra Assets

AAR nên chứa:
- `assets/index.android.bundle` - React Native JS bundle
- `assets/sounds/*` - Sound files
- `res/drawable/*` - Images
- `res/values/*` - Strings, colors

### 7.3. Kiểm tra ImmersiveView Code

```bash
# Kiểm tra JS bundle có chứa ImmersiveView
findstr /C:"ImmersiveView" android\sdk\build\outputs\aar\sdk-release.aar
# (Cần extract AAR trước)
```

## Bước 8: Build với Custom Version

### 8.1. Set Custom Version

```bash
# Set version qua environment variable
set OVERRIDE_SDK_VERSION=10.3.0-custom
cd android
gradlew.bat :sdk:assembleRelease
```

### 8.2. Hoặc Modify gradle.properties

**File: `android/gradle.properties`**
```properties
sdkVersion=10.3.0-custom
```

## Bước 9: Build Debug AAR (Optional)

Nếu cần debug AAR:

```bash
cd android
gradlew.bat :sdk:assembleDebug
```

File sẽ ở: `android/sdk/build/outputs/aar/sdk-debug.aar`

## Bước 10: Publish lên Maven Local

### 10.1. Publish để sử dụng trong Flutter

```bash
cd android
gradlew.bat :sdk:publishToMavenLocal
```

**Kiểm tra:**
```bash
# Kiểm tra đã publish
dir %USERPROFILE%\.m2\repository\org\jitsi\react\jitsi-meet-sdk\
```

### 10.2. Sử dụng trong Flutter

**android/build.gradle:**
```gradle
allprojects {
    repositories {
        mavenLocal()  // Thêm dòng này
        // ... other repos
    }
}
```

**android/app/build.gradle:**
```gradle
dependencies {
    implementation 'org.jitsi.react:jitsi-meet-sdk:0.0.0'
}
```

## Checklist Trước Khi Build

- [ ] Node.js đã cài đặt (v16+)
- [ ] Java JDK 17+ đã cài đặt
- [ ] Android SDK và NDK đã cài đặt
- [ ] `ANDROID_HOME` đã được set
- [ ] `android/local.properties` đã có `sdk.dir`
- [ ] `npm install` đã chạy thành công
- [ ] Không có lỗi linter trong code
- [ ] Đã test trên device/emulator trước

## Quick Build Command

**Tất cả trong một lệnh:**

```bash
cd D:\CMC\jitsi-meet && npm install && cd android && gradlew.bat clean :sdk:assembleRelease
```

## Expected Output

Sau khi build thành công, bạn sẽ thấy:

```
BUILD SUCCESSFUL in 5m 30s
```

Và file AAR ở:
```
D:\CMC\jitsi-meet\android\sdk\build\outputs\aar\sdk-release.aar
```

**Kích thước thường:** 50-100 MB (bao gồm JS bundle, assets, và native libraries)

## Next Steps

Sau khi build xong AAR:

1. Copy AAR vào Flutter project (xem `BUILD_SDK_FOR_FLUTTER.md`)
2. Hoặc publish lên Maven Local (xem bước 10)
3. Integrate vào Flutter app (xem `REPLACE_FLUTTER_PLUGIN.md`)

## Tóm tắt Command

```bash
# Full build process
cd D:\CMC\jitsi-meet
npm install
cd android
gradlew.bat clean :sdk:assembleRelease

# Verify output
dir sdk\build\outputs\aar\sdk-release.aar
```



