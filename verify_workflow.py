import requests
import json
import time
from datetime import datetime
import random
import string

BASE_URL = 'http://localhost:5000/api'

def register_patient():
    print("Registering new patient...")
    # Generate random unique data
    rnd = ''.join(random.choices(string.digits, k=6))
    mobile = f"9999{rnd}"
    data = {
        "first_name": f"Test{rnd}",
        "last_name": "User",
        "date_of_birth": "1990-01-01",
        "gender": "Male",
        "mobile_number": mobile,
        "password": "Password123"
    }
    
    # New backend registration route is under /auth/patient/register
    response = requests.post(f"{BASE_URL}/auth/patient/register", json=data)
    if response.status_code == 201:
        res_json = response.json()
        print(f"Patient registered: {res_json['patient_id']}")
        return res_json['patient_id'], "Password123"
    else:
        print(f"Registration failed: {response.text}")
        return None, None

def login_patient(patient_id, password):
    print(f"Logging in patient {patient_id}...")
    response = requests.post(f"{BASE_URL}/auth/patient/login", json={
        "patientId": patient_id,
        "password": password
    })
    if response.status_code == 200:
        print("Patient login successful.")
        return response.json()['access_token']
    else:
        print(f"Patient login failed: {response.text}")
        return None

def login_staff(staff_id, password):
    print(f"Logging in staff {staff_id}...")
    response = requests.post(f"{BASE_URL}/auth/staff/login", json={
        "staff_id": staff_id,
        "password": password
    })
    if response.status_code == 200:
        print("Staff login successful.")
        return response.json()['access_token']
    else:
        print(f"Staff login failed: {response.text}")
        return None

def book_appointment(token, doctor_id, date, time, reason):
    print(f"Booking appointment for doctor {doctor_id} on {date} at {time}...")
    headers = {'Authorization': f'Bearer {token}'}
    data = {
        "doctor_id": doctor_id,
        "appointment_date": date,
        "appointment_time": time,
        "reason_for_visit": reason,
        "department": "Cardiology",
        "consultant_name": "Dr. Sarah Wilson",
        "consultation_mode": "In-person",
        "appointment_type": "First_Consultation"
    }
    response = requests.post(f"{BASE_URL}/appointments", json=data, headers=headers)
    if response.status_code == 201:
        print("Appointment booked successfully.")
        return response.json()
    else:
        print(f"Booking failed: {response.text}")
        return None

def get_pending_appointments(token):
    print("Fetching pending appointments...")
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(f"{BASE_URL}/appointments?status=Pending_Approval", headers=headers)
    if response.status_code == 200:
        data = response.json()
        # Handle if wrapped in {appointments: [...]}
        if isinstance(data, dict) and 'appointments' in data:
            data = data['appointments']
        print(f"Found {len(data)} pending appointments.")
        return data
    else:
        print(f"Failed to fetch pending appointments: {response.text}")
        return []

def approve_appointment(token, appointment_id):
    print(f"Approving appointment {appointment_id}...")
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.post(f"{BASE_URL}/appointments/{appointment_id}/approve", headers=headers, json={})
    if response.status_code == 200:
        print("Appointment approved successfully.")
        return True
    else:
        print(f"Approval failed: {response.text}")
        return False

def get_queue(token):
    print("Fetching today's queue...")
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(f"{BASE_URL}/queue/today", headers=headers)
    if response.status_code == 200:
        data = response.json()
        if isinstance(data, dict) and 'queue' in data:
             data = data['queue']
        print(f"Found {len(data)} items in queue.")
        return data
    else:
        print(f"Failed to fetch queue: {response.text}")
        return []

def update_queue_status(token, queue_id, status):
    print(f"Updating queue {queue_id} status to {status}...")
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.post(f"{BASE_URL}/queue/{queue_id}/update-status", json={"status": status}, headers=headers)
    if response.status_code == 200:
        print("Queue status updated successfully.")
        return True
    else:
        print(f"Update failed: {response.text}")
        return False

