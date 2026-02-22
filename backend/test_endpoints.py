import urllib.request
import json
import traceback

def test_endpoint(url):
    print(f"\nTesting {url}...")
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            print(f"Success! Response keys: {list(data.keys())[:5]}")
    except Exception as e:
        print(f"Error: {e}")
        try:
            print(f"Response body: {e.read().decode()}")
        except:
            pass

test_endpoint("http://localhost:8000/api/rates")
test_endpoint("http://localhost:8000/api/settings")
