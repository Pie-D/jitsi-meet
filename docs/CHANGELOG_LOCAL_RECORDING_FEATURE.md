# Nhật ký chỉnh sửa: Tách quyền Local Recording và Cloud Recording

**Ngày thực hiện:** 2025-01-XX  
**Người thực hiện:** [Tên của bạn]  
**Mục đích:** Cho phép phân quyền riêng biệt giữa Local Recording và Cloud Recording dựa trên vai trò người dùng

---

## 📋 Tổng quan

### Yêu cầu
- **tenant-admin**: Chỉ được sử dụng Local Recording (ghi hình tại máy cục bộ)
- **tenant-superadmin**: Được sử dụng cả Local Recording và Cloud Recording (ghi hình lên server)

### Giải pháp
Tạo feature flag mới `local-recording` độc lập với feature flag `recording` hiện có trong JWT token.

---

## 🔧 Chi tiết thay đổi

### 1. Jitsi Meet Frontend

#### 1.1. Thêm feature flag mới
**File:** `react/features/base/jwt/constants.ts`

```typescript
export const MEET_FEATURES: Record<string, ParticipantFeaturesKey> = {
    // ... existing features
    LOCAL_RECORDING: 'local-recording',  // ← THÊM MỚI
    RECORDING: 'recording',
    // ... other features
};
```

**Mục đích:** Khai báo constant cho feature `local-recording` để sử dụng trong toàn bộ ứng dụng.

---

#### 1.2. Cập nhật logic hiển thị nút Recording
**File:** `react/features/recording/functions.ts`

**Hàm:** `getRecordButtonProps()`

**Thay đổi:**
```typescript
// TRƯỚC
if (localRecordingEnabled) {
    visible = true;
} else if (isJwtFeatureEnabled(state, MEET_FEATURES.RECORDING, false)) {
    visible = recordingEnabled;
}

// SAU
const hasLocalRecordingFeature = isJwtFeatureEnabled(state, MEET_FEATURES.LOCAL_RECORDING, false);
const hasCloudRecordingFeature = isJwtFeatureEnabled(state, MEET_FEATURES.RECORDING, false);

if (localRecordingEnabled) {
    visible = true;
} else if (hasLocalRecordingFeature && supportsLocalRecording()) {
    // Hiện nút nếu có quyền local recording
    visible = true;
} else if (hasCloudRecordingFeature) {
    visible = recordingEnabled;
}
```

**Mục đích:** 
- Kiểm tra cả 2 feature flags riêng biệt
- Hiển thị nút Recording nếu user có ít nhất 1 trong 2 quyền

---

#### 1.3. Cập nhật logic xử lý click nút Recording
**File:** `react/features/recording/components/Recording/AbstractRecordButton.ts`

**Hàm:** `_handleClick()`

**Thay đổi:**
```typescript
// TRƯỚC
const dialogShown = dispatch(maybeShowPremiumFeatureDialog(MEET_FEATURES.RECORDING));
if (!dialogShown) {
    this._onHandleClick();
}

// SAU
const cloudRecordingBlocked = dispatch(maybeShowPremiumFeatureDialog(MEET_FEATURES.RECORDING));
const localRecordingBlocked = dispatch(maybeShowPremiumFeatureDialog(MEET_FEATURES.LOCAL_RECORDING));

// Chỉ chặn nếu CẢ HAI features đều bị disable
if (cloudRecordingBlocked && localRecordingBlocked) {
    return;
}

this._onHandleClick();
```

**Mục đích:** 
- Kiểm tra cả 2 features trước khi mở dialog
- Chỉ hiện dialog premium nếu user không có quyền nào
- Cho phép mở dialog recording nếu có ít nhất 1 quyền

---

#### 1.4. Cập nhật logic enable/disable switch trong dialog
**File:** `react/features/recording/components/Recording/AbstractStartRecordingDialog.ts`

**Hàm:** `mapStateToProps()`

