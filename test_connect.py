
import requests
import os
import json

api_key = "AIzaSyA3QgHvUq5yJHWDo-2rUqJUa3LzsMhUjUE"
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"

print(f"Testing URL: {url.replace(api_key, 'API_KEY')}")

try:
    response = requests.get(url, timeout=10)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print("Success! Models found:")
        for m in data.get('models', [])[:5]:
            print(f"- {m['name']}")
    else:
        print("Error Response:")
        print(response.text)
except Exception as e:
    print(f"Exception: {e}")
