document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const imageUploadBtn = document.getElementById('image-upload-btn');
    const fileInput = document.getElementById('file-input');
    const previewContainer = document.getElementById('preview-container');
    const previewImage = document.getElementById('preview-image');
    const removeImageBtn = document.getElementById('remove-image');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const inventoryList = document.getElementById('inventory-list');
    const inventoryInput = document.getElementById('inventory-input');
    const addInventoryBtn = document.getElementById('add-inventory-btn');
    const cameraBtn = document.getElementById('camera-btn');
    const cameraModal = document.getElementById('camera-modal');
    const closeModal = document.querySelector('.close-modal');
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const captureBtn = document.getElementById('capture-btn');

    const languageSelect = document.getElementById('language-select');
    const patientDataForm = document.getElementById('patient-data-form');
    const savePatientBtn = document.getElementById('save-patient-btn');
    const bodyVizContainer = document.getElementById('body-viz-container');
    const humanBodySvg = document.getElementById('human-body');
    const micBtn = document.getElementById('mic-btn');
    const speakerToggle = document.getElementById('speaker-toggle');

    // UI Elements
    const displayAge = document.getElementById('display-age');
    const displayGender = document.getElementById('display-gender');
    const actionsContent = document.getElementById('actions-content');
    const discoveryContent = document.getElementById('discovery-content');
    const activePartDisplay = document.getElementById('active-part-display');

    let currentFile = null;
    let uploadedImageURL = null;
    let cameraStream = null;
    let chatHistory = []; // Conv Memory

    // Theme Management
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggleBtn.textContent = currentTheme === 'dark' ? '☀️' : '🌙';

    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.add('theme-transitioning');
        const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
        setTimeout(() => document.body.classList.remove('theme-transitioning'), 400);
    });

    // Inventory Management
    async function loadInventory() {
        try {
            const res = await fetch('/api/inventory');
            const data = await res.json();
            renderInventory(data);
        } catch (err) { console.error('Failed to load inventory', err); }
    }

    function renderInventory(data) {
        inventoryList.innerHTML = '';
        const medicines = data.medicines || [];
        if (medicines.length === 0) {
            inventoryList.innerHTML = '<div class="empty-state">No items in inventory.</div>';
            return;
        }
        medicines.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'inventory-item';
            div.innerHTML = `
                <span>${item}</span>
                <span class="remove-btn" data-index="${index}">×</span>
            `;
            inventoryList.appendChild(div);
        });
    }

    addInventoryBtn.addEventListener('click', async () => {
        const item = inventoryInput.value.trim();
        if (!item) return;
        const res = await fetch('/api/inventory');
        const data = await res.json();
        if (!data.medicines) data.medicines = [];
        data.medicines.push(item);
        await fetch('/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        inventoryInput.value = '';
        loadInventory();
    });

    inventoryList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('remove-btn')) {
            const index = e.target.getAttribute('data-index');
            const res = await fetch('/api/inventory');
            const data = await res.json();
            data.medicines.splice(index, 1);
            await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            loadInventory();
        }
    });

    // --- Voice Interactivity (STT & TTS) ---
    let recognition = null;
    let isListening = false;
    let isSpeakerOn = false;

    // Check Support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        recognition = new (window.webkitSpeechRecognition || window.SpeechRecognition)();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            isListening = true;
            micBtn.classList.add('recording');
            micBtn.style.background = 'var(--primary)';
            micBtn.style.color = 'white';
        };

        recognition.onend = () => {
            isListening = false;
            micBtn.classList.remove('recording');
            micBtn.style.background = 'var(--surface)';
            micBtn.style.color = 'var(--primary)';
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            messageInput.value = transcript;
            messageInput.focus();
        };

        recognition.onerror = (event) => {
            console.error('Speech error:', event.error);
            isListening = false;
            micBtn.classList.remove('recording');
        };
    } else if (micBtn) {
        micBtn.style.display = 'none'; // Hide if not supported
    }

    // Language Map
    const langMap = {
        'English': 'en-US', 'Hindi': 'hi-IN', 'Bengali': 'bn-IN',
        'Marathi': 'mr-IN', 'Telugu': 'te-IN', 'Tamil': 'ta-IN',
        'Gujarati': 'gu-IN', 'Kannada': 'kn-IN', 'Malayalam': 'ml-IN'
    };

    if (micBtn) {
        micBtn.addEventListener('click', () => {
            if (!recognition) return;
            if (isListening) recognition.stop();
            else {
                recognition.lang = langMap[languageSelect.value] || 'en-US';
                recognition.start();
            }
        });
    }

    if (speakerToggle) {
        speakerToggle.addEventListener('click', () => {
            isSpeakerOn = !isSpeakerOn;
            speakerToggle.textContent = isSpeakerOn ? '🔊' : '🔇';
        });
    }

    function speakText(text) {
        if (!isSpeakerOn) return;
        window.speechSynthesis.cancel(); // Stop previous
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langMap[languageSelect.value] || 'en-US';
        window.speechSynthesis.speak(utterance);
    }

    loadInventory();

    // Camera Management
    cameraBtn.addEventListener('click', async () => {
        cameraModal.style.display = 'block';
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = cameraStream;
        } catch (err) {
            alert('Could not access camera: ' + err.message);
            cameraModal.style.display = 'none';
        }
    });

    function stopCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
        cameraModal.style.display = 'none';
    }

    closeModal.addEventListener('click', stopCamera);
    window.addEventListener('click', (e) => { if (e.target == cameraModal) stopCamera(); });

    captureBtn.addEventListener('click', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
            currentFile = new File([blob], "capture.jpg", { type: "image/jpeg" });
            if (uploadedImageURL) URL.revokeObjectURL(uploadedImageURL);
            uploadedImageURL = URL.createObjectURL(currentFile);
            previewImage.src = uploadedImageURL;
            previewContainer.classList.add('active');
            stopCamera();
        }, 'image/jpeg');
    });

    // Confirm Patient Details
    savePatientBtn.addEventListener('click', () => {
        const age = document.getElementById('patient-age').value;
        const gender = document.getElementById('patient-gender').value;

        if (!age || gender === 'N/A') {
            alert("Please provide Age and Gender to unlock the visualization.");
            return;
        }

        bodyVizContainer.classList.remove('locked');
        bodyVizContainer.style.filter = 'none';
        bodyVizContainer.style.pointerEvents = 'auto';

        savePatientBtn.textContent = "✅ Profile Confirmed";
        savePatientBtn.style.background = "#22c55e";

        displayAge.textContent = `Age: ${age}`;
        displayGender.textContent = `Gender: ${gender}`;

        // Ensure the overlay is hidden
        const overlay = bodyVizContainer.querySelector('.locked-overlay');
        if (overlay) overlay.style.display = 'none';
    });

    // Auto-resize textarea
    messageInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value.trim() === '') this.style.height = '44px';
    });

    // Image Upload
    imageUploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            currentFile = file;
            if (uploadedImageURL) URL.revokeObjectURL(uploadedImageURL);
            uploadedImageURL = URL.createObjectURL(file);
            previewImage.src = uploadedImageURL;
            previewContainer.classList.add('active');
        }
    });

    removeImageBtn.addEventListener('click', () => {
        currentFile = null;
        fileInput.value = '';
        previewContainer.classList.remove('active');
    });

    // API Key Management
    const apiKeyInput = document.getElementById('api-key-input');
    if (localStorage.getItem('gemini_api_key')) apiKeyInput.value = localStorage.getItem('gemini_api_key');
    apiKeyInput.addEventListener('change', () => localStorage.setItem('gemini_api_key', apiKeyInput.value));

    // Send Message
    async function sendMessage() {
        const text = messageInput.value.trim();
        const manualKey = apiKeyInput.value.trim();
        const pAge = document.getElementById('patient-age')?.value || 'N/A';
        const pGender = document.getElementById('patient-gender')?.value || 'N/A';
        const pLocation = document.getElementById('patient-location')?.value || 'N/A';
        const pDuration = document.getElementById('patient-duration')?.value || 'N/A';

        if (!text && !currentFile) return;

        // Trigger Flying Text Animation
        if (text) {
            await animateFlyingText(text);
        }

        appendMessage(text, 'user');

        const formData = new FormData();
        formData.append('message', text);
        formData.append('language', languageSelect.value);
        formData.append('api_key', manualKey);
        formData.append('age', pAge);
        formData.append('gender', pGender);
        formData.append('location', pLocation);
        formData.append('duration', pDuration);
        if (currentFile) formData.append('image', currentFile);
        formData.append('history', JSON.stringify(chatHistory));

        // Add user msg to history
        chatHistory.push({ role: 'user', text: text || "[Image Shared]" });

        messageInput.value = '';
        messageInput.style.height = '44px';
        currentFile = null;
        if (previewContainer) previewContainer.classList.remove('active');

        const loadingId = appendLoading();
        if (displayAge) displayAge.textContent = `Age: ${pAge}`;
        if (displayGender) displayGender.textContent = `Gender: ${pGender}`;

        try {
            const response = await fetch('/api/chat', { method: 'POST', body: formData });
            const data = await response.json();
            removeLoading(loadingId);

            if (data.error) appendMessage(`Error: ${data.error}`, 'assistant');
            else if (data.response === 'hello') appendMessage(`Hello! How can I help you today?`, 'assistant');
            else {
                handleAIResponse(data.response);
                // Add AI msg to history
                chatHistory.push({ role: 'model', text: data.response });
            }
        } catch (err) {
            removeLoading(loadingId);
            appendMessage(`Network Error: ${err.message}`, 'assistant');
        }
    }

    function handleAIResponse(fullText) {
        // Tag Regex
        const spotMatch = fullText.match(/\[SPOT_ID:\s*(\d+)\]/i);
        const procMatch = fullText.match(/\[PROCEDURE:\s*(.*?)\]/i);
        const searchMatch = fullText.match(/\[SEARCH:\s*(.*?)\]/i);

        let cleanedText = fullText
            .replace(/\[SPOT_ID:.*?\]/gi, '')
            .replace(/\[PROCEDURE:.*?\]/gi, '')
            .replace(/\[SEARCH:.*?\]/gi, '')
            .trim();

        // Creative Staggered Response
        const loadingId = appendLoading();
        setTimeout(() => {
            removeLoading(loadingId);
            appendMessage(cleanedText, 'assistant');

            // Update Visualization
            if (spotMatch) moveIndicator(spotMatch[1]);
            else document.getElementById('target-indicator-solid').style.visibility = 'hidden';

            // Update Left Panels
            updateProcedures(procMatch ? procMatch[1] : null);
            // Ignore updateDiscovery(searchMatch ? searchMatch[1] : null); as discovery panel is removed/repurposed

            // Speak Response
            speakText(cleanedText);
        }, 600);
    }

    function moveIndicator(spotId) {
        const target = document.querySelector(`.spot-node[data-id="${spotId}"]`);
        const dot = document.getElementById('target-indicator-solid');

        if (target && dot) {
            const cx = parseFloat(target.getAttribute('cx'));
            const cy = parseFloat(target.getAttribute('cy'));

            dot.setAttribute('cx', cx);
            dot.setAttribute('cy', cy);
            dot.style.visibility = 'visible';
            activePartDisplay.textContent = `Target: ${target.getAttribute('title')}`;

            // 3D Zoom Logic
            // Calculate offset to center the spot in zoomed view
            // SVG width 200, height 500. Center is (100, 250)
            const zx = (100 - cx) * 2; // exaggerated for zoom
            const zy = (250 - cy) * 2;

            humanBodySvg.style.setProperty('--zx', `${zx}px`);
            humanBodySvg.style.setProperty('--zy', `${zy}px`);

            humanBodySvg.classList.remove('zoom-active');
            void humanBodySvg.offsetWidth; // trigger reflow
            humanBodySvg.classList.add('zoom-active');
        }
    }

    function updateProcedures(procStr) {
        actionsContent.innerHTML = '';
        if (procStr) {
            procStr.split(',').forEach(step => {
                const div = document.createElement('div');
                div.className = 'action-step';
                div.textContent = step.trim();
                actionsContent.appendChild(div);
            });
        } else {
            actionsContent.innerHTML = '<div class="empty-state">No specific procedures identified.</div>';
        }
    }

    function updateDiscovery(searchStr) {
        discoveryContent.innerHTML = '';
        if (searchStr) {
            searchStr.split(',').forEach(item => {
                const name = item.trim();
                if (!name) return;
                const card = document.createElement('a');
                card.className = 'discovery-card';
                card.href = `https://www.google.com/search?q=${encodeURIComponent(name)}+medical+equipment+medicine&tbm=isch`;
                card.target = '_blank';

                // Determin icon
                let icon = '📦';
                if (name.toLowerCase().includes('tablet') || name.toLowerCase().includes('pill')) icon = '💊';
                if (name.toLowerCase().includes('bandage') || name.toLowerCase().includes('tape')) icon = '🩹';
                if (name.toLowerCase().includes('thermometer')) icon = '🌡️';

                card.innerHTML = `
                    <div class="discovery-icon">${icon}</div>
                    <div class="discovery-label">${name}</div>
                    <div class="search-btn">View Live</div>
                `;
                discoveryContent.appendChild(card);
            });
        } else {
            discoveryContent.innerHTML = '<div class="empty-state">No items identified yet.</div>';
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

    document.getElementById('new-case-btn').addEventListener('click', () => {
        if (confirm("Clear current case and start over?")) {
            chatContainer.innerHTML = `
                <div class="message assistant doctor-msg">
                    <div class="avatar doctor-avatar">🩺</div>
                    <div class="message-content">
                        New case started. How can I help you?
                    </div>
                </div>
            `;
            chatHistory = [];
            actionsContent.innerHTML = '<div class="empty-state">Procedural steps will appear here.</div>';
            document.getElementById('target-indicator-solid').style.visibility = 'hidden';
            activePartDisplay.textContent = 'All Systems Normal';
        }
    });

    function appendMessage(text, role) {
        const div = document.createElement('div');
        const isDoc = role === 'assistant';
        div.className = `message ${role} ${isDoc ? 'doctor-msg' : ''}`;

        const avatar = document.createElement('div');
        avatar.className = `avatar ${isDoc ? 'doctor-avatar' : ''}`;
        avatar.innerHTML = isDoc ? '🩺' : '👤';

        const content = document.createElement('div');
        content.className = 'message-content';

        if (window.marked) content.innerHTML = marked.parse(text);
        else content.innerText = text;

        div.appendChild(avatar);
        div.appendChild(content);
        chatContainer.appendChild(div);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function appendLoading() {
        const id = 'loading-' + Date.now();
        const div = document.createElement('div');
        div.className = 'message assistant doctor-msg';
        div.id = id;
        div.innerHTML = `<div class="avatar doctor-avatar">🩺</div><div class="message-content">Dr. Guardian is thinking...</div>`;
        chatContainer.appendChild(div);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        return id;
    }

    function removeLoading(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    // Flying Text Animation Logic
    async function animateFlyingText(text) {
        return new Promise((resolve) => {
            const container = document.querySelector('.input-container');
            const rect = container.getBoundingClientRect();
            const words = text.split(' ');

            words.forEach((word, i) => {
                const fragment = document.createElement('div');
                fragment.className = 'text-fragment fragment-animate';
                fragment.textContent = word;

                // Starting position (input area)
                fragment.style.left = `${rect.left + (rect.width / 2)}px`;
                fragment.style.top = `${rect.top}px`;

                // Random destination & rotation
                const tx = (Math.random() - 0.5) * 400; // spread
                const ty = -(window.innerHeight * 0.7 + Math.random() * 100); // fly up
                const rot = (Math.random() - 0.5) * 90;

                fragment.style.setProperty('--tx', `${tx}px`);
                fragment.style.setProperty('--ty', `${ty}px`);
                fragment.style.setProperty('--rot', `${rot}deg`);

                // Staggered start
                fragment.style.animationDelay = `${i * 0.05}s`;

                document.body.appendChild(fragment);

                // Cleanup
                setTimeout(() => fragment.remove(), 1200);
            });

            setTimeout(resolve, 800); // Wait for most fragments to fly up
        });
    }
});
