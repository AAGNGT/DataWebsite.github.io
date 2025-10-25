// Google Gemini API 配置
const GEMINI_API_KEY = 'AIzaSyCyBqg83eSlhgn23erYgfW-PiL6gTR2N2M';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// 全域變數
let currentChatId = null;
let chatHistory = [];
let isTyping = false;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeChat();
    setupEventListeners();
    updateWelcomeTime();
    updateHomeButton();
});

// 初始化聊天
function initializeChat() {
    loadChatHistory();
    createNewChat();
    updateSettingsDisplay();
}

// 設置事件監聽器
function setupEventListeners() {
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');

    // 輸入框事件 - 優化Enter鍵發送
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                // Shift + Enter: 換行
                return;
            } else {
                // Enter: 發送訊息
                e.preventDefault();
                sendMessage();
            }
        }
    });

    messageInput.addEventListener('input', function() {
        autoResizeTextarea(this);
        updateSendButton();
    });

    // 設定變更事件
    document.getElementById('aiPersonality').addEventListener('change', saveSettings);
    document.getElementById('responseLength').addEventListener('input', function() {
        updateSettingsDisplay();
        saveSettings();
    });
    document.getElementById('creativity').addEventListener('input', function() {
        updateSettingsDisplay();
        saveSettings();
    });
    document.getElementById('language').addEventListener('change', saveSettings);

    // 點擊彈出視窗外部關閉
    document.getElementById('historyModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeHistoryModal();
        }
    });

    // ESC鍵關閉彈出視窗
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeHistoryModal();
        }
    });
}

// 自動調整輸入框高度
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

// 更新發送按鈕狀態
function updateSendButton() {
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const hasText = messageInput.value.trim().length > 0;
    
    sendBtn.disabled = !hasText || isTyping;
}

// 發送訊息
async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message || isTyping) return;

    // 添加用戶訊息
    addMessage('user', message);
    messageInput.value = '';
    autoResizeTextarea(messageInput);
    updateSendButton();

    // 顯示打字指示器
    showTypingIndicator();

    try {
        // 調用 Gemini API
        const response = await callGeminiAPI(message);
        hideTypingIndicator();
        addMessage('ai', response);
        
        // 保存對話
        saveCurrentChat();
    } catch (error) {
        hideTypingIndicator();
        console.error('API 錯誤:', error);
        addMessage('ai', '抱歉，我遇到了一些技術問題。請稍後再試，或檢查您的網路連接。');
    }
}

