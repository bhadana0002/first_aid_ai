#!/bin/bash
# Script to run the app in production mode (similar to Render)
echo "Starting First Aid Guardian (Production Mode)..."

# Activate Venv
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "Virtual environment not found. Please run ./start_server.sh first to set it up."
    exit 1
fi

# Run Gunicorn
# Users should ensure GEMINI_API_KEY is set in .env or environment
exec gunicorn server:app --bind 0.0.0.0:5000 --workers 2 --timeout 120
