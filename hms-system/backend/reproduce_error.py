import requests
import json
import random

url = 'http://localhost:5000/api/auth/patient/register'
headers = {'Content-Type': 'application/json'}
data = {
    "firstName": "Test",
    "lastName": "Patient",
    "dateOfBirth": "1990-01-01",
    "gender": "Male",
    "mobileNumber": str(random.randint(1000000000, 9999999999)),
    "password": "Password123"
}

try:
    response = requests.post(url, headers=headers, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
