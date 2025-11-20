# Quick Guide: Build AAR trong 3 bước

## Cách nhanh nhất (Khuyến nghị)

### Bước 1: Chạy script tự động

```bash
# Từ thư mục gốc D:\CMC\jitsi-meet
build-aar-simple.bat
```

Script sẽ tự động:
- ✅ Kiểm tra Node.js
- ✅ Cài đặt npm dependencies
- ✅ Build AAR release
- ✅ Hiển thị vị trí file output

### Bước 2: Kiểm tra file AAR

File sẽ ở:
```
D:\CMC\jitsi-meet\android\sdk\build\outputs\aar\sdk-release.aar
```

### Bước 3: Sử dụng AAR

Copy AAR vào Flutter project hoặc publish lên Maven Local (xem `BUILD_SDK_FOR_FLUTTER.md`)

---

## Cách thủ công (nếu script không chạy)

### Bước 1: Cài dependencies
```bash
npm install
```

### Bước 2: Build AAR
```bash
cd android
gradlew.bat clean :sdk:assembleRelease
```

### Bước 3: Kiểm tra output
```bash
dir sdk\build\outputs\aar\sdk-release.aar
```

---

## Troubleshooting nhanh

### Lỗi "Node.js not found"
→ Cài Node.js từ https://nodejs.org/

### Lỗi "Gradle build failed"
→ Xem log chi tiết: `gradlew.bat :sdk:assembleRelease --stacktrace`

### Lỗi "SDK not found"
→ Tạo file `android/local.properties`:
```properties
sdk.dir=C\:\\Users\\YourName\\AppData\\Local\\Android\\Sdk
```

### Lỗi "Out of memory"
→ Tăng memory trong `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx6144m
```

---

## Chi tiết đầy đủ

Xem file `BUILD_AAR_DETAILED_GUIDE.md` để biết chi tiết từng bước. ss



