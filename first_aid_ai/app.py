import streamlit as st
import json
import google.generativeai as genai
import os
from PIL import Image

# Theme Support (Dark/Light Mode)
def setup_theme():
    if "theme" not in st.session_state:
        st.session_state.theme = "light"
    
    theme_icon = "🌙" if st.session_state.theme == "light" else "☀️"
    if st.sidebar.button(f"{theme_icon} Toggle Theme"):
        st.session_state.theme = "dark" if st.session_state.theme == "light" else "light"
        st.rerun()

    if st.session_state.theme == "dark":
        st.markdown("""
            <style>
                .stApp {
                    background-color: #0e1117;
                    color: #ffffff;
                }
                .stSidebar {
                    background-color: #161b22;
                }
                /* Premium Glassmorphism for Dark Mode */
                div[data-testid="stChatMessage"] {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    margin-bottom: 10px;
                }
                div[data-testid="stChatInput"] {
                    background: #161b22;
                    border-top: 1px solid #30363d;
                }
            </style>
        """, unsafe_allow_html=True)
    else:
        st.markdown("""
            <style>
                .stApp {
                    background-color: #f8f9fa;
                    color: #212529;
                }
                div[data-testid="stChatMessage"] {
                    background: #ffffff;
                    border-radius: 10px;
                    border: 1px solid #e9ecef;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    margin-bottom: 10px;
                }
            </style>
        """, unsafe_allow_html=True)


# Page Config
st.set_page_config(
    page_title="First Aid Guardian AI",
    page_icon="🚑",
    layout="wide"
)

# Constants
KB_PATH = "knowledge_base.json"
SYSTEM_PROMPT_PATH = "system_prompt.md"
INVENTORY_PATH = "inventory.json"

# Load Helpers
def load_json(path):
    try:
        with open(path, "r") as f:
            return json.load(f)
    except Exception:
        return {"protocols": []}

def load_text(path):
    try:
        with open(path, "r") as f:
            return f.read()
    except Exception:
        return ""

def get_retrieved_context(query, kb_data):
    """Simple Keyword RAG"""
    query = query.lower()
    matches = []
    for p in kb_data.get("protocols", []):
        score = 0
        if p["title"].lower() in query:
            score += 5
        for kw in p["keywords"]:
            if kw in query:
                score += 1
        
        if score > 0:
            matches.append((score, p))
            
    matches.sort(key=lambda x: x[0], reverse=True)
    return [m[1] for m in matches[:3]] # Return top 3

# UI Layout
st.title("🚑 First Aid Guardian (School Edition)")
st.markdown("**India's First Dedicated AI for School Emergencies (ICELS Syllabus)**")

# Sidebar
with st.sidebar:
    st.header("⚙️ Configuration")
    
    # Check for API Key in environment or user input
    env_api_key = os.getenv("GEMINI_API_KEY")
    api_key_input = st.text_input("Enter Gemini API Key", value=env_api_key if env_api_key else "", type="password", help="Get one from aistudio.google.com")
    
    st.divider()
    st.subheader("📚 Knowledge Base")
    try:
        with open(KB_PATH, "r") as f:
            kb_content = f.read()
            
        st.download_button(
            label="Download Knowledge Base (JSON)",
            data=kb_content,
            file_name="knowledge_base.json",
            mime="application/json"
        )
        
        st.info("To add data: Edit knowledge_base.json and restart app.")
        
        if st.checkbox("Show Raw Data"):
            st.json(load_json(KB_PATH))
    except FileNotFoundError:
        st.error(f"Knowledge Base file not found at {KB_PATH}")

    st.divider()
    st.subheader("🩺 Doctor's Inventory")
    
    # Medicine/Equipment Management
    inventory = load_json(INVENTORY_PATH)
    if not isinstance(inventory, dict): inventory = {"medicines": [], "equipment": []}
    
    new_med = st.text_input("Add Medicine/Equipment")
    if st.button("Add to Inventory") and new_med:
        if "medicines" not in inventory: inventory["medicines"] = []
        inventory["medicines"].append(new_med)
        with open(INVENTORY_PATH, "w") as f:
            json.dump(inventory, f, indent=4)
        st.success(f"Added: {new_med}")
        st.rerun()

    if st.checkbox("Show Inventory"):
        st.write(inventory.get("medicines", []))
        if st.button("Clear Inventory"):
            with open(INVENTORY_PATH, "w") as f:
                json.dump({"medicines": [], "equipment": []}, f)
            st.rerun()

    setup_theme()


# Theme Support (Dark/Light Mode)
# Moved to top


