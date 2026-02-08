import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY") 
# Try find any key
if not api_key:
    for k, v in os.environ.items():
        if k.startswith("gemini") and v:
            api_key = v
            break

print(f"Using key: {api_key[:10]}...")
genai.configure(api_key=api_key)

try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
except Exception as e:
    print(e)
