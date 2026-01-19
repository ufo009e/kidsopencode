/**
 * UI Components for OpenCode Web Builder
 * Functions to create and manage UI elements
 */

// Component counter for unique IDs
let componentIdCounter = 0;

function getUniqueId(prefix = 'component') {
    return `${prefix}-${Date.now()}-${componentIdCounter++}`;
}

/**
 * Copy text to clipboard with feedback
 */
function copyToClipboard(text, buttonEl) {
    if (!text) return;
    
    navigator.clipboard.writeText(text).then(() => {
        if (buttonEl) {
            const originalHTML = buttonEl.innerHTML;
            buttonEl.innerHTML = '✅';
            // buttonEl.classList.add('text-green-500'); // Optional color change
            
            setTimeout(() => {
                buttonEl.innerHTML = originalHTML;
                // buttonEl.classList.remove('text-green-500');
            }, 2000);
        }
        createToast('已复制到剪贴板', 'success', 2000);
    }).catch(err => {
        console.error('Copy failed:', err);
        createToast('复制失败', 'error');
    });
}

// =============================================================================
// Message Components
// =============================================================================

/**
 * Create a user message bubble
 */
function createUserMessage(text, attachments = []) {
    const messageId = getUniqueId('user-msg');
    const div = document.createElement('div');
    div.id = messageId;
    div.className = 'message-bubble flex justify-end mb-6 group'; // Added group for hover effect
    
    let attachmentHtml = '';
    if (attachments && attachments.length > 0) {
        attachmentHtml = '<div class="mb-2 flex flex-wrap gap-2 justify-end">';
        attachments.forEach(file => {
            attachmentHtml += `<div class="text-xs px-2 py-1 bg-blue-600 bg-opacity-50 rounded border border-blue-500 flex items-center gap-1">📎 ${escapeHtml(file.name)}</div>`;
        });
        attachmentHtml += '</div>';
    }
    
    div.innerHTML = `
        <div class="max-w-[80%] relative">
            ${attachmentHtml}
            <div class="bg-primary text-white rounded-2xl rounded-tr-none px-5 py-3 shadow-md select-text">
                <div class="whitespace-pre-wrap">${escapeHtml(text)}</div>
            </div>
            
            <button class="copy-btn absolute bottom-0 -left-12 p-2 text-gray-400 hover:text-primary opacity-0 group-hover:opacity-100 transition-all rounded-full hover:bg-purple-50 shadow-sm bg-white border border-purple-100 transform translate-x-2 group-hover:translate-x-0" title="复制">
                📋
            </button>
        </div>
    `;
    
    // Attach event listener
    const copyBtn = div.querySelector('.copy-btn');
    if (copyBtn) {
        copyBtn.onclick = () => copyToClipboard(text, copyBtn);
    }
    
    return div;
}

/**
 * Create an assistant message container
 */
function createAssistantMessage() {
    const messageId = getUniqueId('assistant-msg');
    const div = document.createElement('div');
    div.id = messageId;
    div.className = 'message-bubble flex justify-start mb-6';
    
    div.innerHTML = `
        <div class="max-w-[85%] flex items-start gap-4 group relative">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm shadow-lg flex-shrink-0 z-10">
                ✨
            </div>
            <div class="flex-1 space-y-2 overflow-hidden relative min-w-0">
                <div class="message-content bg-dark-card border border-dark-border rounded-2xl rounded-tl-none px-5 py-4 shadow-sm select-text relative"></div>
                
                <button class="copy-btn absolute top-2 right-2 p-1.5 text-gray-400 hover:text-primary opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-gray-100 bg-white/80 backdrop-blur border border-gray-200 shadow-sm z-20" title="复制">
                    📋
                </button>
            </div>
        </div>
    `;
    
    // Attach event listener for copy
    const copyBtn = div.querySelector('.copy-btn');
    if (copyBtn) {
        copyBtn.onclick = () => {
            // Try to find the message text container
            const contentEl = div.querySelector('.message-text');
            const thinkingEl = div.querySelector('.thinking-section');
            
            let textToCopy = '';
            
            if (contentEl) {
                // If we have markdown content, get text
                textToCopy = contentEl.innerText;
            } else {
                // Fallback (e.g. while streaming or if structure differs)
                const container = div.querySelector('.message-content');
                // Exclude thinking section from copy if possible, or just copy everything
                // Let's clone and remove thinking to get just the response
                if (container) {
                    const clone = container.cloneNode(true);
                    const thinking = clone.querySelector('.thinking-section');
                    if (thinking) thinking.remove();
                    // Also remove tools? usually we want to copy the main text response
                    const tools = clone.querySelectorAll('.tool-result');
                    tools.forEach(t => t.remove());
                    
                    textToCopy = clone.innerText.trim();
                }
            }
            
            copyToClipboard(textToCopy, copyBtn);
        };
    }
    
    return div;
}

/**
 * Append text to a message (for streaming)
 */
function appendTextToMessage(messageEl, text) {
    if (!messageEl) return;
    
    let contentEl = messageEl.querySelector('.message-text');
    
    if (!contentEl) {
        // Create text container
        contentEl = document.createElement('div');
        contentEl.className = 'message-text markdown-content';
        
        const container = messageEl.querySelector('.message-content');
        if (container) {
            container.appendChild(contentEl);
        }
    }
    
    // Render markdown
    renderAndHighlight(text, contentEl);
}

/**
 * Add thinking section to message
 */
function addThinkingSection(messageEl, text) {
    if (!messageEl || !text) return;
    
    const container = messageEl.querySelector('.message-content');
    if (!container) return;
    
    // Check if thinking section already exists
    let thinkingEl = container.querySelector('.thinking-section');
    
    if (!thinkingEl) {
        thinkingEl = document.createElement('div');
        thinkingEl.className = 'thinking-section mb-4';
        thinkingEl.innerHTML = createCollapsible(
            '💭 思考过程...',
            `<div class="thinking-content text-gray-400 text-sm whitespace-pre-wrap font-mono bg-dark-bg p-3 rounded border border-dark-border select-text">${escapeHtml(text)}</div>`,
            true // Expanded by default for new thinking
        );
        container.insertBefore(thinkingEl, container.firstChild);
    } else {
        // Update existing thinking content
        const thinkingContent = thinkingEl.querySelector('.thinking-content');
        if (thinkingContent) {
            thinkingContent.textContent = text;
        }
    }
}

/**
 * Add tool result to message
 */