# Main Logic
if "messages" not in st.session_state:
    st.session_state.messages = [{"role": "assistant", "content": "Hello! I am the First Aid Guardian. I can help with school emergencies. Describe the situation or **Upload/Take a Photo** of the injury."}]

# Input Area - Chat
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# Input Area - Image & Text
with st.container():
    col1, col2 = st.columns([1, 4])
    with col1:
        image_option = st.radio("Add Image:", ["None", "Webcam", "Upload"], label_visibility="collapsed")
    
    img_data = None
    if image_option == "Webcam":
        img_capture = st.camera_input("Take a photo of the injury")
        if img_capture:
            img_data = Image.open(img_capture)
    elif image_option == "Upload":
        img_file = st.file_uploader("Upload Image", type=["jpg", "png", "jpeg"])
        if img_file:
            img_data = Image.open(img_file)

    prompt = st.chat_input("Describe the emergency (or just hit enter if image provided)...")

# Processing Logic
if prompt or img_data:
    # 1. Handle User Input
    user_msg_content = prompt if prompt else "Analyze this image."
    if img_data:
        st.session_state.messages.append({"role": "user", "content": f"*[Image Uploaded]* {user_msg_content}"})
        with st.chat_message("user"):
            st.image(img_data, caption="User Image", width=200)
            st.markdown(user_msg_content)
    else:
        st.session_state.messages.append({"role": "user", "content": user_msg_content})
        with st.chat_message("user"):
            st.markdown(user_msg_content)

    # 2. AI Processing
    with st.chat_message("assistant"):
        message_placeholder = st.empty()
        
        if not api_key_input:
            message_placeholder.error("⚠️ Please enter your Gemini API Key in the sidebar.")
        else:
            try:
                genai.configure(api_key=api_key_input)
                model = genai.GenerativeModel('gemini-flash-latest')
                
                # Load Resources
                kb_data = load_json(KB_PATH)
                system_instruction = load_text(SYSTEM_PROMPT_PATH)
                inventory_data = load_json(INVENTORY_PATH)

                # --- Dynamic Context Retrieval ---
                search_query = user_msg_content
                
                # If image exists, ask Gemini to describe it first to get better keywords for search
                if img_data:
                    with st.spinner("Analyzing image patterns..."):
                        vision_prompt = """
                        Identify the medical situation, injury, or any items visible in this image. 
                        If it's an injury, describe its type (e.g., 'deep cut', 'second-degree burn').
                        If there are objects, list them (e.g., 'medicine bottle', 'bandage').
                        Return only 3-5 descriptive keywords.
                        """
                        vision_response = model.generate_content([vision_prompt, img_data])
                        image_keywords = vision_response.text
                        search_query = f"{user_msg_content} {image_keywords}"
                        # st.caption(f"Detected: {image_keywords}") # Optional Debug

                # Retrieve Context based on Text + Image Keywords
                context_items = get_retrieved_context(search_query, kb_data)
                
                context_str = ""
                if context_items:
                    context_str = "\n### IDENTIFIED PROTOCOLS (Based on Image/Text):\n"
                    for p in context_items:
                        context_str += f"- PROTOCOL: {p['title']} ({p['grade_level']})\n"
                        context_str += f"  STEPS: {'; '.join(p['steps'])}\n"
                        context_str += f"  RED FLAGS: {', '.join(p['red_flags'])}\n"
                else:
                    context_str = "No specific protocol matched in Knowledge Base. Use general medical safety knowledge based on the image."

                # --- Final Generation ---
                final_prompt = [
                    f"""
                    system_instruction: {system_instruction}
                    
                    AVAILABLE INVENTORY (Medicines & Equipment):
                    {json.dumps(inventory_data.get('medicines', []), indent=2)}
                    
                    CONTEXT DATA (Retrieved First Aid Protocols):
                    {context_str}
                    
                    USER QUERY: {user_msg_content}
                    
                    TASK:
                    1. Analyze image (if any) and query.
                    2. Use CONTEXT DATA protocols for steps.
                    3. CROSS-REFERENCE with AVAILABLE INVENTORY. 
                    4. Tell the user what to use from inventory.
                    5. If a critical item is missing but needed, WARN specifically.
                    6. Be extremely concise. Action starts now.
                    """,
                ]
                
                if img_data:
                    final_prompt.append(img_data)
                
                with st.spinner("Generating First Aid advice..."):
                    response = model.generate_content(final_prompt)
                    full_response = response.text
                    
                message_placeholder.markdown(full_response)
                st.session_state.messages.append({"role": "assistant", "content": full_response})
                
            except Exception as e:
                message_placeholder.error(f"Error: {str(e)}")
