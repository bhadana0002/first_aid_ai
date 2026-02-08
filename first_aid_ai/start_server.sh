#!/bin/bash
echo "Starting First Aid Guardian (Web Server)..."

# Free up Port 5000 if it's already in use
echo "Checking for existing processes on port 5000..."
PORT_PID=$(lsof -t -i:5000)
if [ ! -z "$PORT_PID" ]; then
    echo "Closing existing process (PID: $PORT_PID)..."
    kill -9 $PORT_PID
    sleep 1
fi

# Activate Virtual Environment
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
fi

# Install new requirements if needed
pip install flask python-dotenv

# Get Local IP (rough estimate for display)
IP_ADDR=$(hostname -I | awk '{print $1}')

echo "----------------------------------------------------------------"
echo "🚑  First Aid AI is running!"
echo "📱  To access on your PHONE/TABLET connected to the same WiFi:"
echo "    http://$IP_ADDR:5000"
echo "----------------------------------------------------------------"

# Run Flask in background to allow browser to open
python3 app.py &

# Wait 2 seconds for server to initialize
sleep 2

# Automatically open the browser
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:5000
elif command -v google-chrome > /dev/null; then
    google-chrome http://localhost:5000
elif command -v firefox > /dev/null; then
    firefox http://localhost:5000
fi

echo "----------------------------------------------------------------"
echo "Press Ctrl+C to stop the server"
echo "----------------------------------------------------------------"

# Keep script running so terminal stays open
wait
