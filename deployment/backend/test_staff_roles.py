"""
Test Staff Login with Different Roles
"""

import requests
import json

API_URL = "http://localhost:5000/api/auth/staff/login"

def test_staff_login(staff_id, password, expected_role):
    """Test staff login and verify role"""
    print(f"\n🔐 Testing {staff_id} (Expected: {expected_role})")
    
    try:
        response = requests.post(API_URL, json={
            "staff_id": staff_id,
            "password": password
        })
        
        if response.status_code == 200:
            data = response.json()
            staff_data = data.get('staff', {})
            actual_role = staff_data.get('role')
            name = f"{staff_data.get('first_name', '')} {staff_data.get('last_name', '')}".strip()
            
            print(f"  ✅ Login successful")
            print(f"  👤 Name: {name}")
            print(f"  🎭 Role: {actual_role}")
            print(f"  📧 Email: {staff_data.get('email')}")
            print(f"  🏥 Department: {staff_data.get('dept_name')}")
            
            if actual_role == expected_role:
                print(f"  ✅ Role matches expected: {expected_role}")
            else:
                print(f"  ❌ Role mismatch! Expected: {expected_role}, Got: {actual_role}")
            
            return True
        else:
            print(f"  ❌ Login failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    """Test all staff roles"""
    print("🚀 Testing Staff Login with Different Roles")
    print("=" * 60)
    
    # Test cases
    test_cases = [
        ("DOC001", "password123", "Doctor"),
        ("REC001", "password123", "Receptionist"),
        ("BIL001", "password123", "Billing"),
        ("BIL002", "password123", "Billing"),
        ("PHR001", "password123", "Pharmacist"),
        ("ADM001", "password123", "Admin"),
    ]
    
    results = []
    for staff_id, password, expected_role in test_cases:
        success = test_staff_login(staff_id, password, expected_role)
        results.append((staff_id, success))
    
    print("\n" + "=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)
    
    successful = sum(1 for _, success in results if success)
    total = len(results)
    
    print(f"Total tests: {total}")
    print(f"Successful: {successful}")
    print(f"Failed: {total - successful}")
    
    if successful == total:
        print("🎉 All staff login tests passed!")
    else:
        print("❌ Some tests failed. Check the details above.")
    
    print("\n🔑 Working Credentials:")
    print("All staff use password: password123")
    for staff_id, success in results:
        status = "✅" if success else "❌"
        print(f"  {status} {staff_id}")

if __name__ == "__main__":
    main()
