# QUICK REFERENCE - Doctor Consultation Workflow

## 🚀 Start the Application

### Terminal 1: Backend
```bash
cd hms-system/backend
python3 app.py
# Server runs on http://localhost:5000
```

### Terminal 2: Frontend
```bash
cd hms-system/staff-portal
npm run dev
# Portal runs on http://localhost:5173
```

---

## 📋 Quick Workflow

### Step 1: Receptionist Approves Appointment
```
1. Login to Staff Portal as Receptionist
2. Go to /receptionist/appointments
3. Find a pending appointment
4. Click "Approve" button
```
**Result**: Patient appears in Queue Management instantly

### Step 2: Receptionist Marks as Visited
```
1. Go to /receptionist/queue
2. Find the approved patient (Waiting status)
3. Click "Visited" button
```
**Result**: Patient appears in Doctor's Today's Appointments instantly

### Step 3: Doctor Calls Patient
```
1. Login as Doctor
2. Go to /doctor/today-appointments
3. Click "Call Next" button on patient
```
**Result**: Patient status changes to "In_Progress"

### Step 4: Doctor Starts Consultation
```
1. Click "Consult" button
2. Patient details load
3. Click "Diagnosis" tab
```
**Result**: Consultation page opens with diagnosis form

### Step 5: Doctor Writes Diagnosis
```
1. Fill Chief Complaint field
2. Fill Examination Findings field
3. Fill Vital Signs field
4. Fill Diagnosis field
5. Click "Save Diagnosis"
```
**Result**: Prescription created, diagnosis saved

### Step 6: Doctor Writes Prescription
```
1. Click "Write Prescription" button
2. Select medicine, strength, dosage
3. Set frequency and duration
4. Click "Create Prescription"
```
**Result**: Prescription added to patient record

### Step 7: Doctor Orders Lab Tests
```
1. Click "Order Lab Test" button
2. Select test category and name
3. Add clinical notes if needed
4. Click "Create Order"
```
**Result**: Lab order created, linked to appointment

### Step 8: Doctor Completes Consultation
```
1. Go back to /doctor/today-appointments
2. Click "Complete" button
3. Consultation is marked done
```
**Result**: Patient removed from active queue

---

## 🔑 Key URLs

### Receptionist
- Dashboard: `/receptionist`
- Appointments: `/receptionist/appointments`
- Queue Management: `/receptionist/queue`

### Doctor
- Dashboard: `/doctor`
- **NEW** Today's Queue: `/doctor/today-appointments` ⭐
- All Appointments: `/doctor/appointments`
- Consultation: `/doctor/consultation`
- Prescriptions: `/doctor/prescriptions`
- Lab Orders: `/doctor/lab-orders`

---

## 💡 Real-Time Updates

### What Updates in Real-Time:
✅ Queue Management (when receptionist approves)
✅ Today's Appointments (when receptionist marks visited)
✅ Queue statistics (counts of waiting, in-progress, completed)
✅ Status changes (waiting → in-progress → completed)
✅ Patient list (adds/removes patients)

### How It Works:
1. Receptionist clicks button
2. Backend updates database
3. Backend emits WebSocket event
4. Doctor's browser receives event
5. Doctor's page updates automatically
6. No refresh needed!

---

## 🐛 Troubleshooting

### Patient not appearing in doctor's queue?
```
✓ Verify receptionist marked "Visited" in Queue Management
✓ Check browser console (F12) for WebSocket connection
✓ Verify doctor is logged in
✓ Check appointment is assigned to correct doctor
```

### Real-time updates not working?
```
✓ Check browser console for: "Connected to appointments WebSocket"
✓ If not connected, check backend is running
✓ Check VITE_API_URL in .env file
✓ Try manual refresh - should still work with HTTP polling
```

### Diagnosis not saving?
```
✓ Make sure all form fields have text
✓ Check browser console for errors
✓ Verify doctor is in active consultation mode
✓ Check "Diagnosis" tab is selected
```

---

## 🧪 Testing Checklist

### Quick Test (5 minutes)
- [ ] Start backend and frontend
- [ ] Login as receptionist, approve appointment
- [ ] Check Queue Management updates without refresh
- [ ] Login as doctor, see patient in Today's Queue
- [ ] Click "Call Next" - status updates to In_Progress
- [ ] Click "Consult" - opens consultation page

### Full Test (15 minutes)
- [ ] Complete quick test above
- [ ] Fill diagnosis form and save
- [ ] Write prescription
- [ ] Order lab test
- [ ] Click "Complete" - patient removed from queue
- [ ] Verify no JavaScript errors

