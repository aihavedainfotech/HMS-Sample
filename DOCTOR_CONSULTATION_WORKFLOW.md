# Doctor Consultation Workflow - Real-Time Implementation

## Overview

This document describes the complete real-time workflow for appointment management in the Hospital Management System. The workflow enables receptionists to manage patient queues, and doctors to handle patient consultations with real-time updates across all connected clients.

---

## Workflow Steps

### 1. **Receptionist: Approve Appointment** 
   - Location: `/receptionist/appointments`
   - Action: Click "Approve" on a pending appointment
   - Result: 
     - Appointment status changes to "Confirmed"
     - Patient added to queue_management table
     - Real-time event `appointment_approved` emitted to all clients
     - Appears instantly in Queue Management

### 2. **Receptionist: Mark Patient as Visited**
   - Location: `/receptionist/queue`
   - Action: Click "Visited" on waiting patient
   - Result:
     - Queue status updated to "Visited"
     - Appointment status changes to "Visited"
     - Real-time event `queue_status_updated` emitted
     - **Patient now appears in Doctor's Today's Appointments**

### 3. **Doctor: View Today's Queue**
   - Location: `/doctor/today-appointments`
   - Features:
     - Shows all waiting patients with token numbers
     - Real-time updates when receptionist marks "Visited"
     - Three action buttons per patient:
       - **Call Next**: Transition from Waiting → In_Progress
       - **Consult**: Open consultation window
       - **Complete**: Mark consultation as finished

### 4. **Doctor: Call Next Patient**
   - Action: Click "Call Next" button
   - Result:
     - Queue status changes to "In_Progress"
     - Patient called_in_time recorded
     - Consultation_start_time set on appointment
     - Real-time event `patient_called` emitted
     - Button changes to "Consult" and "Complete"

### 5. **Doctor: Start Consultation**
   - Action: Click "Consult" button
   - Navigation: Redirects to `/doctor/consultation?appointment_id=XXX&patient_id=YYY`
   - Features:
     - Patient details displayed
     - Active consultation mode with diagnosis form
     - Three tabs:
       - **Diagnosis**: Write clinical findings
       - **Clinical History**: View past records
       - **Lab Results**: View previous tests

### 6. **Doctor: Write Diagnosis**
   - Location: Consultation page, "Diagnosis" tab
   - Form fields:
     - Chief Complaint
     - Examination Findings
     - Vital Signs
     - Diagnosis (primary and differential)
   - Action: Click "Save Diagnosis"
   - Result:
     - Creates/updates prescription record
     - Real-time event `diagnosis_written` emitted

### 7. **Doctor: Write Prescription**
   - Action: Click "Write Prescription" button
   - Opens modal to add medicines with:
     - Medicine name, strength, dosage
     - Frequency and duration
     - Special instructions
   - Result: Prescription medicines added to database

### 8. **Doctor: Order Lab Tests**
   - Action: Click "Order Lab Test" button
   - Opens modal to select:
     - Test category and name
     - Priority level
     - Clinical notes
   - Result: Lab order created, appears in Lab Orders

### 9. **Doctor: Complete Consultation**
   - Action: Click "Complete" button
   - Result:
     - Queue status changes to "Completed"
     - Consultation_end_time recorded
     - Appointment status changes to "Completed"
     - Real-time event `consultation_completed` emitted
     - Patient removed from active queue
     - Appears in "Completed" tab

---

## Real-Time Events

### Socket Events (Namespace: `/appointments`)

#### `appointment_approved`
Emitted when: Receptionist approves appointment
Data includes:
- `queue_item`: Complete patient and appointment details
- `timestamp`: When event occurred

#### `queue_status_updated`
Emitted when: Queue status changes (Waiting → Visited → In_Progress → Completed)
Data includes:
- `queue_id`: Queue item ID
- `appointment_id`: Appointment ID
- `doctor_id`: Assigned doctor
- `patient_id`: Patient ID
- `new_status`: New status value
- `queue_item`: Full queue item details
- `timestamp`: When event occurred

#### `patient_called`
Emitted when: Doctor clicks "Call Next"
Data includes:
- `queue_id`: Queue item ID
- `appointment_id`: Appointment ID
- `doctor_id`: Doctor who called
- `status`: "In_Progress"

#### `consultation_completed`
Emitted when: Doctor marks consultation complete
Data includes:
- `queue_id`: Queue item ID
- `appointment_id`: Appointment ID
- `doctor_id`: Attending doctor
- `status`: "Completed"
- `diagnosis`: Clinical diagnosis if provided

#### `diagnosis_written`
Emitted when: Doctor saves diagnosis
Data includes:
- `appointment_id`: Appointment ID
- `prescription_id`: Generated prescription ID
- `timestamp`: When saved

---

## Backend Endpoints

### Queue Management

```
GET /api/doctor/queue/today?doctor_id=<DOCTOR_ID>
  - Get today's queue for a specific doctor
  - Returns: Array of queue items with patient/appointment details

POST /api/doctor/next-patient
  - Call next patient from queue
  - Body: { queue_id, doctor_id }
  - Result: Transitions to In_Progress

POST /api/doctor/complete-consultation
  - Mark consultation as complete
  - Body: { queue_id, appointment_id, doctor_id, diagnosis? }
  - Result: Transitions to Completed
```

### Consultation Details

