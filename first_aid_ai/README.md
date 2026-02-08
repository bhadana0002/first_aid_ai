# First Aid Guardian AI

India's first dedicated First Aid AI for schools, based on the ICELS syllabus.

## Setup Instructions

### 1. Install Dependencies
Open your terminal in this folder and run:
```bash
pip install -r requirements.txt
```

### 2. Get your Gemini API Key
You need a key from [Google AI Studio](https://aistudio.google.com/app/apikey).
You can copy it and paste it into the app sidebar when running.

### 3. Run the Web Server (Any Device Access)

**Option A: Linux/Mac**
```bash
./start_web_server.sh
```
*   This will show you an IP address (e.g., `http://192.168.1.5:8501`).
*   Type that address into the browser on your **Android, iPhone, or Laptop** connected to the same Wi-Fi.

**Option B: Windows**
Double-click `start_web_windows.bat` or run:
```cmd
start_web_windows.bat
```

**Option C: Manual**
```bash
source venv/bin/activate
streamlit run app.py --server.address=0.0.0.0
```

## Features
- **📸 Visual Recognition**: Upload a photo or use your webcam. The AI detects the injury pattern (e.g., "burn", "cut") and finds the right protocol.
- **Smart Retrieval**: Searches `knowledge_base.json` for the right protocol based on text OR image analysis.
- **Safety First**: Prioritizes emergency calls (112) for critical issues.
- **Edit Data**: You can modify `knowledge_base.json` to add new school protocols.