def check_patient_appointments(token):
    # print("Checking patient appointments...")
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(f"{BASE_URL}/appointments", headers=headers)
    if response.status_code == 200:
        data = response.json()
        return data.get('appointments', []) if isinstance(data, dict) else data
    else:
        print(f"Failed to fetch patient appointments: {response.text}")
        return []

def main():
    # 0. Register Patient
    patient_id, password = register_patient()
    if not patient_id: return

    # 1. Login Patient
    patient_token = login_patient(patient_id, password)
    if not patient_token: return

    # 2. Book Appointment
    tmr = datetime.now().strftime("%Y-%m-%d")
    # Use a mock time "10:00"
    appt_data = book_appointment(patient_token, "DOC001", tmr, "10:00", "Chest Pain Checkup")
    
    new_appt_id = None
    if appt_data and 'appointment_id' in appt_data:
        new_appt_id = appt_data['appointment_id']
    
    if not new_appt_id:
        # Fallback confirm via list
        print("Checking list for new appointment...")
        appts = check_patient_appointments(patient_token)
        pending = [a for a in appts if a['status'] == 'Pending_Approval']
        if pending:
             new_appt_id = pending[-1]['appointment_id'] 
             print(f"Found appointment ID: {new_appt_id}")
        else:
             print("New appointment not found in list.")
             return

    # 3. Login Receptionist
    # Try staff123 for REC001
    staff_token = login_staff("REC001", "staff123")
    if not staff_token:
        print("Trying fallback password...")
        staff_token = login_staff("REC001", "password123")
    
    if not staff_token: 
        print("Could not login as staff. Verification aborted.")
        return

    # 4. Verify Pending Appointment exists in Staff View
    pending_appts = get_pending_appointments(staff_token)
    found = False
    for appt in pending_appts:
        if str(appt['appointment_id']) == str(new_appt_id):
            found = True
            break
    
    if not found:
        print(f"Appointment {new_appt_id} not found in pending list!")
        return

    print("Success: Appointment found in pending list.")

    # 5. Approve Appointment
    if not approve_appointment(staff_token, new_appt_id): return
    
    # 6. Verify Queue
    time.sleep(2) # wait for DB update
    queue = get_queue(staff_token)
    queue_item = None
    for item in queue:
        # queue item usually has patient_id or appointment_id or token_number
        # checking fields
        if str(item.get('appointment_id')) == str(new_appt_id) or str(item.get('patient_id')) == str(patient_id):
            queue_item = item
            break
    
    if not queue_item:
        print(f"Appointment {new_appt_id} not found in Queue!")
        print("Queue dump:", queue)
    else:
        print(f"Appointment found in queue with Token: {queue_item.get('token_number')}")
        queue_id = queue_item.get('queue_id') or queue_item.get('id')
        print(f"Queue ID: {queue_id}")

        # 7. Update to In_Progress (Call In)
        update_queue_status(staff_token, queue_id, "In_Progress")
        time.sleep(1)

        # 8. Check Patient View
        appts = check_patient_appointments(patient_token)
        my_appt = next((a for a in appts if str(a['appointment_id']) == str(new_appt_id)), None)
        if my_appt and my_appt['status'] == 'In_Progress':
            print("Success: Patient view updated to In_Progress.")
        else:
            print(f"Failure: Patient view status is {my_appt['status'] if my_appt else 'None'}")

        # 9. Update to Completed
        update_queue_status(staff_token, queue_id, "Completed")
        time.sleep(1)
        
        # 10. Check Patient View again
        appts = check_patient_appointments(patient_token)
        my_appt = next((a for a in appts if str(a['appointment_id']) == str(new_appt_id)), None)
        if my_appt and my_appt['status'] == 'Completed':
            print("Success: Patient view updated to Completed.")
        else:
             print(f"Failure: Patient view status is {my_appt['status'] if my_appt else 'None'}")

    print("Verification Script Finished.")

if __name__ == "__main__":
    main()