// 調用 Gemini API
async function callGeminiAPI(message) {
    const settings = getSettings();
    const prompt = buildPrompt(message, settings);

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                maxOutputTokens: settings.isUnlimited ? 8192 : settings.responseLength,
                temperature: settings.isCreativityUnlimited ? 1.0 : settings.creativity / 100,
                topP: 0.8,
                topK: 40
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('API 錯誤詳情:', errorText);
        throw new Error(`API 錯誤: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
    } else {
        console.error('API 回應數據:', data);
        throw new Error('API 回應格式錯誤');
    }
}

// 構建提示詞
function buildPrompt(message, settings) {
    const personalityPrompts = {
        friendly: '你是一個友善、熱情的AI助手，用溫暖的語調與用戶交流。',
        professional: '你是一個專業、準確的AI顧問，提供可靠的信息和建議。',
        creative: '你是一個富有創意的AI夥伴，善於提供新穎的想法和解決方案。',
        educational: '你是一個耐心的教學導師，善於解釋複雜概念並引導學習。',
        unlimited: '你是一個靈活多變的AI助手，根據用戶的需求和問題內容，自動調整你的回應風格和個性，提供最適合的幫助。'
    };

    const languagePrompts = {
        'zh-TW': '請用繁體中文回應。',
        'zh-CN': '請用簡體中文回應。',
        'en': 'Please respond in English.',
        'ja': '日本語で回答してください。'
    };

    return `${personalityPrompts[settings.personality]} ${languagePrompts[settings.language]} 用戶的問題是：${message}`;
}

// 渲染Markdown格式的文本
function renderMarkdown(text) {
    if (!text) return '';
    
    // 先處理列表項目，避免與粗體衝突
    // 轉換列表項目 * item 為 <li>item</li>
    text = text.replace(/^\s*\*\s+(.+)$/gm, '<li>$1</li>');
    
    // 將連續的 <li> 項目包裝在 <ul> 中
    text = text.replace(/(<li>.*<\/li>)/gs, (match) => {
        return '<ul>' + match + '</ul>';
    });
    
    // 轉換粗體 **text** 為 <strong>text</strong>
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // 轉換斜體 *text* 為 <em>text</em>（避免與列表衝突）
    text = text.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>');
    
    // 轉換換行為 <br>，但大幅減少多餘的換行
    text = text.replace(/\n/g, '<br>');
    
    // 清理多餘的 <br> 標籤，最多保留一個
    text = text.replace(/(<br>\s*){2,}/g, '<br>');
    
    // 清理列表前後的 <br> 標籤
    text = text.replace(/<br>\s*<ul>/g, '<ul>');
    text = text.replace(/<\/ul>\s*<br>/g, '</ul>');
    
    // 清理段落間的多餘換行
    text = text.replace(/(<br>\s*){2,}/g, '<br>');
    
    // 清理開頭和結尾的多餘換行
    text = text.replace(/^(<br>\s*)+/, '');
    text = text.replace(/(<br>\s*)+$/, '');
    
    return text;
}

// 智能主頁導航函數
function navigateToHome() {
    // 檢查是否有歷史記錄且來源是 aagngt.us.kg
    const referrer = document.referrer;
    const hasHistory = window.history.length > 1;
    
    // 如果來源是 aagngt.us.kg 且有歷史記錄，返回上一步
    if (referrer && referrer.includes('aagngt.us.kg') && hasHistory) {
        try {
            window.history.back();
        } catch (error) {
            // 如果返回失敗，直接在本頁跳轉到主頁
            window.location.href = 'https://aagngt.us.kg';
        }
    } else {
        // 否則直接在本頁跳轉到主頁
        window.location.href = 'https://aagngt.us.kg';
    }
}

// 更新主頁按鈕顯示
function updateHomeButton() {
    const homeBtn = document.querySelector('.home-btn');
    const referrer = document.referrer;
    const hasHistory = window.history.length > 1;
    
    if (referrer && referrer.includes('aagngt.us.kg') && hasHistory) {
        // 如果來源是 aagngt.us.kg，顯示返回圖標
        homeBtn.innerHTML = '<i class="fas fa-arrow-left"></i> 返回';
    } else {
        // 否則顯示主頁圖標
        homeBtn.innerHTML = '<i class="fas fa-home"></i> 主頁';
    }
}

// 添加訊息到聊天界面
function addMessage(sender, text) {
    const messagesContainer = document.getElementById('messagesContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;

    const avatar = sender === 'user' ? 
        '<div class="message-avatar user-avatar"><i class="fas fa-user"></i></div>' :
        '<div class="message-avatar ai-avatar"><i class="fas fa-robot"></i></div>';

    const currentTime = new Date().toLocaleTimeString('zh-TW', {
        hour: '2-digit',
        minute: '2-digit'
    });

    // 對AI回應使用Markdown渲染
    const messageContent = sender === 'ai' ? renderMarkdown(text) : text;

    messageDiv.innerHTML = `
        ${avatar}
        <div class="message-content">
            <div class="message-text">${messageContent}</div>
            <div class="message-time">${currentTime}</div>
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // 保存到當前對話
    if (currentChatId) {
        let chat = chatHistory.find(c => c.id === currentChatId);
        
        // 如果對話不存在且是用戶訊息，創建新對話
        if (!chat && sender === 'user') {
            chat = {
                id: currentChatId,
                title: '新對話',
                messages: [],
                createdAt: new Date()
            };
            chatHistory.unshift(chat);
        }
        
        if (chat) {
            chat.messages.push({ sender, text, timestamp: new Date() });
        }
    }
}

// 顯示打字指示器
function showTypingIndicator() {
    isTyping = true;
    updateSendButton();
    
    const messagesContainer = document.getElementById('messagesContainer');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai-message';
    typingDiv.id = 'typingIndicator';
    
    typingDiv.innerHTML = `
        <div class="message-avatar ai-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="typing-indicator">
                <span>AI 正在思考</span>
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        </div>
    `;

    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 隱藏打字指示器
function hideTypingIndicator() {
    isTyping = false;
    updateSendButton();
    
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// 切換側邊欄（設定面板）
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
}

// 顯示設定（切換側邊欄）
function showSettings() {
    toggleSidebar();
}

// 顯示對話歷史彈出視窗
function showHistoryModal() {
    const modal = document.getElementById('historyModal');
    modal.classList.add('show');
    updateHistoryModalDisplay();
    document.body.style.overflow = 'hidden';
}

// 關閉對話歷史彈出視窗
function closeHistoryModal() {
    const modal = document.getElementById('historyModal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

// 獲取設定
function getSettings() {
    const unlimitedBtn = document.getElementById('unlimitedBtn');
    const personalityUnlimitedBtn = document.getElementById('personalityUnlimitedBtn');
    const creativityUnlimitedBtn = document.getElementById('creativityUnlimitedBtn');
    
    const isUnlimited = unlimitedBtn.classList.contains('active');
    const isPersonalityUnlimited = personalityUnlimitedBtn.classList.contains('active');
    const isCreativityUnlimited = creativityUnlimitedBtn.classList.contains('active');
    
    return {
        personality: isPersonalityUnlimited ? 'unlimited' : document.getElementById('aiPersonality').value,
        isPersonalityUnlimited: isPersonalityUnlimited,
        responseLength: isUnlimited ? -1 : parseInt(document.getElementById('responseLength').value),
        isUnlimited: isUnlimited,
        creativity: isCreativityUnlimited ? -1 : parseInt(document.getElementById('creativity').value),
        isCreativityUnlimited: isCreativityUnlimited,
        language: document.getElementById('language').value
    };
}

// 更新設定顯示
function updateSettingsDisplay() {
    const responseLength = document.getElementById('responseLength');
    const responseLengthValue = document.getElementById('responseLengthValue');
    const unlimitedBtn = document.getElementById('unlimitedBtn');
    
    if (unlimitedBtn.classList.contains('active')) {
        responseLengthValue.textContent = '不限';
        responseLength.disabled = true;
        responseLength.style.opacity = '0.5';
    } else {
        responseLengthValue.textContent = responseLength.value + ' 字';
        responseLength.disabled = false;
        responseLength.style.opacity = '1';
    }
    
    document.getElementById('creativityValue').textContent = 
        document.getElementById('creativity').value + '%';
}

// 切換不限回應長度
function toggleUnlimitedResponse() {
    const unlimitedBtn = document.getElementById('unlimitedBtn');
    const responseLength = document.getElementById('responseLength');
    
    unlimitedBtn.classList.toggle('active');
    
    if (unlimitedBtn.classList.contains('active')) {
        // 啟用不限模式
        responseLength.disabled = true;
        responseLength.style.opacity = '0.5';
    } else {
        // 禁用不限模式
        responseLength.disabled = false;
        responseLength.style.opacity = '1';
    }
    
    updateSettingsDisplay();
    saveSettings();
}

// 切換不限AI個性
function toggleUnlimitedPersonality() {
    const unlimitedBtn = document.getElementById('personalityUnlimitedBtn');
    const personalitySelect = document.getElementById('aiPersonality');
    
    unlimitedBtn.classList.toggle('active');
    
    if (unlimitedBtn.classList.contains('active')) {
        // 啟用不限模式
        personalitySelect.disabled = true;
        personalitySelect.style.opacity = '0.5';
    } else {
        // 禁用不限模式
        personalitySelect.disabled = false;
        personalitySelect.style.opacity = '1';
    }
    
    saveSettings();
}

// 切換不限創意程度
function toggleUnlimitedCreativity() {
    const unlimitedBtn = document.getElementById('creativityUnlimitedBtn');
    const creativityRange = document.getElementById('creativity');
    
    unlimitedBtn.classList.toggle('active');
    
    if (unlimitedBtn.classList.contains('active')) {
        // 啟用不限模式
        creativityRange.disabled = true;
        creativityRange.style.opacity = '0.5';
    } else {
        // 禁用不限模式
        creativityRange.disabled = false;
        creativityRange.style.opacity = '1';
    }
    
    updateSettingsDisplay();
    saveSettings();
}

// 保存設定 - 優化版本
function saveSettings() {
    try {
        const settings = getSettings();
        localStorage.setItem('aiChatSettings', JSON.stringify(settings));
        console.log('設定保存成功:', settings);
    } catch (error) {
        console.error('保存設定時發生錯誤:', error);
    }
}

// 載入設定 - 優化版本
function loadSettings() {
    try {
        const saved = localStorage.getItem('aiChatSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            // 驗證設定格式並設置預設值
            document.getElementById('aiPersonality').value = settings.personality || 'friendly';
            document.getElementById('responseLength').value = settings.responseLength || 200;
            document.getElementById('creativity').value = settings.creativity || 50;
            document.getElementById('language').value = settings.language || 'zh-TW';
            
            // 處理不限狀態
            const unlimitedBtn = document.getElementById('unlimitedBtn');
            const personalityUnlimitedBtn = document.getElementById('personalityUnlimitedBtn');
            const creativityUnlimitedBtn = document.getElementById('creativityUnlimitedBtn');
            
            if (settings.isUnlimited) {
                unlimitedBtn.classList.add('active');
            } else {
                unlimitedBtn.classList.remove('active');
            }
            
            if (settings.isPersonalityUnlimited) {
                personalityUnlimitedBtn.classList.add('active');
            } else {
                personalityUnlimitedBtn.classList.remove('active');
            }
            
            if (settings.isCreativityUnlimited) {
                creativityUnlimitedBtn.classList.add('active');
            } else {
                creativityUnlimitedBtn.classList.remove('active');
            }
            
            updateSettingsDisplay();
            console.log('設定載入成功:', settings);
        } else {
            console.log('沒有找到設定，使用預設值');
            // 設置預設值
            document.getElementById('aiPersonality').value = 'friendly';
            document.getElementById('responseLength').value = 200;
            document.getElementById('creativity').value = 50;
            document.getElementById('language').value = 'zh-TW';
            updateSettingsDisplay();
        }
    } catch (error) {
        console.error('載入設定時發生錯誤:', error);
        // 使用預設值
        document.getElementById('aiPersonality').value = 'friendly';
        document.getElementById('responseLength').value = 200;
        document.getElementById('creativity').value = 50;
        document.getElementById('language').value = 'zh-TW';
        updateSettingsDisplay();
    }
}

// 創建新對話
function createNewChat() {
    // 保存當前對話（如果有內容）
    saveCurrentChat();
    
    // 創建新的對話ID
    currentChatId = 'chat_' + Date.now();
    
    // 清空聊天界面
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.innerHTML = '';
    
    // 更新歷史顯示
    updateHistoryDisplay();
    
    console.log('新對話已創建:', currentChatId);
}

// 載入對話歷史 - 優化版本
function loadChatHistory() {
    try {
        const saved = localStorage.getItem('aiChatHistory');
        if (saved) {
            const parsedHistory = JSON.parse(saved);
            // 驗證數據格式
            if (Array.isArray(parsedHistory)) {
                chatHistory = parsedHistory.map(chat => ({
                    ...chat,
                    createdAt: new Date(chat.createdAt),
                    messages: chat.messages.map(msg => ({
                        ...msg,
                        timestamp: new Date(msg.timestamp)
                    }))
                }));
                updateHistoryDisplay();
                console.log('對話歷史載入成功:', chatHistory.length, '個對話');
            } else {
                console.warn('對話歷史格式錯誤，重新初始化');
                chatHistory = [];
            }
        } else {
            console.log('沒有找到對話歷史，初始化空陣列');
            chatHistory = [];
        }
    } catch (error) {
        console.error('載入對話歷史時發生錯誤:', error);
        chatHistory = [];
    }
}

// 保存對話歷史 - 優化版本
function saveChatHistory() {
    try {
        // 只保存有訊息的對話
        let validChats = chatHistory.filter(chat => chat.messages.length > 0);
        
        // 限制歷史記錄數量，避免儲存空間過大
        const maxHistoryItems = 50;
        if (validChats.length > maxHistoryItems) {
            validChats = validChats.slice(0, maxHistoryItems);
        }
        
        localStorage.setItem('aiChatHistory', JSON.stringify(validChats));
        console.log('對話歷史保存成功:', validChats.length, '個對話');
    } catch (error) {
        console.error('保存對話歷史時發生錯誤:', error);
        // 如果儲存失敗，嘗試清理舊數據
        if (error.name === 'QuotaExceededError') {
            console.log('儲存空間不足，清理舊對話記錄');
            const validChats = chatHistory.filter(chat => chat.messages.length > 0).slice(0, 20);
            try {
                localStorage.setItem('aiChatHistory', JSON.stringify(validChats));
                console.log('清理後重新保存成功');
            } catch (retryError) {
                console.error('重新保存仍然失敗:', retryError);
            }
        }
    }
}

// 保存當前對話
function saveCurrentChat() {
    if (currentChatId) {
        const chat = chatHistory.find(c => c.id === currentChatId);
        if (chat && chat.messages.length > 0) {
            // 更新對話標題
            const firstUserMessage = chat.messages.find(m => m.sender === 'user');
            if (firstUserMessage) {
                chat.title = firstUserMessage.text.substring(0, 30) + 
                           (firstUserMessage.text.length > 30 ? '...' : '');
            }
            saveChatHistory();
            updateHistoryDisplay();
        }
    }
}

// 更新歷史顯示（彈出視窗版本）
function updateHistoryModalDisplay() {
    const historyModalBody = document.getElementById('historyModalBody');
    historyModalBody.innerHTML = '';

    // 計算有效對話數量
    const validChats = chatHistory.filter(chat => chat.messages.length > 0);
    const recordCount = validChats.length;

    if (recordCount === 0) {
        historyModalBody.innerHTML = `
            <div class="history-modal-empty">
                <i class="fas fa-comments"></i>
                <p>還沒有對話記錄</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem; opacity: 0.7;">開始與AI對話後，記錄會顯示在這裡</p>
            </div>
        `;
        return;
    }

    // 添加記錄數量提示
    const countHeader = document.createElement('div');
    countHeader.className = 'history-count-header';
    countHeader.innerHTML = `
        <div class="history-count-info">
            <i class="fas fa-list"></i>
            <span>共 ${recordCount} 條對話記錄</span>
        </div>
    `;
    historyModalBody.appendChild(countHeader);

    validChats.forEach(chat => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-modal-item';
        historyItem.dataset.chatId = chat.id;
        if (chat.id === currentChatId) {
            historyItem.classList.add('active');
        }

        const timeStr = chat.createdAt.toLocaleDateString('zh-TW');
        const preview = chat.messages[chat.messages.length - 1].text.substring(0, 80) + '...';

        historyItem.innerHTML = `
            <div class="history-title">${chat.title}</div>
            <div class="history-modal-preview">${preview}</div>
            <div class="history-modal-time">${timeStr}</div>
            <button class="history-delete-btn" onclick="deleteChat('${chat.id}')" title="刪除對話">
                <i class="fas fa-trash"></i>
            </button>
        `;

        // 左鍵點擊載入對話
        historyItem.addEventListener('click', (e) => {
            if (!e.target.closest('.history-delete-btn')) {
                loadChat(chat.id);
                closeHistoryModal();
            }
        });

        historyModalBody.appendChild(historyItem);
    });
}

// 刪除對話
function deleteChat(chatId) {
    if (confirm('確定要刪除這個對話嗎？此操作無法復原。')) {
        // 從歷史中移除
        chatHistory = chatHistory.filter(chat => chat.id !== chatId);
        
        // 如果刪除的是當前對話，創建新對話
        if (chatId === currentChatId) {
            createNewChat();
        }
        
        // 保存並更新顯示
        saveChatHistory();
        updateHistoryModalDisplay();
        
        console.log('對話已刪除:', chatId);
    }
}

// 更新歷史顯示（舊版本，保留用於其他功能）
function updateHistoryDisplay() {
    // 這個函數現在主要用於更新彈出視窗
    updateHistoryModalDisplay();
}

// 載入對話
function loadChat(chatId) {
    const chat = chatHistory.find(c => c.id === chatId);
    if (!chat) return;

    currentChatId = chatId;
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.innerHTML = '';

    chat.messages.forEach(message => {
        addMessage(message.sender, message.text);
    });

    updateHistoryDisplay();
}

// 更新歡迎時間
function updateWelcomeTime() {
    const welcomeTime = document.getElementById('welcomeTime');
    if (welcomeTime) {
        welcomeTime.textContent = new Date().toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// 清理本地儲存功能
function clearAllData() {
    if (confirm('確定要清除所有對話歷史和設定嗎？此操作無法復原。')) {
        try {
            localStorage.removeItem('aiChatHistory');
            localStorage.removeItem('aiChatSettings');
            chatHistory = [];
            createNewChat();
            loadSettings();
            updateHistoryDisplay();
            console.log('所有數據已清除');
            alert('所有數據已成功清除');
        } catch (error) {
            console.error('清除數據時發生錯誤:', error);
            alert('清除數據時發生錯誤');
        }
    }
}

// 導出對話歷史
function exportChatHistory() {
    try {
        const dataStr = JSON.stringify(chatHistory, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ai-chat-history-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log('對話歷史已導出');
    } catch (error) {
        console.error('導出對話歷史時發生錯誤:', error);
        alert('導出對話歷史時發生錯誤');
    }
}

// 載入設定
loadSettings();
