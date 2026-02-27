# Visual Guide & Examples - Real-Time Queue Management

## User Interface Changes

### 1. Queue Management Page Header

**BEFORE:**
```
┌─────────────────────────────────────────────┐
│ Queue Management                            │
│ Manage patient flow for consultations       │
│                        [Refresh Button]     │
└─────────────────────────────────────────────┘
```

**AFTER:**
```
┌─────────────────────────────────────────────┐
│ Queue Management                            │
│ Manage patient flow for consultations       │
│                 [🔌 Live Updates] [Refresh] │
└─────────────────────────────────────────────┘
     (Green indicator shows WebSocket connected)
```

---

## 2. New Queue Item Appearance

### Visual Indicators:

```
┌─────────────────────────────────────────────────────────────┐
│ 🟢 NEW ✨ ANIMATED PULSE WITH GREEN RING                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐  John Doe  [PAT-1234]  🔄 Waiting   [NEW] 🟢  │
│  │ Token   │  Dr. Sarah Smith • Cardiology                  │
│  │  001    │  ⏰ Arrival: 10:30 AM                           │
│  └─────────┘                                                │
│                   [No Show]  [Visited]                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Animation: Green ring pulses for 5 seconds
Status: Auto-removes "NEW" badge after 5 seconds
```

### Toast Notification Example:

```
┌──────────────────────────────────────┐
│ ✓ John Doe added to queue            │
│   (Token: TKN-001)                   │
│                                      │
│ [Auto-dismiss after 4 seconds]       │
└──────────────────────────────────────┘
```

---

## 3. Queue Statistics Cards

```
┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  ┌──────────────┐
│  Total Today    │  │     Waiting     │  │ In Progress  │  │  Completed   │
│       5         │  │       2         │  │      1       │  │      2       │
└─────────────────┘  └─────────────────┘  └──────────────┘  └──────────────┘

(Updates in real-time as items are added/processed)
```

---

## 4. Real-Time Update Sequence

### Step 1: Receptionist Approves Appointment

```
Appointment Management Tab:
┌─────────────────────────────────────┐
│ Patient: John Doe                   │
│ Doctor: Dr. Sarah Smith             │
│ Status: 🔄 Pending Approval         │
│                                     │
│              [APPROVE] [REJECT]     │
└─────────────────────────────────────┘
                  │
                  │ Click [APPROVE]
                  ▼
         HTTP POST to Backend
```

### Step 2: Backend Processes

```
Backend Processing:
✓ Update appointment status to "Confirmed"
✓ Add to queue_management table
✓ Generate token number (TKN-001)
✓ Fetch complete queue item
✓ Emit WebSocket event:
  {
    "appointment_approved": {
      "queue_item": {
        "id": 123,
        "token_number": "TKN-001",
        "patient_name": "John Doe",
        "doctor_name": "Dr. Sarah Smith",
        "department_name": "Cardiology",
        "status": "Waiting",
        "patient_id": "PAT-1234"
      },
      "timestamp": "2025-02-10T10:30:45"
    }
  }
```

### Step 3: All Connected Clients Receive Event

```
Queue Management Tab 1:
┌─────────────────────────────────────┐
│ 🟢 NEW ITEM ADDED!                  │
│ ┌─────────────────────────────────┐ │
│ │ ✨ PULSE ANIMATION              │ │
│ │ Token: 001                      │ │
│ │ John Doe                        │ │
│ │ Dr. Sarah Smith • Cardiology    │ │
│ │ [NEW] 🟢 Waiting Status         │ │
│ │ [No Show]  [Visited]            │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ✓ John Doe added to queue           │ (Toast)
│   (Token: TKN-001)                  │
└─────────────────────────────────────┘

Queue Management Tab 2 (Different User):
┌─────────────────────────────────────┐
│ 🟢 NEW ITEM ADDED!                  │
│ ┌─────────────────────────────────┐ │
│ │ ✨ PULSE ANIMATION              │ │
│ │ Token: 001                      │ │
│ │ John Doe                        │ │
│ │ Dr. Sarah Smith • Cardiology    │ │
│ │ [NEW] 🟢 Waiting Status         │ │
│ │ [No Show]  [Visited]            │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ✓ John Doe added to queue           │ (Toast)
│   (Token: TKN-001)                  │
└─────────────────────────────────────┘
```

### Step 4: Automatic Highlight Removal

