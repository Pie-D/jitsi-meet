## Room Owner → Moderator Flow (Prosody → lib-jitsi-meet → Jitsi Meet)

### 1) Prosody: Room initialization
- Hook: `muc-room-created`
  - Generate and store `room._data.meetingId`

### 2) Prosody: Detect the owner early
- Hook: `muc-occupant-pre-join` (priority 1)
  - Skip admin/healthcheck rooms
  - If `room._data.owner` is not set yet, set it to the first joiner's identifier
    - Prefer prefix of `occupant.bare_jid` before `-`; fallback to full `bare_jid`

### 3) Prosody: Promote owner to moderator (affiliation owner)
- Hook: `muc-occupant-joined` (priority 5)
  - If current `occupant` is the saved owner:
    - Set `event.origin.token_affiliation_checked = true` to prevent `mod_token_affiliation` from overriding
    - Retry setting affiliation to `owner` (up to ~8 times with increasing delay) until `room:get_affiliation()` returns `owner`/`admin`
    - Note: affiliation `owner` implicitly maps to role `moderator` in XMPP MUC

### 4) Prosody → Client: Presence + Disco Info
- Presence: emits role changes (e.g., `moderator`) to clients
- Disco Info (muc-disco#info / muc-config-form): exposes
  - `muc#roominfo_meetingId`
  - `muc#roominfo_roomOwner`

### 5) lib-jitsi-meet: Consume and forward events
- ChatRoom.discoRoomInfo():
  - Parse `muc#roominfo_roomOwner` → `setRoomOwner()` → emit `XMPPEvents.ROOM_OWNER_SET`
- ChatRoom.onPresence():
  - Detect role changes → emit `XMPPEvents.LOCAL_ROLE_CHANGED` / `XMPPEvents.MUC_ROLE_CHANGED`
- JitsiConferenceEventManager:
  - Forwards `ROOM_OWNER_SET` → `JitsiConferenceEvents.CONFERENCE_ROOM_OWNER_SET`
  - Forwards role changes → `JitsiConferenceEvents.USER_ROLE_CHANGED`

### 6) Jitsi Meet UI (web)
- Middleware: on `CONFERENCE_ROOM_OWNER_SET` store `ownerId` in Redux (for UI visibility)
- UI listens to `USER_ROLE_CHANGED` and updates local/remote participant roles; owner will be `moderator` once affiliation is `owner`

### Notes & Rationale
- Server-side (Prosody) is the source of truth for permissions; client does not grant moderator
- Retry + later priority minimize races with other modules (e.g., `mod_token_affiliation`, `jitsi_permissions`)
- Setting affiliation to `owner` is the correct API; role `moderator` follows automatically from affiliation

### Files touched (key points)
- `resources/prosody-plugins/mod_muc_meeting_id.lua`
  - `muc-occupant-pre-join`: set `room._data.owner`
  - `muc-occupant-joined`: retry `room:set_affiliation(true, jid, "owner")`; set `token_affiliation_checked`
  - `muc-disco#info` / `muc-config-form`: publish `muc#roominfo_roomOwner`
- `lib-jitsi-meet`
  - `ChatRoom.ts`: parse disco info (owner), emit events; handle presence role changes
  - `JitsiConferenceEventManager.ts`: forward XMPP → Jitsi events
- `jitsi-meet`
  - `react/features/base/conference/middleware.web.ts`: store `ownerId`; no client-side grant


