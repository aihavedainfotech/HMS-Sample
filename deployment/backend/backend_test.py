import requests

try:
    response = requests.get('http://localhost:5000/api/health', timeout=5)
    print("Backend accessible directly")
except Exception as e:
    print(f"Backend direct access failed: {e}")

try:
    response = requests.get('http://localhost:5173/api/health', timeout=5)
    print("Backend accessible via proxy")
except Exception as e:
    print(f"Backend proxy access failed: {e}")