```
After 5 seconds:
┌─────────────────────────────────────┐
│ 🔄 Animation removed                │
│ ┌─────────────────────────────────┐ │
│ │ (Green ring gone)               │ │
│ │ Token: 001                      │ │
│ │ John Doe                        │ │
│ │ Dr. Sarah Smith • Cardiology    │ │
│ │ 🔄 Waiting Status (normal now)  │ │
│ │ [No Show]  [Visited]            │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

Toast notification also disappears
```

---

## 5. Connection Status Indicator

### Connected State:
```
┌──────────────────────────┐
│ 🟢 Live Updates          │  (Green indicator)
└──────────────────────────┘
```

### Connecting State:
```
┌──────────────────────────┐
│ 🟡 Connecting...         │  (Yellow indicator)
└──────────────────────────┘
```

### Disconnected State:
```
┌──────────────────────────┐
│ 🔴 Offline (Polling)     │  (Red indicator)
└──────────────────────────┘
(Falls back to polling mode)
```

---

## 6. Queue Item Status Changes in Real-Time

### Scenario: Mark Patient as Visited

**Queue Item Before:**
```
┌─────────────────────────────────────┐
│ Token: 001                          │
│ John Doe    [PAT-1234]  🟨 Waiting  │
│ Dr. Sarah Smith • Cardiology        │
│ ⏰ Arrival: 10:30 AM                │
│                                     │
│              [No Show]  [Visited]   │
└─────────────────────────────────────┘
```

**Click [Visited]**
↓

**Instant Update (Real-Time):**
```
┌─────────────────────────────────────┐
│ Token: 001                          │
│ John Doe    [PAT-1234]  🟦 Visited  │ (Changed to teal)
│ Dr. Sarah Smith • Cardiology        │
│ ⏰ Arrival: 10:30 AM                │
│                                     │
│          ✓ Patient Arrived          │ (Button replaced)
└─────────────────────────────────────┘
```

---

## 7. Comparison: Before vs After

### BEFORE (Polling Only)

```
Timeline:
User approves appointment
         │
         │ (No instant feedback)
         │
         ▼
User manually refreshes page
         │
         ▼
New patient appears in queue

Latency: Up to 5 seconds (polling interval) + manual refresh time
```

### AFTER (WebSocket + Polling)

```
Timeline:
User approves appointment
         │ (HTTP POST)
         ▼
         │ (< 50ms)
         │
Backend emits WebSocket event
         │ (< 10ms)
         ▼
         │
Client receives event
         │ (< 50ms)
         ▼
         │
UI updates with animation
✓ Toast notification appears
✓ "New" badge shows
✓ Green ring pulses
✓ Patient in queue immediately

Latency: < 150ms typically
```

---

## 8. Network Condition Handling

### Scenario: WiFi Disconnects

```
Timeline:
1. User viewing Queue Management
   [🟢 Live Updates] ← Connected

2. WiFi drops
   [🟡 Connecting...] ← Attempting reconnect

3. After 1 second delay
   Attempts reconnection... (exponential backoff)

4. WebSocket reconnects
   [🟢 Live Updates] ← Connected again

5. Meanwhile, appointments were approved:
   ✓ Polling every 5 seconds caught the updates
   ✓ No data lost
   ✓ Queue automatically syncs

Result: User sees all pending updates once connected
```

---

## 9. Example Data Structures

### WebSocket Event Payload

```json
{
  "appointment_approved": {
    "queue_item": {
      "id": 123,
      "appointment_id": "APT-2025-001",
      "token_number": "TKN-001",
      "patient_id": "PAT-1234",
      "patient_name": "John Doe",
      "patient_dob": "1990-05-15",
      "patient_gender": "M",
      "doctor_id": "STF-456",
      "doctor_name": "Dr. Sarah Smith",
      "department_name": "Cardiology",
      "appointment_type": "First_Consultation",
      "reason_for_visit": "Chest pain",
      "appointment_time": "10:00 AM",
      "appointment_date": "2025-02-10",
      "queue_date": "2025-02-10",
      "status": "Waiting",
      "arrival_time": "2025-02-10T10:30:45",
      "called_in_time": null,
      "consultation_start_time": null,
      "consultation_end_time": null
    },
    "timestamp": "2025-02-10T10:30:45.123456"
  }
}
```

### React State Update

