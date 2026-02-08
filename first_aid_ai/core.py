import os
import json
import google.generativeai as genai
from PIL import Image
from dotenv import load_dotenv

# Load Environment Variables
load_dotenv()

# Gemini Multi-Key Rotation Manager
class KeyManager:
    def __init__(self):
        # Extract all keys that look like gemini/GEMINI API keys
        self.keys = []
        
        # Load from .env - be flexible with names
        for key, value in os.environ.items():
            if 'gemini' in key.lower() or 'api_key' in key.lower():
                if value and value.startswith('AIza'):
                    self.keys.append(value)
        
        self.current_index = 0
        if not self.keys:
            print("WARNING: No Gemini API Keys found in .env. System will require manual key entry in UI.")

    def get_next_key(self):
        if not self.keys:
            return None
        key = self.keys[self.current_index]
        self.current_index = (self.current_index + 1) % len(self.keys)
        return key

key_manager = KeyManager()

def load_knowledge_base():
    try:
        with open('knowledge_base.json', 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading knowledge base: {e}")
        return {}

def load_inventory():
    try:
        with open('inventory.json', 'r') as f:
            return json.load(f)
    except Exception:
        return {"medicines": [], "equipment": []}

knowledge_base = load_knowledge_base()

def get_relevant_context(query):
    """
    Primitive RAG implementation: Matches query keywords with protocol titles
    In a production app, use vector embeddings (LangChain/ChromaDB).
    """
    matches = []
    query_lower = query.lower()
    
    for protocol in knowledge_base.get('protocols', []):
        title = protocol.get('title', '').lower()
        keywords = protocol.get('keywords', [])
        
        # Simple match check
        if any(kw.lower() in query_lower for kw in keywords) or title in query_lower:
            matches.append(protocol)
            
    # Sort by relevance (basic)
    matches.sort(key=lambda x: x[0] if isinstance(x, tuple) else 0, reverse=True)
    return matches[:3] # Return top 3

def generate_response(user_query, image=None, language="English", patient_metadata=None, manual_api_key=None, history_str="[]"):
    errors = []
    
    # Parse history
    try:
        history = json.loads(history_str)
    except:
        history = []

    # If manual key is provided, use it first or exclusively
    api_keys_to_try = []
    if manual_api_key:
        api_keys_to_try.append(manual_api_key)
    
    # Add other keys from key_manager
    if key_manager.keys:
        for _ in range(min(3, len(key_manager.keys))): # Try up to 3 rotates
            api_keys_to_try.append(key_manager.get_next_key())
    
    if not api_keys_to_try:
        return {"error": "No API Key provided. Please enter your Gemini API Key in the top header."}

    # Get RAG context
    matches = get_relevant_context(user_query)

    for attempt_key in api_keys_to_try:
        try:
            genai.configure(api_key=attempt_key)
            model_name = 'gemini-flash-latest'
            model = genai.GenerativeModel(model_name)
            
            # Load Inventory
            inventory = load_inventory()
            
            # --- Vision Analysis for better keywords ---
            if image:
                try:
                    vision_prompt = """
                    Analyze this medical situation. 
                    Identify the injury type and any visible tools/items.
                    Return 3-5 keywords only.
                    """
                    v_res = model.generate_content([vision_prompt, image])
                    user_query += f" (Visuals: {v_res.text})"
                except:
                    pass

            # Format History Context
            history_context = ""
            if history:
                history_context = "\nCONVERSATION HISTORY:\n"
                for msg in history[-6:]: # Last 6 turns for context
                    role = "Patient" if msg['role'] == 'user' else "Dr. Guardian"
                    history_context += f"{role}: {msg['text']}\n"

            system_prompt = [
                f"""
                PERSONA: You are Dr. Guardian, a senior school nurse and emergency first-aid expert. 
                Your tone is professional, expert, and ultra-concise.
                
                {history_context}

                AVAILABLE INVENTORY (Medicines & Equipment):
                {json.dumps(inventory.get('medicines', []), indent=2)}

                CONTEXT DATA: {json.dumps(matches, indent=2)}

                PATIENT DETAILS:
                - Age: {patient_metadata.get('age', 'N/A')}, Gender: {patient_metadata.get('gender', 'N/A')}, Location: {patient_metadata.get('location', 'N/A')}

                TASK:
                1. Analyze visuals/query. 
                2. Use the provided CONTEXT DATA for steps.
                3. CROSS-REFERENCE with AVAILABLE INVENTORY. Tell the user what to use from inventory.
                4. If a critical item is missing but needed (e.g. bandage, antiseptic), WARN specifically.
                5. Be direct. No filler phrases.
                6. REFER TO PREVIOUS STEPS (History) if relevant. Avoid repeating instructions already given.

                SPOT MAP: 1: Head, 3: Face, 5: Neck, 8: Chest, 11: Abdomen, 13-18: Arms, 19-20: Hands, 21-28: Legs, 29-30: Feet
                
                FORMAT (MUST BE LAST LINES):
                [SPOT_ID: <number>]
                [PROCEDURE: <step_1>, <step_2>, ...]
                [SEARCH: <missing_item_1>, <item_to_use_from_inventory>, ...]

                LANGUAGE: You must strictly respond in {language}.
                """,
            ]

            parts = system_prompt + [f"User Query: {user_query}"]
            if image:
                parts.append(image)

            response = model.generate_content(parts)
            return {"response": response.text, "context_used": len(matches) > 0}

        except Exception as e:
            errors.append(str(e))
            continue

    return {"error": f"Failed after {len(api_keys_to_try)} attempts. Errors: {', '.join(errors)}"}