```
GET /api/doctor/consultation/<APPOINTMENT_ID>
  - Get full patient and appointment details for active consultation
  - Returns: Appointment, patient, previous prescriptions, lab orders

POST /api/doctor/write-diagnosis
  - Save diagnosis/clinical findings for appointment
  - Body: { 
      appointment_id,
      diagnosis,
      chief_complaint,
      examination_findings,
      vital_signs
    }
  - Result: Creates/updates prescription with clinical data
```

### Queue Status Updates

```
POST /api/queue/<QUEUE_ID>/update-status
  - Update queue item status
  - Body: { status: "Waiting|Visited|In_Progress|Completed|No_Show" }
  - Supports any role: Receptionist, Doctor, Nurse
  - Emits: queue_status_updated event
```

---

## Frontend Components

### DoctorTodayAppointments Component
**File**: `hms-system/staff-portal/src/pages/dashboard/DoctorTodayAppointments.tsx`

Features:
- Fetches doctor's queue for today
- Displays appointments with status filtering
- Action buttons for Call Next, Consult, Complete
- Real-time socket listeners
- Auto-refresh every 5 seconds

States:
- `Waiting`: Awaiting doctor to call
- `In_Progress`: Patient in consultation room
- `Completed`: Consultation finished

### Consultation Component
**File**: `hms-system/staff-portal/src/pages/dashboard/Consultation.tsx`

Modes:
- **Search Mode**: Find any patient by ID
- **Active Consultation Mode**: Triggered from Today's Appointments
  - Diagnosis tab with form
  - Clinical history/prescriptions
  - Lab orders

Features:
- Diagnosis form with clinical fields
- Write prescription modal
- Order lab tests modal
- Real-time form saving

---

## Database Updates

### appointments Table
- `status`: Now properly reflects workflow state
  - `Pending_Approval` → `Confirmed` → `Visited` → `In_Progress` → `Completed`
- `consultation_start_time`: Set when doctor calls patient
- `consultation_end_time`: Set when consultation completes

### queue_management Table
- `called_in_time`: When doctor called patient in
- `consultation_end_time`: When consultation ended
- `status`: Matches appointment workflow

### prescriptions Table
- Linked to appointment_id for active consultations
- Stores diagnosis and clinical findings
- Created when doctor writes diagnosis

---

## Setup & Usage

### 1. Backend Setup
```bash
cd hms-system/backend
pip3 install -r requirements.txt
python3 app.py
```

### 2. Staff Portal Setup
```bash
cd hms-system/staff-portal
npm install
npm run dev
```

### 3. Testing the Workflow
1. Open Staff Portal: `http://localhost:5173`
2. Login as Receptionist
3. Go to `/receptionist/appointments`
4. Approve a pending appointment (watch Queue Management update instantly)
5. Go to `/receptionist/queue` and mark patient as "Visited"
6. Open new browser tab, login as Doctor
7. Go to `/doctor/today-appointments` (patient appears instantly)
8. Click "Call Next" (transitions to In_Progress)
9. Click "Consult" (opens consultation page)
10. Write diagnosis and save
11. Click "Complete" (finishes consultation)

---

## Real-Time Communication

### WebSocket Configuration
- **URL**: `http://localhost:5000/appointments` (or configured API URL)
- **Namespace**: `/appointments`
- **Transports**: WebSocket (primary), HTTP Polling (fallback)
- **Auto-reconnect**: Yes, with exponential backoff
- **Reconnection attempts**: 5 max with 1-5 second delays

### Socket Listeners
Each component automatically:
1. Connects to socket on mount
2. Listens for relevant events
3. Auto-refreshes data on event
4. Shows toast notifications
5. Cleans up listeners on unmount

---

## Error Handling

### Backend
- Try-catch blocks on all socket emissions
- HTTP response still returned even if socket fails
- Graceful degradation if WebSocket unavailable

### Frontend
- Fallback to HTTP polling if socket unavailable
- Automatic reconnection on disconnect
- User-friendly error messages
- Toast notifications for actions

---

## Troubleshooting

### Queue not appearing for doctor
- Verify receptionist marked patient as "Visited"
- Check doctor_id matches in database
- Verify socket connection is active (check browser console)

### Real-time updates not working
- Check browser WebSocket support
- Verify CORS is enabled on backend
- Check network tab for socket.io connection
- Fallback to HTTP polling is automatic

### Diagnosis not saving
- Verify appointment_id is passed correctly
- Check patient is in active consultation mode
- Verify doctor token is valid

---

## Future Enhancements

1. Add video consultation support
2. Patient communication during wait
3. Analytics and reports
4. Prescription printing
5. Lab result integration
6. Appointment ratings/feedback
7. Doctor workload balancing

---

## Files Modified

### Backend
- `hms-system/backend/app.py`
  - Added `/api/doctor/queue/today` endpoint
  - Added `/api/doctor/next-patient` endpoint
  - Added `/api/doctor/complete-consultation` endpoint
  - Added `/api/doctor/consultation/<id>` endpoint
  - Added `/api/doctor/write-diagnosis` endpoint
  - Enhanced `/api/queue/<id>/update-status` with better socket events

### Frontend - Staff Portal
- `hms-system/staff-portal/src/pages/dashboard/DoctorTodayAppointments.tsx` (NEW)
- `hms-system/staff-portal/src/pages/dashboard/Consultation.tsx` (ENHANCED)
- `hms-system/staff-portal/src/layouts/DoctorDashboard.tsx` (UPDATED NAVIGATION)

### Configuration
- `hms-system/staff-portal/src/lib/socket.ts` (Already configured)

---

## Status: ✅ IMPLEMENTATION COMPLETE

All components implemented and ready for testing.