function addToolResult(messageEl, toolData) {
    if (!messageEl || !toolData) return;
    
    const container = messageEl.querySelector('.message-content');
    if (!container) return;
    
    const { tool, status, input, output, title, error, category } = toolData;
    
    // Create tool result element
    const toolId = getUniqueId('tool');
    const toolEl = document.createElement('div');
    toolEl.id = toolId;
    toolEl.className = `tool-result ${status} mb-3 rounded-lg overflow-hidden border border-dark-border bg-dark-bg`;
    toolEl.dataset.tool = tool;
    toolEl.dataset.status = status;
    if (category) toolEl.dataset.category = category;
    
    // Build details content
    let detailsContent = '<div class="tool-details p-3 space-y-3">';
    let hasContent = false;
    
    if (input && Object.keys(input).length > 0) {
        hasContent = true;
        detailsContent += '<div class="tool-input"><div class="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">输入参数</div><pre class="text-xs bg-dark-card p-2 rounded text-gray-300 overflow-x-auto border border-dark-border max-h-48 overflow-y-auto select-text">' + 
            escapeHtml(JSON.stringify(input, null, 2)) + '</pre></div>';
    }
    
    if (output) {
        hasContent = true;
        detailsContent += '<div class="tool-output"><div class="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">输出结果</div><pre class="text-xs bg-dark-card p-2 rounded text-gray-300 overflow-x-auto border border-dark-border max-h-64 overflow-y-auto whitespace-pre-wrap select-text">' + 
            escapeHtml(String(output).substring(0, 2000)) + 
            (String(output).length > 2000 ? '...\n(内容过长已截断)' : '') + 
            '</pre></div>';
    }
    
    if (error) {
        hasContent = true;
        detailsContent += '<div class="tool-error"><div class="text-xs text-red-500 mb-1 uppercase tracking-wider font-semibold">执行错误</div><div class="text-sm text-red-400 bg-red-900 bg-opacity-20 p-2 rounded border border-red-900 select-text">' + escapeHtml(error) + '</div></div>';
    }
    
    // Show status message if no content yet
    if (!hasContent) {
        if (status === 'pending') {
            detailsContent += '<div class="text-sm text-gray-500 italic">⏳ 等待执行...</div>';
        } else if (status === 'running') {
            detailsContent += '<div class="text-sm text-yellow-500 italic animate-pulse">⚙️ 正在执行中...</div>';
        } else {
            detailsContent += '<div class="text-sm text-gray-500 italic">暂无详细信息</div>';
        }
    }
    
    detailsContent += '</div>';
    
    // Status icon
    const statusIcon = {
        'pending': '⏳',
        'running': '⚙️',
        'completed': '✅',
        'failed': '❌'
    }[status] || '🔧';
    
    // Tool icon based on category
    const toolIcon = getToolIcon(tool);
    const displayTitle = title || `${tool}`;
    
    // Custom collapsible for tools to have better styling
    toolEl.innerHTML = `
        <div class="collapsible-header flex items-center justify-between px-3 py-2 bg-dark-card hover:bg-opacity-80 cursor-pointer transition-colors" onclick="toggleCollapsible('${toolId}-content')">
            <span class="font-medium text-sm flex items-center space-x-2 text-gray-300">
                <span>${statusIcon}</span>
                <span>${toolIcon}</span>
                <span>${escapeHtml(displayTitle)}</span>
            </span>
            <span class="collapsible-icon text-gray-500 text-xs">▼</span>
        </div>
        <div id="${toolId}-content" class="collapsible-content ${status === 'running' ? '' : 'hidden'} border-t border-dark-border">
            ${detailsContent}
        </div>
    `;
    
    container.appendChild(toolEl);
    
    return toolEl;
}

/**
 * Update tool status
 */
function updateToolStatus(toolEl, status, output = null, input = null, error = null) {
    if (!toolEl) return;
    
    toolEl.dataset.status = status;
    toolEl.className = `tool-result ${status} mb-3 rounded-lg overflow-hidden border border-dark-border bg-dark-bg`;
    
    // Update icon
    const statusIcon = {
        'pending': '⏳',
        'running': '⚙️',
        'completed': '✅',
        'failed': '❌'
    }[status] || '🔧';
    
    const headerIcon = toolEl.querySelector('.collapsible-header span span:first-child');
    if (headerIcon) headerIcon.textContent = statusIcon;
    
    const detailsDiv = toolEl.querySelector('.tool-details');
    if (!detailsDiv) return;
    
    // Update or add input
    if (input && Object.keys(input).length > 0) {
        let inputDiv = detailsDiv.querySelector('.tool-input');
        if (!inputDiv) {
            inputDiv = document.createElement('div');
            inputDiv.className = 'tool-input';
            detailsDiv.insertBefore(inputDiv, detailsDiv.firstChild);
        }
        inputDiv.innerHTML = '<div class="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">输入参数</div><pre class="text-xs bg-dark-card p-2 rounded text-gray-300 overflow-x-auto border border-dark-border max-h-48 overflow-y-auto select-text">' + 
            escapeHtml(JSON.stringify(input, null, 2)) + '</pre>';
    }
    
    // Update or add output
    if (output) {
        let outputDiv = detailsDiv.querySelector('.tool-output');
        if (!outputDiv) {
            outputDiv = document.createElement('div');
            outputDiv.className = 'tool-output';
            detailsDiv.appendChild(outputDiv);
        }
        outputDiv.innerHTML = '<div class="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">输出结果</div><pre class="text-xs bg-dark-card p-2 rounded text-gray-300 overflow-x-auto border border-dark-border max-h-64 overflow-y-auto whitespace-pre-wrap select-text">' + 
            escapeHtml(String(output).substring(0, 2000)) + 
            (String(output).length > 2000 ? '...\n(内容过长已截断)' : '') + 
            '</pre>';
    }
    
    // Update or add error
    if (error) {
        let errorDiv = detailsDiv.querySelector('.tool-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'tool-error';
            detailsDiv.appendChild(errorDiv);
        }
        errorDiv.innerHTML = '<div class="text-xs text-red-500 mb-1 uppercase tracking-wider font-semibold">执行错误</div><div class="text-sm text-red-400 bg-red-900 bg-opacity-20 p-2 rounded border border-red-900 select-text">' + escapeHtml(error) + '</div>';
    }
    
    // Remove placeholder text if we have content now
    const placeholder = detailsDiv.querySelector('.italic');
    if (placeholder && (input || output || error)) {
        placeholder.remove();
    }
}

/**
 * Add message footer (tokens, cost, etc.)
 * Note: Token display is disabled by user preference
 */
function addMessageFooter(messageEl, data) {
    if (!messageEl || !data) return;
    
    // Remove streaming indicator if present
    removeStreamingIndicator(messageEl);
}

// =============================================================================
// UI Components
// =============================================================================

/**
 * Create a project card
 */
function createProjectCard(project, onSelect, onDelete, onOpenFolder) {
    const div = document.createElement('div');
    div.className = 'project-card bg-white border-2 border-purple-100 rounded-3xl p-6 cursor-pointer hover:border-primary hover:shadow-lg transition-all group relative overflow-hidden';
    
    const createdDate = new Date(project.created * 1000).toLocaleDateString('zh-CN');
    
    div.innerHTML = `
        <div class="flex items-center gap-4 mb-4">
            <div class="w-14 h-14 rounded-2xl bg-purple-100 border-2 border-purple-200 flex items-center justify-center text-3xl shadow-sm transform group-hover:scale-110 transition-transform">
                🏰
            </div>
            <div class="flex-1 min-w-0">
                <h3 class="font-fun font-bold text-2xl text-primary truncate">${escapeHtml(project.name)}</h3>
                <div class="text-xs text-gray-400 font-bold mt-1">📅 ${createdDate}</div>
            </div>
            <button class="delete-btn text-gray-300 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50" title="删除城堡">
                ❌
            </button>
        </div>
        
        <div class="text-xs text-gray-500 truncate mb-6 font-mono bg-gray-50 p-3 rounded-xl border-2 border-dashed border-gray-200">
            📍 ${escapeHtml(project.path)}
        </div>
        
        <div class="flex gap-3">
            <button class="open-folder-btn flex-1 py-3 px-4 bg-yellow-100 text-yellow-700 rounded-xl hover:bg-yellow-200 border-2 border-yellow-300 font-bold transition-all flex items-center justify-center gap-2 transform hover:-translate-y-1 shadow-sm" title="打开文件夹">
                📂 打开文件夹
            </button>
            <div class="px-4 py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center shadow-md">
                ➡️
            </div>
        </div>
    `;
    
    // Add event handlers
    div.onclick = (e) => {
        // Only select if not clicking buttons
        if (!e.target.closest('button')) {
            onSelect(project);
        }
    };
    
    const deleteBtn = div.querySelector('.delete-btn');
    if (deleteBtn) {
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            onDelete(project);
        };
    }
    
    const openFolderBtn = div.querySelector('.open-folder-btn');
    if (openFolderBtn && onOpenFolder) {
        openFolderBtn.onclick = (e) => {
            e.stopPropagation();
            onOpenFolder(project);
        };
    }
    
    return div;
}

/**
 * Create a toast notification
 */
function createToast(message, type = 'info', duration = 3000) {
    const toastId = getUniqueId('toast');
    const div = document.createElement('div');
    div.id = toastId;
    div.className = `toast flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border backdrop-blur-md ${getToastClasses(type)}`;
    
    const icon = getToastIcon(type);
    
    div.innerHTML = `
        <span class="text-lg">${icon}</span>
        <span class="font-medium text-sm">${escapeHtml(message)}</span>
    `;
    
    // Add to container
    const container = document.getElementById('toast-container');
    if (container) {
        container.appendChild(div);
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                div.classList.add('removing');
                // Animation logic in CSS needs to handle 'removing' class
                div.style.opacity = '0';
                div.style.transform = 'translateY(20px)';
                setTimeout(() => div.remove(), 300);
            }, duration);
        }
    }
    
    return div;
}

