@echo off
echo Starting First Aid Guardian (Web Server)...

IF EXIST "venv" (
    call venv\Scripts\activate.bat
) ELSE (
    echo Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
)

echo ----------------------------------------------------------------
echo 🚑  First Aid AI is running!
echo 📱  To access on your PHONE/TABLET:
echo     1. Find your PC's IP address (run 'ipconfig')
echo     2. Open http://YOUR_IP_ADDRESS:8501
echo ----------------------------------------------------------------

streamlit run app.py --server.address=0.0.0.0
