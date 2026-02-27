# Real-Time Queue Management Implementation

## Overview
This document outlines the implementation of real-time queue management functionality in the Hospital Management System. When a receptionist approves an appointment request, it now appears instantly in the Queue Management section with live updates.

## Architecture

### Real-Time Communication
The system uses **WebSocket** (Socket.IO) for real-time bidirectional communication between the backend and frontend.

- **Namespace**: `/appointments`
- **Protocol**: WebSocket with fallback to HTTP polling
- **Reconnection**: Automatic with exponential backoff (1s - 5s delays, max 5 attempts)

---

## Backend Implementation

### 1. WebSocket Handlers (Flask-SocketIO)
**File**: `/hms-system/backend/app.py`

#### Added Handlers:

```python
@socketio.on('connect', namespace='/appointments')
def handle_connect():
    """Handle client connection to appointments namespace"""
    print(f"Client connected to /appointments namespace")
    return True

@socketio.on('disconnect', namespace='/appointments')
def handle_disconnect():
    """Handle client disconnection from appointments namespace"""
    print(f"Client disconnected from /appointments namespace")

@socketio.on('request_queue_update', namespace='/appointments')
def handle_queue_update_request(data):
    """Handle request for current queue update"""
    # Fetches and emits current queue data
```

### 2. Enhanced Appointment Approval
**File**: `/hms-system/backend/app.py` - `approve_appointment()` endpoint

**Changes**:
- Fetches complete queue item details (patient name, doctor name, department, etc.)
- Emits `appointment_approved` event with full queue item data
- Includes timestamp in the emission

**Emission Format**:
```python
socketio.emit('appointment_approved', {
    'queue_item': {
        'id': queue_id,
        'token_number': 'TKN-001',
        'patient_name': 'John Doe',
        'doctor_name': 'Dr. Smith',
        'department_name': 'Cardiology',
        'appointment_date': '2025-02-10',
        'appointment_time': '10:00 AM',
        'status': 'Waiting',
        'patient_id': 'PAT-123',
        # ... other details
    },
    'timestamp': '2025-02-10T10:30:45.123456'
}, namespace='/appointments')
```

### 3. Queue Status Updates
Queue status changes also emit real-time events:
- `queue_status_updated` - Emitted when a queue item status changes (Waiting → In_Progress, etc.)

---

## Frontend Implementation

### 1. Socket Configuration
**Files**: 
- `/app/src/lib/socket.ts` (Patient Portal)
- `/hms-system/staff-portal/src/lib/socket.ts` (Staff Portal)

**Features**:
- Uses environment variable `VITE_API_URL` to determine backend URL
- Automatic reconnection with exponential backoff
- Fallback to HTTP polling if WebSocket unavailable
- Debug logging for connection state

**Configuration**:
```typescript
const socket = io(`${SOCKET_URL}/appointments`, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});
```

### 2. AppointmentManagement Component
**File**: `/hms-system/staff-portal/src/pages/dashboard/AppointmentManagement.tsx`

**Enhancements**:
- Listens to `appointment_approved` event from WebSocket
- Automatically refreshes appointment list when approval happens
- Shows toast notification when appointment is approved
- Maintains polling as fallback (8 second interval)

**Event Handler**:
```typescript
const handleApprovalEvent = (_data: any) => {
  // Refresh appointments when someone approves
  fetchAppointments();
  toast.success('Appointment approved and added to queue!', {
    position: 'top-right',
    duration: 3000
  });
};

socket.on('appointment_approved', handleApprovalEvent);
```

### 3. QueueManagement Component
**File**: `/hms-system/staff-portal/src/pages/dashboard/QueueManagement.tsx`

**Major Enhancements**:

#### A. Real-Time Event Listeners
- `appointment_approved` - Instantly adds new approved appointments to queue
- `queue_status_updated` - Reflects status changes immediately

#### B. Visual Feedback
- **"Live Updates" indicator** - Shows WebSocket connection status
- **Pulse animation** - New queue items are highlighted with a green ring and "New" badge
- **Auto-highlight timeout** - Highlight lasts 5 seconds before fading
- **Toast notifications** - Shows patient name and token number when added

#### C. Smart Refresh Logic
```typescript
const onApproved = (data: any) => {
  // Show notification
  toast.success(`✓ ${data.queue_item.patient_name} added to queue (Token: ${data.queue_item.token_number})`);
  
  // Highlight the new item
  setRecentlyAdded(prev => {
    const newSet = new Set(prev);
    newSet.add(data.queue_item.appointment_id);
    // Auto-remove highlight after 5 seconds
    setTimeout(() => { /* ... */ }, 5000);
    return newSet;
  });
  
  // Refresh queue immediately
  fetchQueue();
};
```

