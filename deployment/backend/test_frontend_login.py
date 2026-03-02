"""
Test Frontend Login Simulation
"""

import requests
import json

API_URL = "http://localhost:5000/api/auth/staff/login"

def simulate_frontend_login(staff_id, password):
    """Simulate frontend login behavior"""
    print(f"\n🌐 Simulating Frontend Login for {staff_id}")
    
    try:
        # Step 1: Login to get token and user data
        response = requests.post(API_URL, json={
            "staff_id": staff_id,
            "password": password
        })
        
        if response.status_code != 200:
            print(f"  ❌ Login failed: {response.text}")
            return False
        
        data = response.json()
        access_token = data.get('access_token')
        staff_data = data.get('staff', {})
        
        # Step 2: Simulate frontend user data extraction (like AuthContext does)
        user_data = {
            'staff_id': staff_data.get('staff_id'),
            'name': f"{staff_data.get('first_name', '')} {staff_data.get('last_name', '')}".strip(),
            'role': staff_data.get('role'),
            'department': staff_data.get('dept_name'),
            'email': staff_data.get('email'),
        }
        
        print(f"  ✅ Frontend user data extracted:")
        print(f"    staff_id: {user_data['staff_id']}")
        print(f"    name: {user_data['name']}")
        print(f"    role: {user_data['role']}")
        print(f"    department: {user_data['department']}")
        
        # Step 3: Simulate frontend routing logic
        redirect_map = {
            'Doctor': '/doctor',
            'Receptionist': '/receptionist',
            'Pharmacist': '/pharmacist',
            'Lab_Technician': '/lab',
            'Admission': '/admission',
            'Nurse': '/nurse',
            'Admin': '/admin',
            'Billing': '/billing',
        }
        
        user_role = user_data['role']
        redirect_path = redirect_map.get(user_role, '/admin')
        
        print(f"  🧭 Frontend would redirect to: {redirect_path}")
        
        # Step 4: Test if the dashboard route exists (simple check)
        dashboard_url = f"http://localhost:5173{redirect_path}"
        try:
            dashboard_response = requests.get(dashboard_url, timeout=5)
            if dashboard_response.status_code == 200:
                print(f"  ✅ Dashboard route exists: {redirect_path}")
            else:
                print(f"  ⚠️  Dashboard route returned: {dashboard_response.status_code}")
        except requests.exceptions.Timeout:
            print(f"  ⚠️  Dashboard route timeout (might be loading)")
        except requests.exceptions.ConnectionError:
            print(f"  ❌ Dashboard route not accessible")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    """Test frontend login simulation"""
    print("🚀 Testing Frontend Login Simulation")
    print("=" * 60)
    
    # Test different staff roles
    test_cases = [
        ("DOC001", "Doctor"),
        ("REC001", "Receptionist"),
        ("BIL001", "Billing"),
        ("PHR001", "Pharmacist"),
        ("ADM001", "Admin"),
    ]
    
    results = []
    for staff_id, expected_role in test_cases:
        success = simulate_frontend_login(staff_id, "password123")
        results.append((staff_id, expected_role, success))
    
    print("\n" + "=" * 60)
    print("📊 FRONTEND LOGIN SUMMARY")
    print("=" * 60)
    
    for staff_id, expected_role, success in results:
        status = "✅" if success else "❌"
        print(f"  {status} {staff_id} -> {expected_role}")
    
    print("\n🎯 Expected Routes:")
    print("  Doctor -> /doctor")
    print("  Receptionist -> /receptionist")
    print("  Billing -> /billing")
    print("  Pharmacist -> /pharmacist")
    print("  Admin -> /admin")

if __name__ == "__main__":
    main()