function getToastClasses(type) {
    const classes = {
        'info': 'bg-blue-900/90 border-blue-700 text-blue-100',
        'success': 'bg-green-900/90 border-green-700 text-green-100',
        'error': 'bg-red-900/90 border-red-700 text-red-100',
        'warning': 'bg-yellow-900/90 border-yellow-700 text-yellow-100'
    };
    return classes[type] || classes.info;
}

function getToastIcon(type) {
    const icons = {
        'info': 'ℹ️',
        'success': '✅',
        'error': '❌',
        'warning': '⚠️'
    };
    return icons[type] || icons.info;
}

/**
 * Create file preview
 */
function createFilePreview(file, onRemove) {
    const div = document.createElement('div');
    div.className = 'file-preview relative inline-block bg-dark-card border border-dark-border rounded-lg group overflow-hidden';
    
    if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.className = 'h-16 w-16 object-cover';
        div.appendChild(img);
    } else {
        div.innerHTML = `
            <div class="h-16 w-16 flex flex-col items-center justify-center p-2 text-center">
                <span class="text-xl mb-1">📄</span>
                <span class="text-[8px] leading-tight text-gray-400 truncate w-full">${escapeHtml(file.name)}</span>
            </div>
        `;
    }
    
    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity';
    removeBtn.textContent = '×';
    removeBtn.onclick = (e) => {
        e.stopPropagation();
        div.remove();
        if (onRemove) onRemove(file);
    };
    div.appendChild(removeBtn);
    
    return div;
}

/**
 * Create collapsible section
 */
function createCollapsible(title, content, expanded = false) {
    const id = getUniqueId('collapsible');
    
    return `
        <div class="collapsible">
            <div class="collapsible-header flex items-center gap-2 p-2 rounded hover:bg-dark-bg/50 transition-colors cursor-pointer text-sm font-medium text-gray-400 select-none" onclick="toggleCollapsible('${id}')">
                <span class="collapsible-icon transform transition-transform ${expanded ? 'rotate-90' : ''}">▶</span>
                <span>${title}</span>
            </div>
            <div id="${id}" class="collapsible-content ${expanded ? '' : 'hidden'} pl-5 mt-1">
                ${content}
            </div>
        </div>
    `;
}

/**
 * Toggle collapsible section
 */
function toggleCollapsible(id) {
    const content = document.getElementById(id);
    if (!content) return;
    
    const header = content.previousElementSibling;
    const icon = header?.querySelector('.collapsible-icon');
    
    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        if (icon) icon.classList.add('rotate-90');
    } else {
        content.classList.add('hidden');
        if (icon) icon.classList.remove('rotate-90');
    }
}

// =============================================================================
// Anime Quotes for Streaming Indicator
// =============================================================================

