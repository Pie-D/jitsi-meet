# Changelog: Release 10888 → 10978

Tổng cộng **127 commits** trên 3 repos.

---

## jitsi-meet (107 commits)

### 🎨 Whiteboard (Excalidraw)
| Commit | Mô tả |
|--------|-------|
| `5e58c9b` | **Migrate to Excalidraw v0.18.0** - cập nhật lớn |
| `4f06c43` | Cập nhật dependencies whiteboard, loại bỏ features không dùng |
| `fc4186b` | Cập nhật whiteboard tiếp theo |
| `d11a9da` | **Lazy load whiteboard dependency** - giảm bundle size |
| `2d6be4e` | Fix excalidraw trong deb package |
| `9e7c09c` | Ngăn điều hướng thứ 2 khi đang collaboration |

### 🎙️ Recording & Transcription
| Commit | Mô tả |
|--------|-------|
| `a96bb5f` | **Thêm feature flag `local-recording` riêng** |
| `6534e6f` | Thêm indicator transcription riêng với notification theo ngữ cảnh |
| `e7cbb1f` | Check JWT features thay vì moderator role cho recording label |
| `9604f0f` | Giới hạn stop recording dialog cho moderators |
| `2fa9178` | Fix race conditions trong recording/transcription notifications |
| `296c3c8` | Wire iFrame API start/stop qua intent flow |
| `e165cb5` | Cập nhật file audio notification với giọng tự nhiên hơn |
| `18f74c1` | Allow recording-only metadata moderation (prosody) |

### 🏗️ Breakout Rooms
| Commit | Mô tả |
|--------|-------|
| `fe09774` | Fixes breakout rooms |
| `80ad2c9` | Bypass `disableInitialGUM` khi join breakout room |

### 💬 Chat & Custom Panel
| Commit | Mô tả |
|--------|-------|
| `e672aaa` | **Thêm resizable panel width** với drag handle và persistence |
| `9a39179` | Fix custom panel - bỏ nút close |
| `d688cfe` | Refresh videoSpaceWidth khi panel toggle |
| `aac7606` | Store `replyToId` trong Redux |
| `716ceb0` | Thêm `messageId` và `replyToMessageId` trong incoming-message API |
| `2d534bf` | Replace kebab-case vendor style với camelCase |

### 🌐 Internationalization (i18n)
| Commit | Mô tả |
|--------|-------|
| `d47272` | Fix format cho ngôn ngữ phụ thuộc region |
| `740fd90` | Cập nhật Arabic |
| `aea772f` | Cập nhật zh-TW (Traditional Chinese) |
| `3b746f2` | Cập nhật Latvian |
| `92836a4` | Cập nhật Italian |
| `9bc30fa` | Cập nhật Dutch |
| `c40a19a`, `c08a1d4`, `cfd7907`, `144bc65` | Cập nhật German |
| `757464` | Cập nhật Polish |

### 🔧 Infrastructure / Dependencies
| Commit | Mô tả |
|--------|-------|
| `567d623` | **Bump `uuid` 8.3.2 → 14.0.0** |
| `4ec647c` | Bump `@xmldom/xmldom` 0.8.7 → 0.8.13 |
| `9a6babd` | Bump `lodash-es` 4.17.23 → 4.18.1 |
| `9cacffe` | Upgrade `@jitsi/js-utils` to 6.3.2 |
| `b3cab7d` | **Update React/React Native to 0.79.7** |
| `0c10d42` | React 19.0.0 / React Native 0.79.7 fixes |
| `ef0bf10` | Pin GitHub Actions to SHA hashes (security) |
| `5a11cd8` | Lazy load insecure room name checker |
| `358c13a`, `c0145081`, `860eea4`, `37290342`, `af54960`, `4758dcf`, `87b3cfe`, `b0ecd27` | Nhiều lần update `lib-jitsi-meet@latest` |

### 🐛 Bug Fixes (quan trọng)
| Commit | Mô tả |
|--------|-------|
| `ace5b70` | Fix reconnect on shard changed khi `enableForcedReload` chưa set |
| `e2b9fa7` | **Reload on SHARD_CHANGED_ERROR** khi conference đã cleanup |
| `ca950ca` | Fix requesting undefined URL on connection failed |
| `ae46212` | **Retry attach on failure** và re-attach sau play exhaustion |
| `eb531ea` | Prevent body scroll bởi cross-frame `scrollIntoView` |
| `0888f1e` | Đơn giản hóa URL checks cho etherpad |
| `f132ed6` | Fix base cho dynamic loaded libs |
| `3f316dd` | Fix `make dev` (webpack-proxy) |
| `fc582405` | Guard `is_focus` against nil nick (prosody) |
| `b57f8f9` | Nil check (prosody) |