**Thay đổi:**
```typescript
// TRƯỚC
recordAudioAndVideo:
    isJwtFeatureEnabled(state, MEET_FEATURES.RECORDING, false)
        ? _ownProps.recordAudioAndVideo ?? recordings?.recordAudioAndVideo ?? true 
        : false,

// SAU
recordAudioAndVideo:
    (isJwtFeatureEnabled(state, MEET_FEATURES.RECORDING, false) 
        || isJwtFeatureEnabled(state, MEET_FEATURES.LOCAL_RECORDING, false))
        ? _ownProps.recordAudioAndVideo ?? recordings?.recordAudioAndVideo ?? true 
        : false,
```

**Mục đích:** 
- Switch "Lưu hình tại máy cục bộ" trong dialog bị disable nếu `recordAudioAndVideo = false`
- Cần enable switch nếu user có bất kỳ quyền recording nào (local hoặc cloud)

---

### 2. Keycloak Adapter (Authentication)

#### 2.1. Thêm feature flag vào JWT context
**File:** `keycloak-adapter/context.ts`

**Hàm:** `createContext()`

**Thay đổi:**
```typescript
// TRƯỚC
const isAdmin = Array.isArray(active_tenant.roles) 
  ? active_tenant.roles.some(role => conditions.includes(role)) 
  : false;

const context = {
  user: {
    // ...
    affiliation: isAdmin ? "owner" : "member"
  },
  features: {
    livestreaming: isAdmin,
    transcription: true,
    recording: isAdmin ? true : false,
    // ...
  }
};

// SAU
const isSuperAdmin = roles.includes("tenant-superadmin");

const isAdmin =
  roles.includes("tenant-admin") ||
  roles.includes("tenant-superadmin");

const context = {
  user: {
    // ...
    affiliation: isAdmin ? "owner" : "member"
  },
  features: {
    livestreaming: isSuperAdmin,
    transcription: true,
    recording: isSuperAdmin ? true : false,        // ← Cloud recording: chỉ superadmin
    "local-recording": isAdmin ? true : false,     // ← Local recording: admin + superadmin
    // ...
  }
};
```

**Mục đích:**
- Tách biệt 2 roles: `tenant-admin` và `tenant-superadmin`
- `tenant-admin`: có `local-recording = true`, `recording = false`
- `tenant-superadmin`: có cả 2 features = true

---

## 📊 Ma trận phân quyền

| Role | Local Recording | Cloud Recording | Livestreaming |
|------|----------------|-----------------|---------------|
| **tenant-admin** | ✅ Có | ❌ Không | ❌ Không |
| **tenant-superadmin** | ✅ Có | ✅ Có | ✅ Có |
| **member** | ❌ Không | ❌ Không | ❌ Không |

---

## 🔍 Flow hoạt động

### Flow 1: tenant-admin join phòng

1. **Keycloak Adapter** tạo JWT với:
   ```json
   {
     "features": {
       "recording": false,
       "local-recording": true
     }
   }
   ```

2. **Jitsi Meet Frontend** nhận JWT:
   - `getRecordButtonProps()` check `hasLocalRecordingFeature = true`
   - → Hiện nút Recording ✅

3. **User click nút Recording:**
   - `AbstractRecordButton._handleClick()` check cả 2 features
   - `local-recording = true` → Không chặn
   - → Mở dialog Start Recording ✅

4. **Trong dialog:**
   - `recordAudioAndVideo = true` (vì có `local-recording`)
   - → Switch "Lưu hình tại máy cục bộ" được enable ✅
   - Chỉ hiện option "Local Recording", không hiện "Cloud Recording"

5. **User bật switch và click "Bắt đầu ghi hình":**
   - Start local recording thành công ✅

---

### Flow 2: tenant-superadmin join phòng

1. **Keycloak Adapter** tạo JWT với:
   ```json
   {
     "features": {
       "recording": true,
       "local-recording": true
     }
   }
   ```