const ANIME_QUOTES = [
    // 火影忍者 🍥
    { quote: "🔥 我要成为火影！", anime: "火影忍者", char: "漩涡鸣人" },
    { quote: "💪 我的忍道，绝不退缩！", anime: "火影忍者", char: "漩涡鸣人" },
    { quote: "🤝 羁绊是最强的力量。", anime: "火影忍者", char: "卡卡西" },
    // 海贼王 🏴‍☠️
    { quote: "👑 我是要成为海贼王的男人！", anime: "海贼王", char: "路飞" },
    { quote: "✨ 人的梦想是不会结束的！", anime: "海贼王", char: "黑胡子" },
    { quote: "🤜 男子汉，说到做到！", anime: "海贼王", char: "路飞" },
    // 进击的巨人 ⚔️
    { quote: "😱 那一天，人类终于回想起了被巨人支配的恐惧。", anime: "进击的巨人", char: "旁白" },
    { quote: "⚔️ 如果不战斗就无法生存！", anime: "进击的巨人", char: "艾伦" },
    { quote: "❤️ 献出你的心脏！", anime: "进击的巨人", char: "艾尔文" },
    // 鬼灭之刃 🗡️
    { quote: "⚡ 生杀予夺の権を他人に握らせるな！", anime: "鬼灭之刃", char: "富冈义勇" },
    { quote: "🛡️ 我绝不会让任何人再死去！", anime: "鬼灭之刃", char: "炭治郎" },
    { quote: "🌊 全集中呼吸！", anime: "鬼灭之刃", char: "炭治郎" },
    // 龙珠 🐉
    { quote: "😤 战斗力只有5的渣渣。", anime: "龙珠", char: "拉蒂兹" },
    { quote: "⚡ 我是超级赛亚人孙悟空！", anime: "龙珠", char: "孙悟空" },
    { quote: "💥 龟派气功！", anime: "龙珠", char: "孙悟空" },
    // 死神 💀
    { quote: "🌸 我的骄傲，你永远不会明白。", anime: "死神", char: "朽木白哉" },
    { quote: "🗡️ 我要保护的东西，已经不再是你了。", anime: "死神", char: "黑崎一护" },
    { quote: "⚔️ 卍解！", anime: "死神", char: "黑崎一护" },
    // 银魂 🍡
    { quote: "⚔️ 我的剑所到之处，就是我的国家。", anime: "银魂", char: "坂田银时" },
    { quote: "💪 就算被打倒一百次，也要站起来一百零一次。", anime: "银魂", char: "坂田银时" },
    { quote: "🍰 糖分是大脑的养料！", anime: "银魂", char: "坂田银时" },
    // 钢之炼金术师 ⚗️
    { quote: "⚖️ 等价交换，这就是炼金术的基本原则。", anime: "钢之炼金术师", char: "爱德华" },
    { quote: "🚶 站起来，向前走，你还有双完好的腿。", anime: "钢之炼金术师", char: "爱德华" },
    { quote: "💔 人没有牺牲就什么都得不到。", anime: "钢之炼金术师", char: "爱德华" },
    // 新世纪福音战士 🤖
    { quote: "😰 逃げちゃダメだ、逃げちゃダメだ...", anime: "EVA", char: "碇真嗣" },
    { quote: "❓ 我是谁？", anime: "EVA", char: "绫波丽" },
    { quote: "🚫 你不能逃避！", anime: "EVA", char: "葛城美里" },
    // 灌篮高手 🏀
    { quote: "🏀 教练，我想打篮球。", anime: "灌篮高手", char: "三井寿" },
    { quote: "🌟 我是天才！", anime: "灌篮高手", char: "樱木花道" },
    { quote: "✋ 左手只是辅助。", anime: "灌篮高手", char: "樱木花道" },
    // 名侦探柯南 🔍
    { quote: "☝️ 真相只有一个！", anime: "名侦探柯南", char: "江户川柯南" },
    { quote: "🔎 以我的名义，推理将揭开真相。", anime: "名侦探柯南", char: "工藤新一" },
    { quote: "👉 犯人就是你！", anime: "名侦探柯南", char: "柯南" },
    // 东京喰种 🦇
    { quote: "🌑 这个世界是错误的。", anime: "东京喰种", char: "金木研" },
    { quote: "🎭 我既不是人类，也不是喰种。", anime: "东京喰种", char: "金木研" },
    { quote: "🔢 1000减7等于多少？", anime: "东京喰种", char: "壁虎" },
    // 咒术回战 👁️
    { quote: "🌀 领域展开！", anime: "咒术回战", char: "五条悟" },
    { quote: "👑 我是最强的。", anime: "咒术回战", char: "五条悟" },
    { quote: "👊 不虚此行！", anime: "咒术回战", char: "虎杖悠仁" },
    // 我的英雄学院 🦸
    { quote: "💪 Plus Ultra！", anime: "我的英雄学院", char: "欧尔麦特" },
    { quote: "⭐ 你可以成为英雄！", anime: "我的英雄学院", char: "欧尔麦特" },
    { quote: "🔥 我要成为最强的英雄！", anime: "我的英雄学院", char: "绿谷出久" },
    // 刀剑神域 ⚔️
    { quote: "💀 在这个世界里，死亡就是真正的死亡。", anime: "刀剑神域", char: "茅场晶彦" },
    { quote: "🛡️ 我会保护你的！", anime: "刀剑神域", char: "桐人" },
    { quote: "⚡ 星爆气流斩！", anime: "刀剑神域", char: "桐人" },
    // 命运系列 ⚔️
    { quote: "👸 我是英灵Saber！", anime: "Fate", char: "Saber" },
    { quote: "🤝 我以我之名起誓。", anime: "Fate", char: "卫宫士郎" },
    { quote: "💎 王之财宝！", anime: "Fate", char: "吉尔伽美什" },
    // Re:从零开始 🔄
    { quote: "🌟 从零开始的异世界生活。", anime: "Re:从零开始", char: "菜月昴" },
    { quote: "💕 我爱艾米莉亚。", anime: "Re:从零开始", char: "菜月昴" },
    { quote: "💀 死亡回归！", anime: "Re:从零开始", char: "菜月昴" },
    // 约定的梦幻岛 🏠
    { quote: "🏃 我们一定会逃出去！", anime: "约定的梦幻岛", char: "艾玛" },
    { quote: "✨ 永远不要放弃希望。", anime: "约定的梦幻岛", char: "艾玛" },
    { quote: "👨‍👩‍👧‍👦 全员逃脱！", anime: "约定的梦幻岛", char: "诺曼" },
    // 辉夜大小姐 💕
    { quote: "😅 今天也没能让对方告白呢。", anime: "辉夜大小姐", char: "旁白" },
    { quote: "🎀 可爱即是正义！", anime: "辉夜大小姐", char: "藤原千花" },
    { quote: "⚔️ 恋爱即是战争！", anime: "辉夜大小姐", char: "旁白" },
    // 间谍过家家 🕵️
    { quote: "🕵️ 这就是间谍的工作。", anime: "间谍过家家", char: "黄昏" },
    { quote: "🥜 哇酷哇酷！", anime: "间谍过家家", char: "阿尼亚" },
    { quote: "🌍 世界和平！", anime: "间谍过家家", char: "阿尼亚" },
    // 电锯人 🪚
    { quote: "💕 我的梦想是和女孩子交往！", anime: "电锯人", char: "电次" },
    { quote: "🪚 这就是电锯人！", anime: "电锯人", char: "电次" },
    { quote: "📝 契约成立！", anime: "电锯人", char: "玛奇玛" },
    // 排球少年 🏐
    { quote: "🏐 只要球没落地，比赛就没结束！", anime: "排球少年", char: "日向翔阳" },
    { quote: "🦅 我要飞得更高！", anime: "排球少年", char: "日向翔阳" },
    { quote: "🔥 再来一球！", anime: "排球少年", char: "影山飞雄" },
    // 工作细胞 🩸
    { quote: "🩸 红血球的工作就是运送氧气！", anime: "工作细胞", char: "红血球" },
    { quote: "🔪 杀菌！", anime: "工作细胞", char: "白血球" },
    { quote: "🫀 这里是人体内部。", anime: "工作细胞", char: "旁白" },
    // 紫罗兰永恒花园 💜
    { quote: "💕 我想知道'爱'是什么。", anime: "紫罗兰永恒花园", char: "薇尔莉特" },
    { quote: "✉️ 我会替你传达心意。", anime: "紫罗兰永恒花园", char: "薇尔莉特" },
    { quote: "✉️ 自动手记人偶，为您服务。", anime: "紫罗兰永恒花园", char: "薇尔莉特" },
    // 你的名字 🌠
    { quote: "❓ 你的名字是？", anime: "你的名字", char: "立花的泷" },
    { quote: "🌍 不管你在世界的哪个角落，我一定会去见你。", anime: "你的名字", char: "宫水三叶" },
    { quote: "🌅 黄昏之时。", anime: "你的名字", char: "旁白" },
    // 千与千寻 🐉
    { quote: "🚫 不要回头看。", anime: "千与千寻", char: "白龙" },
    { quote: "💭 曾经发生的事不可能忘记，只是想不起来而已。", anime: "千与千寻", char: "钱婆婆" },
    { quote: "👧 我叫千寻！", anime: "千与千寻", char: "千寻" },
    // 天气之子 🌤️
    { quote: "☀️ 我想让天空放晴！", anime: "天气之子", char: "阳菜" },
    { quote: "🌧️ 世界的形状，已经改变了。", anime: "天气之子", char: "帆高" },
    { quote: "🌈 晴天少女！", anime: "天气之子", char: "阳菜" },
    // 铃芽之旅 🚪
    { quote: "🚪 我要关上那扇门！", anime: "铃芽之旅", char: "铃芽" },
    { quote: "🪑 椅子先生！", anime: "铃芽之旅", char: "铃芽" },
    { quote: "🌌 常世的门。", anime: "铃芽之旅", char: "旁白" },
    // 一拳超人 👊
    { quote: "👨‍🦲 我秃了，也变强了。", anime: "一拳超人", char: "埼玉" },
    { quote: "👊 认真系列：认真一拳！", anime: "一拳超人", char: "埼玉" },
    { quote: "🦸 兴趣使然的英雄。", anime: "一拳超人", char: "埼玉" },
    // 怪兽8号 👹
    { quote: "🛡️ 我要成为日本防卫队员！", anime: "怪兽8号", char: "日比野卡夫卡" },
    { quote: "👹 怪兽8号，出击！", anime: "怪兽8号", char: "日比野卡夫卡" },
    { quote: "⚔️ 讨伐怪兽！", anime: "怪兽8号", char: "亚白米娜" },
    // 葬送的芙莉莲 🧝
    { quote: "⏳ 人类的寿命真的很短呢。", anime: "葬送的芙莉莲", char: "芙莉莲" },
    { quote: "🤔 我想更了解人类。", anime: "葬送的芙莉莲", char: "芙莉莲" },
    { quote: "✨ 魔法是很美丽的。", anime: "葬送的芙莉莲", char: "芙莉莲" },
    // 更多动漫
    { quote: "🎮 游戏人生，永不言败！", anime: "游戏人生", char: "空白" },
    { quote: "🎲 一切都按计划进行。", anime: "死亡笔记", char: "夜神月" },
    { quote: "📓 我要创造一个没有犯罪的新世界！", anime: "死亡笔记", char: "夜神月" },
    { quote: "🍜 拉面是世界上最好吃的食物！", anime: "火影忍者", char: "鸣人" },
    { quote: "🌙 月亮真美啊。", anime: "日本文学", char: "夏目漱石" },
    // English Scenes - Disney 🏰
    { quote: "🦁 Remember who you are.", anime: "The Lion King", char: "Mufasa" },
    { quote: "❄️ Let it go, let it go!", anime: "Frozen", char: "Elsa" },
    { quote: "🧞 You ain't never had a friend like me!", anime: "Aladdin", char: "Genie" },
    { quote: "🐠 Just keep swimming!", anime: "Finding Nemo", char: "Dory" },
    { quote: "🚀 To infinity and beyond!", anime: "Toy Story", char: "Buzz Lightyear" },
    // English Scenes - Harry Potter ⚡
    { quote: "⚡ You're a wizard, Harry!", anime: "Harry Potter", char: "Hagrid" },
    { quote: "📚 It's LeviOsa, not LevioSA!", anime: "Harry Potter", char: "Hermione" },
    { quote: "✨ Expecto Patronum!", anime: "Harry Potter", char: "Harry Potter" },
    { quote: "🦌 After all this time? Always.", anime: "Harry Potter", char: "Snape" },
    { quote: "🪄 I solemnly swear that I am up to no good.", anime: "Harry Potter", char: "Marauders" },
    // English Scenes - Marvel Heroes 🦸
    { quote: "💪 I can do this all day.", anime: "Captain America", char: "Steve Rogers" },
    { quote: "🔨 I am Thor, son of Odin!", anime: "Thor", char: "Thor" },
    { quote: "🕷️ With great power comes great responsibility.", anime: "Spider-Man", char: "Uncle Ben" },
    { quote: "🤖 I am Iron Man.", anime: "Iron Man", char: "Tony Stark" },
    { quote: "💚 Hulk smash!", anime: "Avengers", char: "Hulk" },
];