### 🔍 Metadata & Visitors
| Commit | Mô tả |
|--------|-------|
| `6633bbf` | **Moves TURN information to metadata module** - thay đổi kiến trúc |
| `68914b9` | React to `dialinEnabled` metadata changes trong invite dialog |
| `b52be35` | Ẩn visitors dialog cho SIP jibri |
| `2c43785` | Remove duplicate check cho visitors |

### 🧪 Testing
| Commit | Mô tả |
|--------|-------|
| `0cb8f9d` | Test prosody-plugins: integration + unit tests với Allure reporting |
| `52d031d`, `9657d93` | Thêm prosody module tests |
| `2cc6953` | Test desktop-sharing multi-stream |
| `41ba851` | E2E tests cho virtual background dialog |
| Nhiều commits khác | Fixes cho WDIO tests, custom matchers, grid routing |

### ⌨️ UI/UX
| Commit | Mô tả |
|--------|-------|
| `57b8209` | Support Ctrl+Alt modifier combos trong shortcuts |
| `c070495` | Hiển thị shortcuts trong settings nếu có trong list |
| `04dc27b` | Fix custom palette colors không áp dụng cho semantic tokens |
| `5669d5f` | Refactor overlay logic vào middleware |
| `95c420c` | Thêm deprecated JSDoc annotations cho legacy config |

---

## lib-jitsi-meet (14 commits)

### 🔑 Quan trọng
| Commit | Mô tả |
|--------|-------|
| `98f8d2e` | **Moves reading TURN information from metadata** - thay đổi kiến trúc, TURN info giờ đi qua room_metadata thay vì disco-info |
| `9624ece` | Fix SendVideoController: dùng per-session constraints tránh P2P sender constraint race |
| `a99a68d` | **Spec-compliant simulcast trên Firefox** |
| `df9bfa9` | Strip `sdes:mid` header extension từ remote SDP trên Firefox |
| `82d339e` | Report getUserMedia errors qua RTCStats |
| `94d0e53` | Thêm opus bitrate khi toggle stereo/mono |

### 🔧 Dependencies
| Commit | Mô tả |
|--------|-------|
| `3884dbd` | Bump `@jitsi/js-utils` to 6.3.2 |
| `8edb566` | Bump `lodash-es` → 4.18.1 |
| `691b167` | Bump `lodash` → 4.18.1 |
| `ac96290` | Bump `uuid` 8.3.2 → 14.0.0 |

### 🐛 Fixes
| Commit | Mô tả |
|--------|-------|
| `363f750` | Drop scheduling ws keep-alive on shard set |
| `94bdbc7` | Fix type error khi build trong jitsi-meet |
| `5076104` | Pin GitHub Actions to SHA hashes |

---

## docker-jitsi-meet (6 commits)

| Commit | Mô tả |
|--------|-------|
| `bb974c7` | Merge release stable-10978 |
| `6e64f72` | Release tag `stable-10978` |
| `43ec99c` | **Thêm `muc_resource_validate` module support** - prosody module mới |
| `4d3466d` | Pin GitHub Actions to SHA hashes |
| `617bec0` | **Thêm MID RTP header extension support** cho jicofo (enabled by default) |
| `44116c6` | Working on unstable |

---

## Tóm tắt thay đổi chính

> [!IMPORTANT]
> ### Breaking / Cần chú ý khi upgrade
> 1. **Excalidraw v0.18.0** - Yêu cầu nâng `excalidraw-backend` Docker image lên `latest`/`2026.3.0` ✅ (đã fix)
> 2. **TURN info qua metadata** - TURN credentials giờ được gửi qua `room_metadata_component` thay vì disco-info → cần đảm bảo prosody `room_metadata_component` hoạt động ✅
> 3. **uuid 8.3.2 → 14.0.0** - Major version bump, thay đổi API import
> 4. **React Native 0.79.7** - Nếu có mobile app cần cập nhật tương ứng
> 5. **MID RTP header extension** (jicofo) - Enabled by default, có thể ảnh hưởng compatibility

> [!TIP]
> ### Cải thiện đáng chú ý
> - **Lazy load whiteboard** → giảm initial bundle size
> - **Resizable chat/custom panel** → UX tốt hơn
> - **Recording improvements** → JWT-based permissions, separate transcription indicator
> - **Firefox fixes** → simulcast spec-compliant, sdes:mid strip
> - **Reconnect improvements** → tự động reload khi shard change
