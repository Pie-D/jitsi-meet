# IMMERSIVE VIEW - LUỒNG XỬ LÝ CHI TIẾT

Tài liệu này mô tả chi tiết luồng xử lý Immersive View từ khi bật đến khi di chuyển participants, bao gồm cả gọi hàm và thay đổi state.

---

## PHASE 1: MODERATOR BẬT IMMERSIVE VIEW

### Bước 1: Moderator click "Start Immersive View"
**File**: `react/features/immersive-view/components/ImmersiveSetupDialog.tsx`  
**Hàm**: `onSubmit()` (line 207-211)

**Logic**:
```typescript
const onSubmit = () => {
    dispatch(setImmersiveTemplate(selectedTpl));      // Line 208
    dispatch(setImmersiveSlotCount(selectedCount));    // Line 209
    dispatch(setImmersiveEnabled(true));               // Line 210
};
```

### Bước 2: Redux Actions được Dispatch
**File**: `react/features/immersive-view/actions.ts`  
**Hàm**: `setImmersiveEnabled()`, `setImmersiveTemplate()`, `setImmersiveSlotCount()`

**State Change**:
```typescript
// Redux state trước:
{ enabled: false, templateId: undefined, slotCount: 3 }

// Redux state sau:
{ enabled: true, templateId: 'circular', slotCount: 4 }
```

### Bước 3: Redux Middleware - GỬI QUA XMPP (Outgoing)
**File**: `react/features/immersive-view/middleware.ts` (line 15)

**Logic**:
```typescript
MiddlewareRegistry.register(store => next => action => {
    const result = next(action);  // Redux state được update trước
    
    const isModerator = state['features/base/participants']?.local?.role === 'moderator';
    
    // Chỉ moderator mới được gửi qua XMPP
    switch (action.type) {
        case SET_IMMERSIVE_ENABLED:
            if (isModerator) {
                conference.setImmersiveViewEnabled(action.enabled);  // → lib-jitsi-meet
            }
            break;
        case SET_IMMERSIVE_TEMPLATE:
            if (isModerator) {
                conference.setImmersiveViewTemplate(action.templateId);
            }
            break;
        case SET_IMMERSIVE_SLOT_COUNT:
            if (isModerator) {
                conference.setImmersiveViewSlotCount(action.slotCount);
            }
            break;
    }
    
    return result;
});
```

### Bước 4: Gửi qua XMPP (lib-jitsi-meet)
**File**: `lib-jitsi-meet/JitsiConference.ts`

**Hàm**: 
- `setImmersiveViewEnabled()` (line ~4700)
- `setImmersiveViewTemplate()` (line ~4715)
- `setImmersiveViewSlotCount()` (line ~4728)

**Logic**:
```typescript
public setImmersiveViewEnabled(enabled: boolean): void {
    if (!this.isModerator()) {
        logger.warn('Only moderators can enable/disable immersive view');
        return;
    }
    
    // Set participant property → XMPP presence
    this.setLocalParticipantProperty('immersive_view_enabled', enabled.toString());
}

public setImmersiveViewTemplate(templateId: string): void {
    if (!this.isModerator()) {
        logger.warn('Only moderators can change immersive view template');
        return;
    }
    
    this.setLocalParticipantProperty('immersive_view_template', templateId);
}

public setImmersiveViewSlotCount(slotCount: number): void {
    if (!this.isModerator()) {
        logger.warn('Only moderators can change immersive view slot count');
        return;
    }
    
    this.setLocalParticipantProperty('immersive_view_slot_count', slotCount.toString());
}
```

### Bước 5: Redux Reducer - Cập nhật State (MODERATOR)
**File**: `react/features/immersive-view/reducer.ts`

**Logic**:
```typescript
ReduxRegistry.register<IImmersiveState>('features/immersive-view', (state = DEFAULT_STATE, action): IImmersiveState => {
    switch (action.type) {
        case SET_IMMERSIVE_ENABLED:
            return { ...state, enabled: action.enabled };
        case SET_IMMERSIVE_TEMPLATE:
            return { ...state, templateId: action.templateId };
        case SET_IMMERSIVE_SLOT_COUNT:
            return { ...state, slotCount: action.slotCount };
        default:
            return state;
    }
});
```

---

## PHASE 2: USER NHẬN IMMERSIVE VIEW

