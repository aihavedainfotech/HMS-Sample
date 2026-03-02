"""
Complete Test for All Staff Roles Including New Ones
"""

import requests
import json

API_URL = "http://localhost:5000/api/auth/staff/login"

def test_complete_staff_login(staff_id, password, expected_role):
    """Complete test of staff login and routing"""
    print(f"\n🔐 Testing {staff_id} (Expected: {expected_role})")
    
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
        
        # Step 2: Extract user data like frontend does
        user_data = {
            'staff_id': staff_data.get('staff_id'),
            'name': f"{staff_data.get('first_name', '')} {staff_data.get('last_name', '')}".strip(),
            'role': staff_data.get('role'),
            'department': staff_data.get('dept_name'),
            'email': staff_data.get('email'),
        }
        
        print(f"  ✅ Login successful")
        print(f"  👤 Name: {user_data['name']}")
        print(f"  🎭 Role: {user_data['role']}")
        print(f"  📧 Email: {user_data['email']}")
        print(f"  🏥 Department: {user_data['department']}")
        
        # Step 3: Test frontend routing logic
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
        
        print(f"  🧭 Frontend redirects to: {redirect_path}")
        
        # Step 4: Test dashboard accessibility
        dashboard_url = f"http://localhost:5173{redirect_path}"
        try:
            dashboard_response = requests.get(dashboard_url, timeout=5)
            if dashboard_response.status_code == 200:
                print(f"  ✅ Dashboard accessible: {redirect_path}")
            else:
                print(f"  ⚠️  Dashboard status: {dashboard_response.status_code}")
        except requests.exceptions.Timeout:
            print(f"  ⚠️  Dashboard timeout (loading)")
        except requests.exceptions.ConnectionError:
            print(f"  ❌ Dashboard not accessible")
        
        # Step 5: Verify role matches expected
        if user_role == expected_role:
            print(f"  ✅ Role verification passed")
            return True
        else:
            print(f"  ❌ Role mismatch! Expected: {expected_role}, Got: {user_role}")
            return False
            
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    """Test all staff roles comprehensively"""
    print("🚀 COMPLETE STAFF LOGIN TEST")
    print("=" * 80)
    
    # Test all staff roles including new ones
    test_cases = [
        ("ADM001", "Admin"),
        ("ADM002", "Admission"),
        ("BIL001", "Billing"),
        ("DOC001", "Doctor"),
        ("DOC002", "Doctor"),
        ("LAB001", "Lab_Technician"),
        ("NUR001", "Nurse"),
        ("PHR001", "Pharmacist"),
        ("REC001", "Receptionist"),
    ]
    
    results = []
    for staff_id, expected_role in test_cases:
        success = test_complete_staff_login(staff_id, "password123", expected_role)
        results.append((staff_id, expected_role, success))
    
    print("\n" + "=" * 80)
    print("📊 COMPLETE TEST SUMMARY")
    print("=" * 80)
    
    successful = sum(1 for _, _, success in results if success)
    total = len(results)
    
    print(f"Total tests: {total}")
    print(f"Successful: {successful}")
    print(f"Failed: {total - successful}")
    
    if successful == total:
        print("🎉 ALL STAFF LOGIN TESTS PASSED!")
    else:
        print("❌ Some tests failed. Check details above.")
    
    print("\n🔑 ALL WORKING CREDENTIALS:")
    print("Password: password123")
    print("\nStaff Accounts:")
    for staff_id, expected_role, success in results:
        status = "✅" if success else "❌"
        print(f"  {status} {staff_id} -> {expected_role}")
    
    print("\n🎯 ROLE-BASED ROUTING:")
    print("  Admin -> /admin")
    print("  Admission -> /admission")
    print("  Billing -> /billing")
    print("  Doctor -> /doctor")
    print("  Lab_Technician -> /lab")
    print("  Nurse -> /nurse")
    print("  Pharmacist -> /pharmacist")
    print("  Receptionist -> /receptionist")

if __name__ == "__main__":
    main()
