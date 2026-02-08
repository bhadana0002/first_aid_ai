from flask import Flask, request, jsonify, send_from_directory
from PIL import Image
import io
import sys
import os

# Ensure the app can find modules in the current and subdirectories
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'first_aid_ai'))

import core

app = Flask(__name__, static_folder='first_aid_ai/static', static_url_path='')

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        user_message = request.form.get('message', '')
        language = request.form.get('language', 'English')
        manual_api_key = request.form.get('api_key', '')
        
        # Extract patient metadata
        patient_metadata = {
            "age": request.form.get('age', 'N/A'),
            "gender": request.form.get('gender', 'N/A'),
            "location": request.form.get('location', 'N/A'),
            "duration": request.form.get('duration', 'N/A')
        }

        image_file = request.files.get('image')
        history_str = request.form.get('history', '[]')
        
        image = None
        if image_file:
            image = Image.open(image_file.stream)

        if not user_message and not image:
            return jsonify({"error": "No message or image provided"}), 400

        result = core.generate_response(user_message, image, language, patient_metadata, manual_api_key, history_str)
        
        if "error" in result:
             return jsonify(result), 500
             
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/inventory', methods=['GET', 'POST'])
def inventory():
    import json
    path = 'first_aid_ai/inventory.json'
    if request.method == 'GET':
        try:
            with open(path, 'r') as f:
                return jsonify(json.load(f))
        except:
            return jsonify({"medicines": [], "equipment": []})
    else:
        try:
            data = request.json
            with open(path, 'w') as f:
                json.dump(data, f, indent=4)
            return jsonify({"status": "success"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Listen on all interfaces
    app.run(host='0.0.0.0', port=5000, debug=True)