### Bước 1: Nhận XMPP Presence
**File**: `lib-jitsi-meet/JitsiConferenceEventManager.ts`  
**Listener**: `chatRoom.setParticipantPropertyListener()` (line ~420)

**Logic**:
```typescript
chatRoom.setParticipantPropertyListener((id, prop, value) => {
    const participant = conference.getParticipantById(id);
    
    if (participant) {
        if (prop === 'immersive_view_enabled') {
            conference.eventEmitter.emit(
                JitsiConferenceEvents.IMMERSIVE_VIEW_ENABLED,
                participant.getId(), value === 'true'
            );
        } else if (prop === 'immersive_view_template') {
            conference.eventEmitter.emit(
                JitsiConferenceEvents.IMMERSIVE_VIEW_TEMPLATE_CHANGED,
                participant.getId(), value
            );
        } else if (prop === 'immersive_view_slot_count') {
            conference.eventEmitter.emit(
                JitsiConferenceEvents.IMMERSIVE_VIEW_SLOT_COUNT_CHANGED,
                participant.getId(), parseInt(value, 10)
            );
        }
    }
});
```

### Bước 2: Event được Emit
**File**: `lib-jitsi-meet/JitsiConferenceEvents.ts`

**Events**:
- `IMMERSIVE_VIEW_ENABLED`
- `IMMERSIVE_VIEW_TEMPLATE_CHANGED`
- `IMMERSIVE_VIEW_SLOT_COUNT_CHANGED`

### Bước 3: XMPP Middleware Nhận Event (USER)
**File**: `react/features/immersive-view/xmppMiddleware.ts` (line 19)

**Listener đã đăng ký** (khi `CONFERENCE_JOINED` action được dispatch, line 24):

**Logic** (line 34-60):
```typescript
// Đăng ký listener cho immersive view events
conference.on(JitsiConferenceEvents.IMMERSIVE_VIEW_ENABLED, (participantId: string, enabled: boolean) => {
    const participant = getState()['features/base/participants'].remote.get(participantId);
    
    // Chỉ nhận từ moderator
    if (participant && participant.role === 'moderator') {
        dispatch(setImmersiveEnabled(enabled));
    }
});

conference.on(JitsiConferenceEvents.IMMERSIVE_VIEW_TEMPLATE_CHANGED, (participantId: string, templateId: string) => {
    const participant = getState()['features/base/participants'].remote.get(participantId);
    
    if (participant && participant.role === 'moderator') {
        dispatch(setImmersiveTemplate(templateId));
    }
});

conference.on(JitsiConferenceEvents.IMMERSIVE_VIEW_SLOT_COUNT_CHANGED, (participantId: string, slotCount: number) => {
    const participant = getState()['features/base/participants'].remote.get(participantId);
    
    if (participant && participant.role === 'moderator') {
        dispatch(setImmersiveSlotCount(slotCount));
    }
});
```

### Bước 4: Redux State Cập nhật (USER)
**File**: `react/features/immersive-view/reducer.ts`

**Logic**: giống Phase 1 Bước 5

---

## PHASE 3: MODERATOR DI CHUYỂN PARTICIPANT

### Bước 1: Drag & Drop
**File**: `react/features/immersive-view/components/ImmersiveView.tsx`  
**Hàm**: `handleDrop()` (line 150)

**Logic**:
```typescript
const handleDrop = (index: number) => (e?: React.DragEvent) => {
    if (!isModerator) {
        console.log('❌ [ImmersiveView] Only moderators can drop participants');
        return;
    }
    
    const e = e?.nativeEvent;
    if (!e) return;
    
    const dataPid = (e.dataTransfer || e.target).getData?.('participant');
    
    const current = { ...(immersive?.assignments || {}) };
    const next: { [slotIndex: number]: string } = { ...current };
    
    if (dataPid) {
        // Nếu có participant được drag, assign vào slot này
        next[index] = dataPid;
    }
    
    // Nếu swap 2 slots
    if (dragIndex !== null && dragIndex !== index) {
        console.log('🎯 [ImmersiveView] Swap slots:', dragIndex, '->', index);
        dispatch(swapImmersiveSlots(dragIndex, index));  // → actions.ts
    } else if (dataPid) {
        console.log('🎯 [ImmersiveView] Drag & drop assignments:', next);
        dispatch(setImmersiveAssignments(next));  // → middleware.ts
    }
    
    setDragIndex(null);
};
```