let currentQuoteIndex = 0;
let quoteInterval = null;

/**
 * Get a random anime quote
 */
function getRandomAnimeQuote() {
    const randomIndex = Math.floor(Math.random() * ANIME_QUOTES.length);
    return ANIME_QUOTES[randomIndex];
}

/**
 * Get next anime quote (sequential with wrap)
 */
function getNextAnimeQuote() {
    const quote = ANIME_QUOTES[currentQuoteIndex];
    currentQuoteIndex = (currentQuoteIndex + 1) % ANIME_QUOTES.length;
    return quote;
}

/**
 * Create streaming indicator with anime quote
 */
function createStreamingIndicator() {
    const quote = getRandomAnimeQuote();
    const indicatorId = getUniqueId('streaming');
    
    const div = document.createElement('div');
    div.id = indicatorId;
    div.className = 'streaming-indicator flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg border border-purple-500/30 mb-3';
    
    div.innerHTML = `
        <div class="streaming-dots flex gap-1">
            <span class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
            <span class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
            <span class="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
        </div>
        <div class="streaming-quote flex-1 min-w-0">
            <div class="quote-text text-sm text-gray-300 italic truncate">"${escapeHtml(quote.quote)}"</div>
            <div class="quote-source text-xs text-gray-500 truncate">—— ${escapeHtml(quote.char)} 《${escapeHtml(quote.anime)}》</div>
        </div>
    `;
    
    return div;
}

/**
 * Add streaming indicator to message (always at the bottom)
 */
function addStreamingIndicator(messageEl) {
    if (!messageEl) return null;
    
    const container = messageEl.querySelector('.message-content');
    if (!container) return null;
    
    // Remove existing indicator if any
    removeStreamingIndicator(messageEl);
    
    const indicator = createStreamingIndicator();
    // Always append at the end so it's always visible at the bottom
    container.appendChild(indicator);
    
    // Start quote rotation
    startQuoteRotation(indicator);
    
    return indicator;
}

/**
 * Move streaming indicator to the bottom of the message
 * Call this after adding new content (tools, questions, etc.)
 */
function moveStreamingIndicatorToBottom(messageEl) {
    if (!messageEl) return;
    
    const container = messageEl.querySelector('.message-content');
    if (!container) return;
    
    const indicator = container.querySelector('.streaming-indicator');
    if (indicator) {
        // Move to the end
        container.appendChild(indicator);
    }
}

/**
 * Remove streaming indicator from message
 */
function removeStreamingIndicator(messageEl) {
    if (!messageEl) return;
    
    const indicator = messageEl.querySelector('.streaming-indicator');
    if (indicator) {
        stopQuoteRotation();
        indicator.remove();
    }
}

/**
 * Start rotating quotes
 */
function startQuoteRotation(indicatorEl) {
    stopQuoteRotation(); // Clear any existing interval
    
    quoteInterval = setInterval(() => {
        if (!indicatorEl || !document.body.contains(indicatorEl)) {
            stopQuoteRotation();
            return;
        }
        
        const quote = getNextAnimeQuote();
        const quoteText = indicatorEl.querySelector('.quote-text');
        const quoteSource = indicatorEl.querySelector('.quote-source');
        
        if (quoteText && quoteSource) {
            // Fade out
            indicatorEl.querySelector('.streaming-quote').style.opacity = '0';
            
            setTimeout(() => {
                quoteText.textContent = `"${quote.quote}"`;
                quoteSource.textContent = `—— ${quote.char} 《${quote.anime}》`;
                // Fade in
                indicatorEl.querySelector('.streaming-quote').style.opacity = '1';
            }, 300);
        }
    }, 4000); // Change quote every 4 seconds
}

/**
 * Stop rotating quotes
 */
function stopQuoteRotation() {
    if (quoteInterval) {
        clearInterval(quoteInterval);
        quoteInterval = null;
    }
}

// =============================================================================
// Subagent Components (TUI-like display)
// =============================================================================

/**
 * Render subagent panel content HTML
 */