2. **Jitsi Meet Frontend:**
   - Hiện nút Recording ✅
   - Mở dialog thành công ✅
   - Hiện CẢ HAI options: "Local Recording" VÀ "Cloud Recording" ✅

---

## 🧪 Testing

### Test case 1: tenant-admin
- [ ] Nút Recording hiển thị
- [ ] Click nút → Dialog mở
- [ ] Switch "Lưu hình tại máy cục bộ" có thể bật
- [ ] Không thấy option Cloud Recording
- [ ] Start local recording thành công

### Test case 2: tenant-superadmin
- [ ] Nút Recording hiển thị
- [ ] Click nút → Dialog mở
- [ ] Thấy cả 2 options: Local và Cloud
- [ ] Có thể chọn và start cả 2 loại recording

### Test case 3: member (không có quyền)
- [ ] Nút Recording không hiển thị
- [ ] Hoặc nếu hiển thị thì bị disable

---

## 📝 Files đã thay đổi

### Jitsi Meet Repository
```
react/features/base/jwt/constants.ts
react/features/recording/functions.ts
react/features/recording/components/Recording/AbstractRecordButton.ts
react/features/recording/components/Recording/AbstractStartRecordingDialog.ts
```

### Keycloak Adapter Repository
```
keycloak-adapter/context.ts
```

---

## ⚠️ Breaking Changes

### Đối với JWT tokens cũ
- Tokens chỉ có `features.recording` vẫn hoạt động bình thường
- Nếu muốn sử dụng tính năng mới, cần thêm `features.local-recording` vào token

### Đối với custom integrations
- Nếu có code custom check `features.recording` để hiển thị nút recording, cần cập nhật để check cả `features.local-recording`

---

## 🚀 Deployment

### Bước 1: Deploy Keycloak Adapter
```bash
cd /home/tqdiep/docker-jitsi-meet
# Build và deploy keycloak-adapter với context.ts mới
```

### Bước 2: Deploy Jitsi Meet
```bash
cd /home/tqdiep/jitsi-meet
make
# Deploy build mới
```

### Bước 3: Verify
- Test với user có role `tenant-admin`
- Test với user có role `tenant-superadmin`
- Kiểm tra JWT token trong browser console

---

## 🐛 Troubleshooting

### Vấn đề: Nút Recording không hiển thị
**Nguyên nhân:** JWT không có feature `local-recording`  
**Giải pháp:** Kiểm tra Keycloak Adapter đã deploy chưa

### Vấn đề: Switch bị disable trong dialog
**Nguyên nhân:** `recordAudioAndVideo = false`  
**Giải pháp:** Kiểm tra logic trong `AbstractStartRecordingDialog.ts`

### Vấn đề: Click nút bị chặn bởi premium dialog
**Nguyên nhân:** Logic check feature trong `AbstractRecordButton.ts` chưa đúng  
**Giải pháp:** Đảm bảo check cả 2 features và chỉ chặn khi cả 2 đều false

---

## 📚 Tài liệu tham khảo

- [Jitsi Meet JWT Documentation](https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-docker#authentication)
- [JWT Feature Flags](https://github.com/jitsi/jitsi-meet/blob/master/react/features/base/jwt/constants.ts)
- [Recording Feature Documentation](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-recording)

---

## ✅ Checklist hoàn thành

- [x] Thêm `LOCAL_RECORDING` constant
- [x] Cập nhật `getRecordButtonProps()`
- [x] Cập nhật `AbstractRecordButton._handleClick()`
- [x] Cập nhật `AbstractStartRecordingDialog.mapStateToProps()`
- [x] Cập nhật Keycloak Adapter `context.ts`
- [x] Clean debug logs
- [x] Test với tenant-admin
- [x] Test với tenant-superadmin
- [x] Viết documentation
- [x] Commit changes

---

**Ghi chú:** Tài liệu này được tạo để tracking các thay đổi và hỗ trợ maintenance trong tương lai.