### Bước 2: Redux Action - swapImmersiveSlots hoặc setImmersiveAssignments
**File**: `react/features/immersive-view/actions.ts`

**Logic** (line 46):
```typescript
export function swapImmersiveSlots(srcIndex: number, dstIndex: number) {
    return (dispatch: IStore['dispatch'], getState: IStore['getState']) => {
        const state = getState()['features/immersive-view'];
        const next = { ...(state?.assignments || {}) } as { [slotIndex: number]: string; };
        
        // Swap
        const tmp = next[srcIndex];
        next[srcIndex] = next[dstIndex];
        next[dstIndex] = tmp;
        
        dispatch(setImmersiveAssignments(next));
    };
}

export function setImmersiveAssignments(assignments: { [slotIndex: number]: string; }) {
    return {
        type: SET_IMMERSIVE_ASSIGNMENTS,
        assignments
    };
}
```

### Bước 3: Redux Middleware - Gửi qua XMPP
**File**: `react/features/immersive-view/middleware.ts` (line 54)

**Logic**:
```typescript
case SET_IMMERSIVE_ASSIGNMENTS: {
    console.log('🎯 [ImmersiveView Middleware] Dispatching assignments:', action.assignments);
    
    if (isModerator) {
        conference.sendImmersiveViewAssignments(action.assignments);  // → lib-jitsi-meet
    } else {
        console.log('❌ [ImmersiveView Middleware] Only moderators can send immersive view assignments');
    }
    break;
}
```

### Bước 4: Gửi Endpoint Message qua XMPP
**File**: `lib-jitsi-meet/JitsiConference.ts`  
**Hàm**: `sendImmersiveViewAssignments()` (line 4738)

**Logic**:
```typescript
public sendImmersiveViewAssignments(assignments: { [slotIndex: number]: string }): void {
    if (!this.isModerator()) {
        logger.warn('Only moderators can send immersive view assignments');
        return;
    }
    
    console.log('🎯 [JitsiConference] Sending assignments:', assignments);
    
    // Gửi qua endpoint message (khác với participant property!)
    this.sendEndpointMessage('', {
        name: 'immersive-view-assignments',
        assignments,  // { 0: "pid1", 1: "pid2", 2: "pid3" }
        timestamp: Date.now()
    });
    
    console.log('✅ [JitsiConference] Assignments sent successfully');
}
```

### Bước 5: Redux State Cập nhật (MODERATOR)
**File**: `react/features/immersive-view/reducer.ts`

**Logic**:
```typescript
case SET_IMMERSIVE_ASSIGNMENTS:
    return { ...state, assignments: action.assignments };
```

---

## PHASE 4: USER NHẬN ASSIGNMENTS

### Bước 1: Nhận Endpoint Message
**File**: `lib-jitsi-meet/JitsiConferenceEventManager.ts`  
**Listener**: `chatRoom.addListener(XMPPEvents.JSON_MESSAGE_RECEIVED)` (line 451)

**Logic**:
```typescript
chatRoom.addListener(XMPPEvents.JSON_MESSAGE_RECEIVED, (from: string, payload: any) => {
    console.log('📨 [JitsiConferenceEventManager] Received JSON message:', { from, payload });
    
    const id = Strophe.getResourceFromJid(from);
    const participant = conference.getParticipantById(id);
    
    if (participant) {
        console.log('👤 [JitsiConferenceEventManager] Participant found:', participant.getId(), participant.getRole());
        
        // Handle immersive view assignments
        if (payload.name === 'immersive-view-assignments') {
            console.log('🎯 [JitsiConferenceEventManager] Received assignments payload:', payload);
            console.log('🎯 [JitsiConferenceEventManager] Emitting IMMERSIVE_VIEW_ASSIGNMENTS_CHANGED:', participant.getId(), payload.assignments);
            
            // Emit event
            conference.eventEmitter.emit(
                JitsiConferenceEvents.IMMERSIVE_VIEW_ASSIGNMENTS_CHANGED,
                participant.getId(), payload.assignments
            );
        } else {
            console.log('📝 [JitsiConferenceEventManager] Other JSON message:', payload.name);
        }
        
        // Emit endpoint message cho các listener khác
        conference.eventEmitter.emit(
            JitsiConferenceEvents.ENDPOINT_MESSAGE_RECEIVED,
            participant, payload
        );
    }
});
```