#### D. Fallback Polling
- Still polls every 5 seconds as a safety net
- Ensures consistency even if WebSocket is temporarily unavailable

---

## Features

### 1. **Instant Updates**
- Approved appointments appear in the queue within milliseconds
- No need to manually refresh

### 2. **User Feedback**
- Toast notifications for new approvals
- Visual highlighting of newly added items
- Connection status indicator

### 3. **Reliability**
- Automatic reconnection with exponential backoff
- Fallback to HTTP polling
- Graceful degradation if WebSocket unavailable

### 4. **Real-Time Status Tracking**
- Queue status changes (Waiting → Visited → Completed) update in real-time
- No-Show marking propagates instantly

### 5. **Multi-Client Support**
- All connected staff members see updates simultaneously
- Works across multiple tabs and browser windows

---

## Data Flow

```
User (Receptionist) approves appointment
        ↓
Backend: approve_appointment() endpoint
        ↓
- Update appointment status to 'Confirmed'
- Add to queue_management table
- Fetch complete queue item with joins
        ↓
WebSocket: socketio.emit('appointment_approved')
        ↓
All connected clients receive event
        ↓
AppointmentManagement: Refresh appointment list
QueueManagement: 
  - Add new item to queue
  - Show notification
  - Highlight item
  - Refresh queue data
        ↓
User sees new patient in queue instantly
```

---

## Testing

### Manual Testing Steps:

1. **Setup**:
   - Ensure backend is running: `python app.py`
   - Ensure frontend (staff portal) is running

2. **Test Real-Time Approval**:
   - Open Queue Management page
   - Open AppointmentManagement page in another window/tab
   - From AppointmentManagement, approve a pending appointment
   - Verify that the patient appears in Queue Management instantly
   - Verify the "New" badge and pulse animation appears

3. **Test Notifications**:
   - Approve an appointment
   - Check for toast notification with patient name and token
   - Verify notification disappears after 4 seconds

4. **Test Fallback**:
   - Open DevTools → Network → Disable WebSocket
   - Approve an appointment
   - Verify queue updates via polling (max 5 second delay)

5. **Test Status Updates**:
   - Mark a patient as "Visited"
   - Verify status change appears instantly in connected clients

---

## Environment Variables

Both frontend applications need the API URL configured:

```env
VITE_API_URL=http://localhost:5000
# or for production
VITE_API_URL=https://your-backend.com
```

---

## Performance Considerations

- **Polling Interval**: 5 seconds for QueueManagement, 8 seconds for AppointmentManagement
- **Event Throttling**: None currently (could be added if load is high)
- **Memory**: Recently added set clears items after 5 seconds
- **Network**: Uses WebSocket primarily, HTTP polling as fallback

---

## Future Enhancements

1. **Rooms/Channels**: Could implement Socket.IO rooms to filter updates by doctor/department
2. **Audit Logging**: Log all WebSocket events for compliance
3. **Notifications**: Send push notifications to phones when appointments are approved
4. **Offline Support**: Queue up actions when offline, sync when reconnected
5. **Event Throttling**: If many approvals happen rapidly, throttle UI updates

---

## Troubleshooting

### Queue not updating in real-time
1. Check backend is running on port 5000
2. Verify `VITE_API_URL` is set correctly
3. Check browser console for WebSocket errors
4. Ensure CORS is properly configured in Flask

### "Live Updates" indicator shows disconnected
1. Check backend connection: `python app.py`
2. Verify network connectivity
3. Check firewall/proxy settings blocking WebSocket
4. Look for errors in backend console

### Toast notifications not appearing
1. Verify socket event is being emitted (check backend logs)
2. Check socket listener is properly attached
3. Verify `sonner` toast package is installed

### Polling fallback not working
1. Check that HTTP polling is enabled in socket config
2. Verify `/api/queue/today` endpoint is accessible
3. Check authentication token in localStorage

---

## Files Modified

1. **Backend**:
   - `/hms-system/backend/app.py` - Added WebSocket handlers and enhanced approval logic

2. **Frontend - Staff Portal**:
   - `/hms-system/staff-portal/src/lib/socket.ts` - Improved configuration
   - `/hms-system/staff-portal/src/pages/dashboard/AppointmentManagement.tsx` - Added real-time listeners
   - `/hms-system/staff-portal/src/pages/dashboard/QueueManagement.tsx` - Enhanced with real-time updates

3. **Frontend - Patient Portal**:
   - `/app/src/lib/socket.ts` - Improved configuration

---

## Summary

The real-time queue management system is now fully operational. Receptionist approvals are instantly visible to all staff members viewing the Queue Management page, with visual feedback, toast notifications, and reliable WebSocket communication with HTTP polling fallback.