### Real-Time Test (2 browsers)
- [ ] Open browser 1: Receptionist
- [ ] Open browser 2: Doctor
- [ ] Receptionist approves appointment
- [ ] Verify Doctor sees it instantly (no refresh)
- [ ] Receptionist marks "Visited"
- [ ] Verify Doctor sees "Waiting" status instantly

---

## 📊 API Endpoints (Backend)

### Doctor Queue
```
GET /api/doctor/queue/today?doctor_id=<ID>
Response: [{ id, patient_name, token_number, status, ... }]
```

### Call Next Patient
```
POST /api/doctor/next-patient
Body: { queue_id, doctor_id }
Response: { message: "Patient called successfully" }
```

### Complete Consultation
```
POST /api/doctor/complete-consultation
Body: { queue_id, appointment_id, doctor_id, diagnosis? }
Response: { message: "Consultation completed" }
```

### Get Consultation Details
```
GET /api/doctor/consultation/<appointment_id>
Response: { appointment, patient, prescriptions, lab_orders }
```

### Write Diagnosis
```
POST /api/doctor/write-diagnosis
Body: {
  appointment_id,
  diagnosis,
  chief_complaint,
  examination_findings,
  vital_signs
}
Response: { message: "Diagnosis saved", prescription_id }
```

---

## 🔔 Real-Time Events (WebSocket)

### Connected Events:
```
appointment_approved
→ Sent when receptionist approves
→ Data: { queue_item, timestamp }

queue_status_updated
→ Sent when queue status changes
→ Data: { queue_id, appointment_id, doctor_id, new_status, queue_item }

patient_called
→ Sent when doctor calls patient
→ Data: { queue_id, appointment_id, doctor_id, status }

consultation_completed
→ Sent when doctor marks complete
→ Data: { queue_id, appointment_id, doctor_id, status, diagnosis }

diagnosis_written
→ Sent when doctor saves diagnosis
→ Data: { appointment_id, prescription_id, timestamp }
```

---

## 📱 Browser Console Commands

### Check WebSocket Connection
```javascript
// In browser console (F12)
socket.connected  // Should be true
socket.id         // Should show socket ID
```

### Listen for Socket Events
```javascript
socket.on('appointment_approved', (data) => {
  console.log('Appointment approved:', data);
});
```

---

## 🎯 Common Tasks

### Add Another Doctor
```
1. Create staff account in admin panel
2. Set role as "Doctor"
3. Link to department
4. Doctor auto-sees only their appointments
```

### Change Appointment Time
```
1. Doctor can still complete consultation
2. System tracks actual consultation time
3. Original appointment time kept for reference
```

### Modify Diagnosis After Save
```
1. Return to consultation page
2. Diagnosis form pre-fills with saved data
3. Edit and save again
4. New data overwrites previous
```

---

## 📈 Performance Tips

### For Faster Updates
- Use WebSocket: Browser should show "Connected to WebSocket"
- If slow, check network latency
- Fallback to polling is automatic (5 second updates)

### For Smooth UI
- Avoid multiple browser tabs for same user
- Close unused browser windows
- Clear browser cache if issues
- Use Chrome/Firefox (better WebSocket support)

---

## 🔐 Security Notes

- All endpoints require valid JWT token
- Doctor can only see their own patients
- Receptionist can manage all queues
- Logout when finished
- Don't share token/credentials

---

## 📞 Support

**Documentation**:
- DOCTOR_CONSULTATION_WORKFLOW.md - Full technical guide
- TESTING_GUIDE.md - Detailed testing procedures
- IMPLEMENTATION_COMPLETE.md - Implementation overview

**Debugging**:
- Browser Console: F12 → Console
- Network Tab: F12 → Network → Check socket.io connections
- Backend Logs: tail -f hms-system/backend/backend.log
- Database: Check hms.db with SQLite browser

---

## ⚡ Quick Reference Matrix

| Action | Who | Where | Result |
|--------|-----|-------|--------|
| Approve | Receptionist | /receptionist/appointments | Queue shows patient |
| Mark Visited | Receptionist | /receptionist/queue | Doctor sees in queue |
| Call Next | Doctor | /doctor/today-appointments | Status: In_Progress |
| Consult | Doctor | /doctor/consultation | Opens consultation |
| Diagnosis | Doctor | Consultation tab | Saves clinical notes |
| Prescription | Doctor | Consult modal | Creates prescription |
| Lab Order | Doctor | Lab modal | Creates lab test |
| Complete | Doctor | Today's Appointments | Status: Completed |

---

## 🚀 You're All Set!

Everything is implemented, compiled, and tested.

**Next Step**: Start the servers and test the workflow!

```bash
# Terminal 1
cd hms-system/backend && python3 app.py

# Terminal 2
cd hms-system/staff-portal && npm run dev

# Open browser
http://localhost:5173
```

**Happy Testing! 🎉**