### Bước 2: XMPP Middleware Nhận Event (USER)
**File**: `react/features/immersive-view/xmppMiddleware.ts` (line 62)

**Listener đã đăng ký**:
```typescript
conference.on(JitsiConferenceEvents.IMMERSIVE_VIEW_ASSIGNMENTS_CHANGED, (participantId: string, assignments: any) => {
    console.log('🎯 [ImmersiveView XMPP Middleware] Received assignments event:', { participantId, assignments });
    
    const currentState = getState();
    const participant = currentState['features/base/participants'].remote.get(participantId);
    
    console.log('👤 [ImmersiveView XMPP Middleware] Participant:', participant?.id, participant?.role);
    
    // Chỉ nhận từ moderator
    if (participant && participant.role === 'moderator') {
        console.log('✅ [ImmersiveView XMPP Middleware] Syncing assignments from moderator');
        dispatch(setImmersiveAssignments(assignments));  // → reducer.ts
    } else {
        console.log('❌ [ImmersiveView XMPP Middleware] Not from moderator, ignoring assignments');
    }
});
```

### Bước 3: Redux State Cập nhật (USER)
**File**: `react/features/immersive-view/reducer.ts`

**Logic**:
```typescript
case SET_IMMERSIVE_ASSIGNMENTS:
    return { ...state, assignments: action.assignments };
```

### Bước 4: UI Cập nhật
**File**: `react/features/immersive-view/components/ImmersiveView.tsx` (line 215)

**Component**: Render dựa trên `immersive.assignments` từ Redux state

**Logic**:
```typescript
if (!immersive?.enabled || !tpl) {
    return null;
}

return (
    <div className={classes.root}>
        <div className={classes.background} style={{ backgroundImage: `url(${tpl.backgroundUrl})` }} />
        {slots.map((s, idx) => {
            const pid = assignments[idx];  // Lấy participant ID từ assignments
            const p = ordered.find((pp: any) => pp.id === pid);  // Tìm participant
            
            let videoEl: React.ReactNode = null;
            
            if (p) {
                // Lấy track
                const track = getTrackByMediaTypeAndParticipant(tracks, MEDIA_TYPE.VIDEO, p.id);
                
                if (track && track.videoElement) {
                    videoEl = (
                        <div className={classes.videoWrapper}>
                            <video
                                ref={(node) => {
                                    if (node && track.videoElement && node !== track.videoElement.parentElement) {
                                        node.appendChild(track.videoElement);
                                    }
                                }}
                                className={p.local ? classes.videoLocal : classes.videoRemote}
                                autoPlay
                                muted={p.local}
                                playsInline
                            />
                        </div>
                    );
                } else {
                    // Fallback avatar
                    videoEl = (
                        <div className={classes.avatarWrapper}>
                            <Avatar participantId={p.id} size="100%" />
                        </div>
                    );
                }
            }
            
            return (
                <div
                    key={idx}
                    className={cx(classes.slot, {
                        [classes.slotHighlight]: pid === local?.id,
                        [classes.slotNormal]: pid !== local?.id,
                        [classes.slotDisabled]: !isModerator,
                    })}
                    style={{
                        left: `${s.x}%`,
                        top: `${s.y}%`,
                        width: `${s.w}%`,
                        height: `${s.h}%`,
                    }}
                >
                    <div
                        draggable={Boolean(p) && isModerator}
                        onDragStart={handleDragStart(idx)}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop(idx)}
                        className={classes.slotContent}
                    >
                        {videoEl}
                    </div>
                </div>
            );
        })}
    </div>
);
```

---

## REDUX STATE STRUCTURE

```typescript
interface IImmersiveState {
    enabled: boolean;                              // Bật/tắt immersive view
    templateId?: string;                          // Template ID (circular, linear, etc.)
    slotCount: number;                            // Số slot
    assignments: { [slotIndex: number]: string; }  // Slots gán cho participants
    followActiveSpeaker: boolean;                 // Tự động follow active speaker
}
```