function renderSubagentContent(subagentData) {
    const { status, output, error, parsed, toolSummary } = subagentData;
    
    // Get tools from parsed data or toolSummary
    let tools = parsed?.tools || toolSummary?.tools || [];
    let files = parsed?.files_read || parsed?.files_written || toolSummary?.files || [];
    const summary = parsed?.summary || toolSummary?.summary || '';
    
    // Parse toolSummary list if available (real-time data)
    if (toolSummary?.list && Array.isArray(toolSummary.list)) {
        const toolSet = new Set(tools);
        const fileSet = new Set(files);
        
        toolSummary.list.forEach(item => {
            if (item.tool) toolSet.add(item.tool);
            // Extract filename from title if it looks like a path
            if ((item.tool === 'read' || item.tool === 'write') && item.state?.title) {
                // Simple check if it's a file path
                if (item.state.title.includes('.') || item.state.title.includes('/') || item.state.title.includes('\\')) {
                    fileSet.add(item.state.title);
                }
            }
        });
        
        tools = Array.from(toolSet);
        files = Array.from(fileSet);
    }
    
    // Build tools display
    let toolsHtml = '';
    if (tools.length > 0) {
        toolsHtml = `
            <div class="mt-3">
                <div class="text-xs text-gray-500 mb-1.5 uppercase tracking-wider font-semibold">使用的工具</div>
                <div class="flex flex-wrap gap-1.5">
                    ${tools.map(tool => `
                        <span class="px-2 py-1 bg-dark-card rounded text-xs text-gray-300 border border-dark-border flex items-center gap-1">
                            ${getToolIcon(tool)} ${escapeHtml(tool)}
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Build files display
    let filesHtml = '';
    if (files.length > 0) {
        filesHtml = `
            <div class="mt-3">
                <div class="text-xs text-gray-500 mb-1.5 uppercase tracking-wider font-semibold">涉及的文件</div>
                <div class="flex flex-wrap gap-1.5">
                    ${files.slice(0, 5).map(file => `
                        <span class="px-2 py-0.5 bg-dark-card rounded text-xs text-gray-400 font-mono border border-dark-border truncate max-w-[200px]" title="${escapeHtml(file)}">
                            📄 ${escapeHtml(file.split('/').pop())}
                        </span>
                    `).join('')}
                    ${files.length > 5 ? `<span class="text-xs text-gray-500">+${files.length - 5} 更多</span>` : ''}
                </div>
            </div>
        `;
    }
    
    // Build output display
    let outputHtml = '';
    if (output && (status === 'completed' || status === 'failed')) {
        const displayOutput = output.length > 800 ? output.substring(0, 800) + '...\n(内容已截断)' : output;
        outputHtml = `
            <div class="mt-3">
                <div class="text-xs text-gray-500 mb-1.5 uppercase tracking-wider font-semibold">执行结果</div>
                <pre class="text-xs bg-dark-card p-3 rounded text-gray-300 overflow-x-auto max-h-48 overflow-y-auto border border-dark-border font-mono whitespace-pre-wrap select-text">${escapeHtml(displayOutput)}</pre>
            </div>
        `;
    }
    
    // Build error display
    let errorHtml = '';
    if (error) {
        errorHtml = `
            <div class="mt-3">
                <div class="text-xs text-red-500 mb-1.5 uppercase tracking-wider font-semibold">错误信息</div>
                <div class="text-sm text-red-400 bg-red-900/20 p-2 rounded border border-red-900/50 select-text">${escapeHtml(error)}</div>
            </div>
        `;
    }
    
    return `
        ${summary ? `<div class="text-sm text-gray-400 mb-2">${escapeHtml(summary)}</div>` : ''}
        ${toolsHtml}
        ${filesHtml}
        ${outputHtml}
        ${errorHtml}
    `;
}

/**
 * Create a Subagent Panel (collapsible display for task tool / subagent)
 * Shows subagent type, description, tool usage, and output
 */
function createSubagentPanel(subagentData) {
    const { 
        id,
        status, 
        subagentType, 
        description, 
        toolSummary, 
        output,
        parsed,
        error 
    } = subagentData;
    
    const panelId = id || getUniqueId('subagent');
    
    // Status styling
    const statusConfig = {
        'pending': { icon: '⏳', borderClass: 'border-l-gray-500', bgClass: 'bg-gray-900/20' },
        'running': { icon: '🔄', borderClass: 'border-l-yellow-500', bgClass: 'bg-yellow-900/10', animate: true },
        'completed': { icon: '✅', borderClass: 'border-l-green-500', bgClass: 'bg-green-900/10' },
        'failed': { icon: '❌', borderClass: 'border-l-red-500', bgClass: 'bg-red-900/10' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    
    const div = document.createElement('div');
    div.id = panelId;
    div.className = `subagent-panel mb-3 rounded-lg overflow-hidden border-l-4 ${config.borderClass} ${config.bgClass} border border-dark-border ${config.animate ? 'subagent-running' : ''}`;
    div.dataset.subagentId = panelId;
    div.dataset.status = status;
    
    // Get tools from parsed data or toolSummary for header count
    let toolsCount = parsed?.tools?.length || toolSummary?.tools?.length || 0;
    if (toolSummary?.list && Array.isArray(toolSummary.list)) {
        const toolSet = new Set();
        toolSummary.list.forEach(item => { if (item.tool) toolSet.add(item.tool); });
        toolsCount = toolSet.size;
    }
    
    const contentHtml = renderSubagentContent(subagentData);
    
    div.innerHTML = `
        <div class="collapsible-header flex items-center justify-between px-4 py-3 bg-dark-card/50 cursor-pointer hover:bg-dark-card/80 transition-colors" 
             onclick="toggleCollapsible('${panelId}-content')">
            <div class="flex items-center gap-3">
                <span class="text-lg ${config.animate ? 'animate-spin-slow' : ''}">${config.icon}</span>
                <div>
                    <span class="font-medium text-sm text-gray-200">📦 Subagent: ${escapeHtml(subagentType || 'general')}</span>
                    ${description ? `<div class="text-xs text-gray-500 mt-0.5 truncate max-w-[400px]">${escapeHtml(description)}</div>` : ''}
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-xs text-gray-500 bg-dark-bg px-2 py-0.5 rounded tools-count">${toolsCount > 0 ? `${toolsCount} 工具` : ''}</span>
                <span class="collapsible-icon text-gray-500 text-xs transition-transform">▼</span>
            </div>
        </div>
        <div id="${panelId}-content" class="collapsible-content hidden p-4 border-t border-dark-border">
            ${contentHtml}
        </div>
    `;
    
    return div;
}

/**
 * Update an existing subagent panel status
 */
function updateSubagentPanel(panelEl, subagentData) {
    if (!panelEl || !subagentData) return;
    
    const { status } = subagentData;
    
    // Update status class
    panelEl.dataset.status = status;
    
    // Remove old status classes
    panelEl.classList.remove('border-l-gray-500', 'border-l-yellow-500', 'border-l-green-500', 'border-l-red-500');
    panelEl.classList.remove('bg-gray-900/20', 'bg-yellow-900/10', 'bg-green-900/10', 'bg-red-900/10');
    panelEl.classList.remove('subagent-running');
    
    // Add new status classes
    const statusConfig = {
        'pending': { borderClass: 'border-l-gray-500', bgClass: 'bg-gray-900/20' },
        'running': { borderClass: 'border-l-yellow-500', bgClass: 'bg-yellow-900/10', animate: true },
        'completed': { borderClass: 'border-l-green-500', bgClass: 'bg-green-900/10' },
        'failed': { borderClass: 'border-l-red-500', bgClass: 'bg-red-900/10' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    panelEl.classList.add(config.borderClass, config.bgClass);
    if (config.animate) panelEl.classList.add('subagent-running');
    
    // Update icon
    const iconEl = panelEl.querySelector('.collapsible-header span:first-child');
    if (iconEl) {
        const icons = { 'pending': '⏳', 'running': '🔄', 'completed': '✅', 'failed': '❌' };
        iconEl.textContent = icons[status] || '📦';
        iconEl.classList.toggle('animate-spin-slow', status === 'running');
    }
    
    // Update content (re-render)
    const contentId = panelEl.id + '-content';
    const contentEl = document.getElementById(contentId);
    if (contentEl) {
        contentEl.innerHTML = renderSubagentContent(subagentData);
    }
    
    // Update tools count badge
    const toolsCountBadge = panelEl.querySelector('.tools-count');
    if (toolsCountBadge) {
        let toolsCount = 0;
        if (subagentData.toolSummary?.list && Array.isArray(subagentData.toolSummary.list)) {
            const toolSet = new Set();
            subagentData.toolSummary.list.forEach(item => { if (item.tool) toolSet.add(item.tool); });
            toolsCount = toolSet.size;
        } else if (subagentData.parsed?.tools) {
            toolsCount = subagentData.parsed.tools.length;
        }
        toolsCountBadge.textContent = toolsCount > 0 ? `${toolsCount} 工具` : '';
    }
    
    // If completed or failed, expand
    if (status === 'completed' || status === 'failed') {
        if (contentEl && contentEl.classList.contains('hidden')) {
            contentEl.classList.remove('hidden');
            const icon = panelEl.querySelector('.collapsible-icon');
            if (icon) icon.classList.add('rotate-90');
        }
    }
}

/**
 * Get tool icon based on tool name
 */
function getToolIcon(toolName) {
    const icons = {
        'bash': '💻',
        'read': '📖',
        'write': '📝',
        'edit': '✏️',
        'grep': '🔍',
        'glob': '📂',
        'task': '📦'
    };
    return icons[toolName?.toLowerCase()] || '🔧';
}

/**
 * Create a Progress Tracker panel
 * Shows task progress, TODO list, and completion status
 */
function createProgressTracker(steps = [], options = {}) {
    const trackerId = options.id || getUniqueId('progress');
    const title = options.title || '📋 任务进度';
    const position = options.position || 'fixed'; // 'fixed' or 'inline'
    
    const div = document.createElement('div');
    div.id = trackerId;
    
    if (position === 'fixed') {
        div.className = 'progress-tracker fixed top-20 right-6 w-72 bg-dark-card border border-dark-border rounded-xl shadow-2xl z-40';
    } else {
        div.className = 'progress-tracker w-full bg-dark-card border border-dark-border rounded-xl shadow-lg';
    }
    
    // Calculate progress
    const completedCount = steps.filter(s => s.status === 'completed').length;
    const totalCount = steps.length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    // Build steps HTML
    let stepsHtml = '';
    if (steps.length > 0) {
        stepsHtml = steps.map(step => {
            const statusConfig = {
                'completed': { icon: '✅', textClass: 'text-green-400', lineClass: 'bg-green-500' },
                'running': { icon: '⏳', textClass: 'text-yellow-400', lineClass: 'bg-yellow-500' },
                'failed': { icon: '❌', textClass: 'text-red-400', lineClass: 'bg-red-500' },
                'pending': { icon: '○', textClass: 'text-gray-500', lineClass: 'bg-gray-600' }
            };
            const config = statusConfig[step.status] || statusConfig.pending;
            
            return `
                <div class="flex items-start gap-3 py-2 ${config.textClass}">
                    <span class="flex-shrink-0 mt-0.5">${config.icon}</span>
                    <div class="flex-1 min-w-0">
                        <div class="text-sm truncate">${escapeHtml(step.name)}</div>
                        ${step.description ? `<div class="text-xs text-gray-500 truncate">${escapeHtml(step.description)}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    } else {
        stepsHtml = '<div class="text-xs text-gray-500 py-4 text-center">暂无步骤</div>';
    }
    
    div.innerHTML = `
        <div class="px-4 py-3 border-b border-dark-border flex items-center justify-between bg-dark-bg/50 rounded-t-xl">
            <span class="text-sm font-semibold text-gray-200">${title}</span>
            ${position === 'fixed' ? `
                <button onclick="this.closest('.progress-tracker').remove()" class="text-gray-500 hover:text-white transition-colors text-lg leading-none">&times;</button>
            ` : ''}
        </div>
        <div class="p-4">
            <div class="flex items-center gap-3 mb-4">
                <div class="flex-1 h-2.5 bg-dark-bg rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-blue-500 to-primary transition-all duration-500 ease-out rounded-full" style="width: ${percentage}%"></div>
                </div>
                <span class="text-sm font-mono text-gray-400 min-w-[3rem] text-right">${percentage}%</span>
            </div>
            <div class="space-y-1 max-h-64 overflow-y-auto pr-1">
                ${stepsHtml}
            </div>
            ${totalCount > 0 ? `
                <div class="mt-3 pt-3 border-t border-dark-border text-xs text-gray-500 text-center">
                    ${completedCount} / ${totalCount} 步骤完成
                </div>
            ` : ''}
        </div>
    `;
    
    return div;
}

/**
 * Update progress tracker with new steps
 */
function updateProgressTracker(trackerId, steps) {
    const tracker = document.getElementById(trackerId);
    if (!tracker) return;
    
    // Calculate new progress
    const completedCount = steps.filter(s => s.status === 'completed').length;
    const totalCount = steps.length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    // Update progress bar
    const progressBar = tracker.querySelector('.bg-gradient-to-r');
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }
    
    // Update percentage text
    const percentText = tracker.querySelector('.font-mono');
    if (percentText) {
        percentText.textContent = `${percentage}%`;
    }
    
    // Update steps (rebuild the steps HTML)
    const stepsContainer = tracker.querySelector('.space-y-1');
    if (stepsContainer && steps.length > 0) {
        stepsContainer.innerHTML = steps.map(step => {
            const statusConfig = {
                'completed': { icon: '✅', textClass: 'text-green-400' },
                'running': { icon: '⏳', textClass: 'text-yellow-400' },
                'failed': { icon: '❌', textClass: 'text-red-400' },
                'pending': { icon: '○', textClass: 'text-gray-500' }
            };
            const config = statusConfig[step.status] || statusConfig.pending;
            
            return `
                <div class="flex items-start gap-3 py-2 ${config.textClass}">
                    <span class="flex-shrink-0 mt-0.5">${config.icon}</span>
                    <div class="flex-1 min-w-0">
                        <div class="text-sm truncate">${escapeHtml(step.name)}</div>
                        ${step.description ? `<div class="text-xs text-gray-500 truncate">${escapeHtml(step.description)}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Update footer
    const footer = tracker.querySelector('.border-t.text-xs');
    if (footer && totalCount > 0) {
        footer.textContent = `${completedCount} / ${totalCount} 步骤完成`;
    }
}

/**
 * Add subagent panel to a message
 */
function addSubagentToMessage(messageEl, subagentData) {
    if (!messageEl || !subagentData) return null;
    
    const container = messageEl.querySelector('.message-content');
    if (!container) return null;
    
    const panel = createSubagentPanel(subagentData);
    container.appendChild(panel);
    
    return panel;
}

// =============================================================================
// Questionnaire Component
// =============================================================================

/**
 * Create a questionnaire element
 * @param {Object} data - The questionnaire data (e.g. { questions: [...] })
 * @param {Function} onSubmit - Callback function with (answers) => void
 */
function createQuestionnaire(data, onSubmit) {
    const containerId = getUniqueId('questionnaire');
    const container = document.createElement('div');
    container.id = containerId;
    container.className = 'bg-dark-card border border-dark-border rounded-2xl p-6 shadow-sm space-y-6 max-w-2xl mx-auto';
    
    // Header if needed, though usually handled by message text
    // if (data.title) ...

    if (data.questions && Array.isArray(data.questions)) {
        data.questions.forEach((q, qIndex) => {
            const fieldset = document.createElement('fieldset');
            fieldset.className = 'space-y-3';
            
            // Header
            if (q.header) {
                const legend = document.createElement('legend');
                legend.className = 'font-fun font-bold text-lg text-primary mb-2 flex items-center gap-2';
                legend.innerHTML = `<span>${qIndex + 1}.</span> ${escapeHtml(q.header)}`;
                fieldset.appendChild(legend);
            }
            
            // Question Text
            if (q.question) {
                const p = document.createElement('p');
                p.className = 'text-sm text-text-muted mb-3 font-medium';
                p.textContent = q.question;
                fieldset.appendChild(p);
            }
            
            // Options Container or Input Field
            let optionsContainer;

            if (q.options && q.options.length > 0) {
                // Multiple choice options
                optionsContainer = document.createElement('div');
                optionsContainer.className = 'grid grid-cols-1 md:grid-cols-2 gap-3';

                q.options.forEach((opt, oIndex) => {
                    const optionId = `${containerId}-q${qIndex}-opt${oIndex}`;
                    const inputType = q.multiple ? 'checkbox' : 'radio';
                    const inputName = `${containerId}-q${qIndex}`;
                    
                    const label = document.createElement('label');
                    label.className = 'relative flex items-start p-3 rounded-xl border-2 border-transparent bg-dark-bg cursor-pointer hover:border-purple-200 transition-all group';
                    
                    const input = document.createElement('input');
                    input.type = inputType;
                    input.name = inputName;
                    input.value = opt.label;
                    input.className = 'mt-1 mr-3 text-primary focus:ring-primary border-gray-300';
                    
                    // Visual styling for selected state
                    input.addEventListener('change', () => {
                        // Clear other selected styles if radio
                        if (!q.multiple) {
                            optionsContainer.querySelectorAll('label').forEach(l => {
                                l.classList.remove('border-primary', 'bg-purple-50');
                                l.classList.add('border-transparent', 'bg-dark-bg');
                            });
                        }
                        
                        if (input.checked) {
                            label.classList.remove('border-transparent', 'bg-dark-bg');
                            label.classList.add('border-primary', 'bg-purple-50');
                        } else {
                            label.classList.remove('border-primary', 'bg-purple-50');
                            label.classList.add('border-transparent', 'bg-dark-bg');
                        }
                    });
                    
                    const content = document.createElement('div');
                    content.className = 'flex-1';
                    content.innerHTML = `
                        <div class="font-bold text-text-main text-sm">${escapeHtml(opt.label)}</div>
                        ${opt.description ? `<div class="text-xs text-text-muted mt-0.5">${escapeHtml(opt.description)}</div>` : ''}
                    `;
                    
                    label.appendChild(input);
                    label.appendChild(content);
                    optionsContainer.appendChild(label);
                });
                fieldset.appendChild(optionsContainer);
            } else {
                // Text input for open-ended questions
                const inputContainer = document.createElement('div');
                inputContainer.className = 'space-y-2';

                const input = document.createElement('textarea');
                input.name = `${containerId}-q${qIndex}`;
                input.placeholder = '请在这里输入您的回答...';
                input.required = true;
                input.rows = 3;
                input.className = 'w-full px-4 py-3 bg-dark-bg border-2 border-dark-border rounded-xl focus:border-primary focus:outline-none resize-none text-sm font-medium placeholder-gray-400';

                // Input validation styling
                input.addEventListener('input', () => {
                    if (input.value.trim()) {
                        input.classList.remove('border-red-300');
                        input.classList.add('border-dark-border');
                    }
                });

                inputContainer.appendChild(input);
                fieldset.appendChild(inputContainer);
            }
            container.appendChild(fieldset);
        });
    }
    
    // Submit Button
    const submitBtn = document.createElement('button');
    submitBtn.className = 'w-full py-3 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transform hover:-translate-y-0.5 transition-all mt-4 flex items-center justify-center gap-2';

    // Check if any questions require text input
    const hasTextInput = data.questions.some(q => !q.options || q.options.length === 0);
    submitBtn.innerHTML = `<span>🚀</span> ${hasTextInput ? '提交回答' : '提交选择'}`;
    
    submitBtn.onclick = () => {
        // Gather data
        const result = {};
        let isValid = true;

        data.questions.forEach((q, qIndex) => {
            const questionKey = q.header || `Question ${qIndex + 1}`;

            if (q.options && q.options.length > 0) {
                // Multiple choice question
                const inputName = `${containerId}-q${qIndex}`;
                const inputs = container.querySelectorAll(`input[name="${inputName}"]:checked`);

                if (inputs.length === 0) {
                    isValid = false;
                    // Highlight error
                    const fieldset = container.querySelectorAll('fieldset')[qIndex];
                    if (fieldset) {
                        fieldset.classList.add('animate-pulse');
                        setTimeout(() => fieldset.classList.remove('animate-pulse'), 500);
                    }
                }

                if (q.multiple) {
                    result[questionKey] = Array.from(inputs).map(i => i.value);
                } else {
                    result[questionKey] = inputs[0]?.value;
                }
            } else {
                // Text input question
                const inputName = `${containerId}-q${qIndex}`;
                const textarea = container.querySelector(`textarea[name="${inputName}"]`);
                const value = textarea?.value?.trim();

                if (!value) {
                    isValid = false;
                    // Highlight error
                    const fieldset = container.querySelectorAll('fieldset')[qIndex];
                    if (fieldset) {
                        fieldset.classList.add('animate-pulse');
                        setTimeout(() => fieldset.classList.remove('animate-pulse'), 500);
                    }
                    // Focus the input
                    if (textarea) textarea.focus();
                }

                result[questionKey] = value || '';
            }
        });

        if (!isValid) {
            createToast('请回答所有问题', 'warning');
            return;
        }
        
        // Disable form
        container.querySelectorAll('input, button').forEach(el => el.disabled = true);
        submitBtn.innerHTML = '<span>✅</span> 已提交';
        submitBtn.classList.remove('from-primary', 'to-purple-600');
        submitBtn.classList.add('bg-green-500');
        
        if (onSubmit) onSubmit(result);
    };
    
    container.appendChild(submitBtn);
    
    return container;
}

/**
 * Add questionnaire to a message
 */
function addQuestionnaireToMessage(messageEl, data, onSubmit) {
    if (!messageEl || !data) return null;
    
    const container = messageEl.querySelector('.message-content');
    if (!container) return null;
    
    const questionnaire = createQuestionnaire(data, onSubmit);
    container.appendChild(questionnaire);
    
    return questionnaire;
}

/**
 * Create an answered question display (read-only)
 * @param {Object} data - The questionnaire data with _output containing the answer
 */
function createAnsweredQuestion(data) {
    const container = document.createElement('div');
    container.className = 'bg-dark-card border border-green-500/30 rounded-2xl p-6 shadow-sm space-y-4 max-w-2xl mx-auto';
    
    // Header with checkmark
    const header = document.createElement('div');
    header.className = 'flex items-center gap-2 text-green-500 font-bold';
    header.innerHTML = `<span class="text-xl">✅</span> 已回答的问题`;
    container.appendChild(header);
    
    // Display questions and answers
    if (data.questions && Array.isArray(data.questions)) {
        data.questions.forEach((q, idx) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'bg-dark-bg rounded-xl p-4 space-y-2';
            
            // Question header
            const qHeader = document.createElement('div');
            qHeader.className = 'font-bold text-text-main text-sm';
            qHeader.textContent = `${idx + 1}. ${q.header || q.question}`;
            questionDiv.appendChild(qHeader);
            
            // Question text if different from header
            if (q.question && q.question !== q.header) {
                const qText = document.createElement('div');
                qText.className = 'text-xs text-text-muted';
                qText.textContent = q.question;
                questionDiv.appendChild(qText);
            }
            
            container.appendChild(questionDiv);
        });
    }
    
    // Display the answer output from AI
    if (data._output) {
        const answerDiv = document.createElement('div');
        answerDiv.className = 'bg-green-500/10 border border-green-500/20 rounded-xl p-4';
        
        const answerLabel = document.createElement('div');
        answerLabel.className = 'text-xs text-green-500 font-bold mb-2';
        answerLabel.textContent = '用户回答:';
        answerDiv.appendChild(answerLabel);
        
        const answerText = document.createElement('div');
        answerText.className = 'text-sm text-text-main';
        answerText.textContent = data._output;
        answerDiv.appendChild(answerText);
        
        container.appendChild(answerDiv);
    }
    
    return container;
}

/**
 * Add answered question display to a message
 */
function addAnsweredQuestionToMessage(messageEl, data) {
    if (!messageEl || !data) return null;
    
    const container = messageEl.querySelector('.message-content');
    if (!container) return null;
    
    const answeredQuestion = createAnsweredQuestion(data);
    container.appendChild(answeredQuestion);
    
    return answeredQuestion;
}

// =============================================================================
// Utility Functions
// =============================================================================

// Helper for escaping HTML
function escapeHtml(unsafe) {
    // Handle null/undefined
    if (unsafe == null) return '';
    
    // Handle objects - convert to JSON string
    if (typeof unsafe === 'object') {
        try {
            unsafe = JSON.stringify(unsafe, null, 2);
        } catch (e) {
            unsafe = String(unsafe);
        }
    }
    
    // Convert to string if not already
    if (typeof unsafe !== 'string') {
        unsafe = String(unsafe);
    }
    
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Render markdown (wrapper for marked.js + highlight)
function renderAndHighlight(markdown, element) {
    if (!element) return;
    
    // Ensure markdown is a string
    if (markdown == null) {
        markdown = '';
    } else if (typeof markdown === 'object') {
        try {
            markdown = JSON.stringify(markdown, null, 2);
        } catch (e) {
            markdown = String(markdown);
        }
    } else if (typeof markdown !== 'string') {
        markdown = String(markdown);
    }
    
    // Check if marked is available
    if (typeof marked !== 'undefined') {
        element.innerHTML = marked.parse(markdown);
        
        // Highlight code blocks
        if (typeof Prism !== 'undefined') {
            element.querySelectorAll('pre code').forEach((block) => {
                Prism.highlightElement(block);
            });
        }
    } else {
        element.textContent = markdown;
    }
}

/**
 * Show loading overlay
 */
function showLoading(text = '加载中...') {
    const overlay = document.getElementById('loading-overlay');
    const textEl = document.getElementById('loading-text');
    
    if (overlay) {
        overlay.classList.remove('hidden');
        if (textEl) textEl.textContent = text;
    }
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

/**
 * Update status indicator
 */
function updateStatus(text, icon = '⚡') {
    const statusIcon = document.getElementById('status-icon');
    const statusText = document.getElementById('status-text');
    
    if (statusIcon) statusIcon.textContent = icon;
    if (statusText) statusText.textContent = text;
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    // Message components
    window.createUserMessage = createUserMessage;
    window.createAssistantMessage = createAssistantMessage;
    window.appendTextToMessage = appendTextToMessage;
    window.addThinkingSection = addThinkingSection;
    window.addToolResult = addToolResult;
    window.updateToolStatus = updateToolStatus;
    window.addMessageFooter = addMessageFooter;
    window.copyToClipboard = copyToClipboard; // Exported
    
    // Streaming indicator with anime quotes
    window.createStreamingIndicator = createStreamingIndicator;
    window.addStreamingIndicator = addStreamingIndicator;
    window.removeStreamingIndicator = removeStreamingIndicator;
    window.moveStreamingIndicatorToBottom = moveStreamingIndicatorToBottom;
    window.getRandomAnimeQuote = getRandomAnimeQuote;
    
    // Subagent components (TUI-like)
    window.createSubagentPanel = createSubagentPanel;
    window.updateSubagentPanel = updateSubagentPanel;
    window.addSubagentToMessage = addSubagentToMessage;
    window.getToolIcon = getToolIcon;
    
    // Progress tracker
    window.createProgressTracker = createProgressTracker;
    window.updateProgressTracker = updateProgressTracker;
    
    // Questionnaire
    window.createQuestionnaire = createQuestionnaire;
    window.addQuestionnaireToMessage = addQuestionnaireToMessage;
    window.createAnsweredQuestion = createAnsweredQuestion;
    window.addAnsweredQuestionToMessage = addAnsweredQuestionToMessage;
    
    // UI components
    window.createProjectCard = createProjectCard;
    window.createToast = createToast;
    window.createFilePreview = createFilePreview;
    window.createCollapsible = createCollapsible;
    window.toggleCollapsible = toggleCollapsible;
    
    // Utilities
    window.showLoading = showLoading;
    window.hideLoading = hideLoading;
    window.updateStatus = updateStatus;
    window.escapeHtml = escapeHtml;
    window.renderAndHighlight = renderAndHighlight;
}