```typescript
// Recently added set
recentlyAdded = {
  "APT-2025-001"  // Will auto-remove after 5 seconds
}

// Queue items
queue = [
  {
    id: 123,
    token_number: "TKN-001",
    patient_name: "John Doe",
    doctor_name: "Dr. Sarah Smith",
    department_name: "Cardiology",
    status: "Waiting",
    // ... other fields
  },
  // ... other queue items
]
```

---

## 10. Multi-Tab Scenario

### Scenario: Approval in Tab 1, Viewing in Tab 2

```
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│ Tab 1: Appointment Mgmt         │  │ Tab 2: Queue Management         │
├─────────────────────────────────┤  ├─────────────────────────────────┤
│                                 │  │ Current Queue:                  │
│ Pending Approval:               │  │ □ Patient A - TKN-001           │
│ □ John Doe - [APPROVE] [REJECT] │  │ □ Patient B - TKN-002           │
│ □ Jane Smith                    │  │ □ Patient C - TKN-003           │
│ □ Bob Johnson                   │  │                                 │
│                                 │  │ Statistics:                     │
│                                 │  │ Total: 3, Waiting: 3            │
└─────────────────────────────────┘  └─────────────────────────────────┘
            │                                      ▲
            │ Click [APPROVE]                    │
            │                                    │
            └────────────────────────────────────┘
                        WebSocket
                        
Result in Tab 2:
┌─────────────────────────────────┐
│ Current Queue:                  │
│ □ Patient A - TKN-001           │
│ □ Patient B - TKN-002           │
│ □ Patient C - TKN-003           │
│ ✨ John Doe - TKN-004 [NEW] 🟢  │  ← Instant!
│                                 │
│ Statistics:                     │
│ Total: 4, Waiting: 4            │  ← Updated!
│                                 │
│ ✓ John Doe added to queue       │  ← Toast
│   (Token: TKN-004)              │
└─────────────────────────────────┘
```

---

## 11. Mobile/Responsive View

### Small Screen (Mobile):

```
┌─────────────────────────────────┐
│ Queue Management                │
│ [🔌 Live] [Refresh]             │
├─────────────────────────────────┤
│ Total: 3  Waiting: 2  In: 1     │
├─────────────────────────────────┤
│ 🟢 NEW                          │
│ Token 001                       │
│ John Doe                        │
│ Dr. Smith                       │
│ Cardiology                      │
│                                 │
│ [No Show]  [Visited]            │
├─────────────────────────────────┤
│ Token 002                       │
│ Jane Smith                      │
│ ... (scrollable)                │
└─────────────────────────────────┘
```

---

## 12. Error States

### WebSocket Connection Error:

```
┌──────────────────────────────────┐
│ ⚠️  Connection Lost              │
│                                  │
│ Falling back to polling...       │
│                                  │
│ Queue will update every 5 sec    │
│ [🔴 Offline (Polling)]           │
└──────────────────────────────────┘
```

### After Reconnection:

```
┌──────────────────────────────────┐
│ ✓ Connection Restored            │
│                                  │
│ Updates are now instant again    │
│ [🟢 Live Updates]                │
└──────────────────────────────────┘
```

---

## 13. Performance Visualization

### Event Latency Chart

```
Timeline (milliseconds):
0ms  ├─ Approval button clicked
10ms │
20ms ├─ HTTP POST sent to backend
30ms │
40ms ├─ Backend updates database
50ms │
60ms ├─ WebSocket event emitted
70ms │
80ms ├─ Client receives event
90ms │
100ms├─ UI re-renders
110ms├─ Animation starts
120ms│
     └─ User sees the update! ✨

Total: ~100-120ms
```

---

## 14. Notification Examples

### Toast Notifications:

```
Position: Top Right

✓ John Doe added to queue (Token: TKN-001)
[Auto-dismiss after 4 seconds]

✓ Status updated to Visited
[Auto-dismiss after 3 seconds]

⚠️  Failed to update status
[Auto-dismiss after 5 seconds]

✓ Appointment approved and added to queue!
[Auto-dismiss after 3 seconds]
```

---

## Summary

The real-time queue management system provides:
- ✓ Instant visual updates
- ✓ Clear notification feedback
- ✓ Connection status indication
- ✓ Smooth animations
- ✓ Mobile responsive
- ✓ Error handling
- ✓ Fallback mechanisms
- ✓ Multi-tab synchronization

All with a clean, professional user interface!