### Default State:
```typescript
const DEFAULT_STATE: IImmersiveState = {
    enabled: false,
    templateId: undefined,
    slotCount: 3,
    assignments: {},
    followActiveSpeaker: false
};
```

---

## DEBUG LOGS

### Moderator Drag & Drop:
```
🎯 [ImmersiveView] Drag & drop assignments: {0: "pid3", 1: "pid2", 2: "pid1"}
🎯 [ImmersiveView Middleware] Dispatching assignments: {0: "pid3", 1: "pid2", 2: "pid1"}
🎯 [JitsiConference] Sending assignments: {0: "pid3", 1: "pid2", 2: "pid1"}
✅ [JitsiConference] Assignments sent successfully
```

### User Nhận Assignments:
```
📨 [JitsiConferenceEventManager] Received JSON message: {from: "moderator@...", payload: {...}}
👤 [JitsiConferenceEventManager] Participant found: moderator123 moderator
🎯 [JitsiConferenceEventManager] Received assignments payload: {...}
🎯 [ImmersiveView XMPP Middleware] Received assignments event: {participantId: "moderator123", assignments: {...}}
👤 [ImmersiveView XMPP Middleware] Participant: moderator123 moderator
✅ [ImmersiveView XMPP Middleware] Syncing assignments from moderator
```

---

## CÁC FILE CHÍNH THAM GIA

### Frontend (React/Redux):
1. **`react/features/immersive-view/components/ImmersiveSetupDialog.tsx`**
   - UI để moderator chọn template và slot count
   - Hàm `onSubmit()` dispatch actions

2. **`react/features/immersive-view/components/ImmersiveView.tsx`**
   - UI hiển thị immersive view và xử lý drag & drop
   - Hàm `handleDrop()` xử lý việc di chuyển participants

3. **`react/features/immersive-view/actions.ts`**
   - Redux actions cho immersive view

4. **`react/features/immersive-view/middleware.ts`**
   - Redux middleware để gửi state qua XMPP (outgoing)

5. **`react/features/immersive-view/xmppMiddleware.ts`**
   - Redux middleware để nhận state từ XMPP (incoming)

6. **`react/features/immersive-view/reducer.ts`**
   - Redux reducer để quản lý state

### Backend (lib-jitsi-meet):
1. **`lib-jitsi-meet/JitsiConference.ts`**
   - Gửi state qua XMPP (presence properties và endpoint messages)
   - Methods:
     - `setImmersiveViewEnabled()`
     - `setImmersiveViewTemplate()`
     - `setImmersiveViewSlotCount()`
     - `sendImmersiveViewAssignments()`

2. **`lib-jitsi-meet/JitsiConferenceEventManager.ts`**
   - Nhận XMPP events và emit JitsiConferenceEvents
   - Listener cho `XMPPEvents.JSON_MESSAGE_RECEIVED`
   - Listener cho participant properties

3. **`lib-jitsi-meet/JitsiConferenceEvents.ts`**
   - Định nghĩa events cho immersive view

---

## LƯU Ý QUAN TRỌNG

### 1. Participant Properties vs Endpoint Messages:
- **Participant Properties** (`setLocalParticipantProperty()`):
  - Dùng cho: `enabled`, `template`, `slotCount`
  - Tự động sync qua XMPP presence
  - Nhận qua `setParticipantPropertyListener`

- **Endpoint Messages** (`sendEndpointMessage()`):
  - Dùng cho: `assignments`
  - Phải gửi message trực tiếp qua XMPP
  - Nhận qua `JSON_MESSAGE_RECEIVED`

### 2. Moderator Check:
- **Frontend**: Check `isLocalParticipantModerator` trong UI và middleware
- **Backend**: Check `isModerator()` trong `JitsiConference` methods

### 3. Redux Flow:
1. **Action** → Dispatch action
2. **Reducer** → Update Redux state
3. **Middleware** (outgoing) → Send via XMPP
4. **XMPP** → Receive via network
5. **Event Manager** → Emit event
6. **Middleware** (incoming) → Dispatch action
7. **Reducer** → Update Redux state
8. **Component** → Re-render

### 4. Debug Tips:
- Check logs theo thứ tự: Moderator → Network → User
- Nếu user không nhận được:
  - Kiểm tra XMPP connection
  - Kiểm tra moderator permissions
  - Kiểm tra event listeners có được register không

