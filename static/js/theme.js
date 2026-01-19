/**
 * Theme Manager for OpenCode Web Builder
 * Handles theme switching, CSS variables, and UI updates (icons/text)
 */

class ThemeManager {
    constructor() {
        this.themes = {
            'dream': {
                name: '梦工厂',
                colors: {
                    '--color-primary': '#8b5cf6',   // Violet
                    '--color-secondary': '#f472b6', // Pink
                    '--color-accent': '#fbbf24',    // Amber
                    '--color-dark-bg': '#fdf4ff',   // Very light fuchsia
                    '--color-dark-card': '#ffffff', // White
                    '--color-dark-border': '#fbcfe8', // Light pink
                    '--color-text-main': '#334155', // Slate 700
                    '--color-text-muted': '#64748b', // Slate 500
                    '--color-highlight': '#faf5ff'  // Purple 50
                },
                styles: {
                    '--radius-nav-btn': '1rem',
                    '--radius-bubble': '1rem',
                    '--font-display': '"ZCOOL KuaiLe", cursive',
                    '--font-body': '"Nunito", sans-serif',
                    '--border-style': 'solid',
                    '--shadow-card': '0 4px 6px -1px rgba(139, 92, 246, 0.1)',
                    '--bg-pattern': 'none',
                    '--hover-transform': 'scale(1.05) rotate(1deg)',
                    '--transition-speed': '0.3s'
                },
                ui: {
                    'app-title': { text: '🚀 梦工厂' },
                    'nav-projects': { icon: '🏰', text: '我的城堡' },
                    'nav-chat': { icon: '🔮', text: '魔法屋' },
                    'nav-settings': { icon: '🔧', text: '工具箱' }
                }
            },
            'adult': {
                name: '成人标准',
                colors: {
                    '--color-primary': '#4f46e5',   // Indigo 600
                    '--color-secondary': '#64748b', // Slate 500
                    '--color-accent': '#0ea5e9',    // Sky 500
                    '--color-dark-bg': '#f3f4f6',   // Gray 100
                    '--color-dark-card': '#ffffff', // White
                    '--color-dark-border': '#e5e7eb', // Gray 200
                    '--color-text-main': '#111827', // Gray 900
                    '--color-text-muted': '#4b5563', // Gray 600
                    '--color-highlight': '#eef2ff'  // Indigo 50
                },
                styles: {
                    '--radius-nav-btn': '0.375rem', // Square-ish
                    '--radius-bubble': '0.25rem',
                    '--font-display': '"Nunito", sans-serif', // Clean font
                    '--font-body': '"Nunito", sans-serif',
                    '--border-style': 'solid',
                    '--shadow-card': '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                    '--bg-pattern': 'none',
                    '--hover-transform': 'translateY(-1px)',
                    '--transition-speed': '0.15s'
                },
                ui: {
                    'app-title': { text: '💼 工作台' },
                    'nav-projects': { icon: '📂', text: '项目管理' },
                    'nav-chat': { icon: '✨', text: 'AI 助手' },
                    'nav-settings': { icon: '⚙️', text: '系统设置' }
                }
            },
            'sky': {
                name: '天空蓝',
                colors: {
                    '--color-primary': '#0ea5e9',   // Sky 500
                    '--color-secondary': '#38bdf8', // Sky 400
                    '--color-accent': '#7dd3fc',    // Sky 300
                    '--color-dark-bg': '#f0f9ff',   // Sky 50
                    '--color-dark-card': '#ffffff', // White
                    '--color-dark-border': '#bae6fd', // Sky 200
                    '--color-text-main': '#0c4a6e', // Sky 900
                    '--color-text-muted': '#0284c7', // Sky 600
                    '--color-highlight': '#e0f2fe'  // Sky 100
                },
                styles: {
                    '--radius-nav-btn': '9999px', // Pill shape
                    '--radius-bubble': '1.5rem',
                    '--font-display': '"ZCOOL KuaiLe", cursive',
                    '--font-body': '"Nunito", sans-serif',
                    '--border-style': 'solid',
                    '--shadow-card': '0 10px 15px -3px rgba(14, 165, 233, 0.1)', // Floating feel
                    '--bg-pattern': 'none',
                    '--hover-transform': 'translateY(-3px) scale(1.02)',
                    '--transition-speed': '0.4s'
                },
                ui: {
                    'app-title': { text: '☁️ 天空之城' },
                    'nav-projects': { icon: '🌤️', text: '云端硬盘' },
                    'nav-chat': { icon: '🕊️', text: '飞鸽传书' },
                    'nav-settings': { icon: '✈️', text: '飞行仪表' }
                }
            },
            'ocean': {
                name: '海洋Manta',
                colors: {
                    '--color-primary': '#06b6d4',   // Cyan 500
                    '--color-secondary': '#0891b2', // Cyan 600
                    '--color-accent': '#22d3ee',    // Cyan 400
                    '--color-dark-bg': '#ecfeff',   // Cyan 50
                    '--color-dark-card': '#ffffff', // White
                    '--color-dark-border': '#a5f3fc', // Cyan 200
                    '--color-text-main': '#164e63', // Cyan 900
                    '--color-text-muted': '#0e7490', // Cyan 700
                    '--color-highlight': '#cffafe'  // Cyan 100
                },
                styles: {
                    '--radius-nav-btn': '1.25rem',
                    '--radius-bubble': '0.5rem 1.5rem 1.5rem 1.5rem', // Droplet-like
                    '--font-display': '"ZCOOL KuaiLe", cursive',
                    '--font-body': '"Nunito", sans-serif',
                    '--border-style': 'solid',
                    '--shadow-card': '0 4px 6px -1px rgba(6, 182, 212, 0.2)',
                    '--bg-pattern': 'none',
                    '--hover-transform': 'scale(1.05) skewX(-2deg)',
                    '--transition-speed': '0.5s'
                },
                ui: {
                    'app-title': { text: '🌊 深海基地' },
                    'nav-projects': { icon: '🏝️', text: '群岛地图' },
                    'nav-chat': { icon: '🐚', text: '海螺回响' },
                    'nav-settings': { icon: '🧭', text: '航海罗盘' }
                }
            },
            'forest': {
                name: '森林派对',
                colors: {
                    '--color-primary': '#16a34a',   // Green 600
                    '--color-secondary': '#65a30d', // Lime 600
                    '--color-accent': '#facc15',    // Yellow 400
                    '--color-dark-bg': '#f0fdf4',   // Green 50
                    '--color-dark-card': '#ffffff', // White
                    '--color-dark-border': '#bbf7d0', // Green 200
                    '--color-text-main': '#14532d', // Green 900
                    '--color-text-muted': '#15803d', // Green 700
                    '--color-highlight': '#dcfce7'  // Green 100
                },
                styles: {
                    '--radius-nav-btn': '1rem',
                    '--radius-bubble': '1rem',
                    '--font-display': '"ZCOOL KuaiLe", cursive',
                    '--font-body': '"Nunito", sans-serif',
                    '--border-style': 'dashed', // Stitching effect
                    '--shadow-card': 'none', // Flat paper look
                    '--bg-pattern': 'none',
                    '--hover-transform': 'rotate(-2deg) scale(1.1)',
                    '--transition-speed': '0.2s'
                },
                ui: {
                    'app-title': { text: '🌲 森林营地' },
                    'nav-projects': { icon: '⛺', text: '营地帐篷' },
                    'nav-chat': { icon: '🦉', text: '猫头鹰信箱' },
                    'nav-settings': { icon: '🗺️', text: '探险地图' }
                }
            },
            // English Themes 🇺🇸
            'disney': {
                name: 'Disney Magic',
                lang: 'en',
                colors: {
                    '--color-primary': '#1e40af',   // Blue 800 (Disney Blue)
                    '--color-secondary': '#fbbf24', // Amber 400 (Disney Gold)
                    '--color-accent': '#f472b6',    // Pink 400
                    '--color-dark-bg': '#fef3c7',   // Amber 100
                    '--color-dark-card': '#ffffff', // White
                    '--color-dark-border': '#fcd34d', // Amber 300
                    '--color-text-main': '#1e3a5f', // Dark Blue
                    '--color-text-muted': '#6b7280', // Gray 500
                    '--color-highlight': '#fef9c3'  // Yellow 100
                },
                styles: {
                    '--radius-nav-btn': '9999px',
                    '--radius-bubble': '1.5rem',
                    '--font-display': '"Nunito", sans-serif',
                    '--font-body': '"Nunito", sans-serif',
                    '--border-style': 'solid',
                    '--shadow-card': '0 4px 15px rgba(30, 64, 175, 0.15)',
                    '--bg-pattern': 'none',
                    '--hover-transform': 'scale(1.05)',
                    '--transition-speed': '0.3s'
                },
                ui: {
                    'app-title': { text: '✨ Disney Magic' },
                    'nav-projects': { icon: '🏰', text: 'My Castle' },
                    'nav-chat': { icon: '🧚', text: 'Fairy Tale' },
                    'nav-settings': { icon: '🪄', text: 'Magic Wand' }
                },
                texts: {
                    'page-title': 'Game Dream Factory 🎮',
                    'projects-heading': 'My Game World 🌍',
                    'projects-subtitle': 'Manage all your creative game projects here!',
                    'create-btn': '✨ Create New World',
                    'no-projects': 'No games yet',
                    'no-projects-hint': 'Click the button above to start your first adventure!',
                    'welcome-title': 'Welcome to the Magic Room!',
                    'welcome-hint': 'Please select a game castle to start your creative journey!',
                    'session-label': '📜 Adventure Log:',
                    'new-session': '➕ New Adventure',
                    'agent-label': '🧙‍♂️ Magic Tutor:',
                    'model-label': '🧠 AI Brain:',
                    'attach-title': 'Treasure Bag (Upload)',
                    'voice-title': 'Voice Input',
                    'input-placeholder': 'Tell the tutor what game you want to make... (Shift+Enter new line, Enter send)',
                    'send-btn': '✨ Cast',
                    'stop-btn': '✋ Stop',
                    'modal-title': '✨ Create New World ✨',
                    'modal-label': 'Name your world',
                    'modal-placeholder': 'my-super-game',
                    'modal-cancel': 'Think Again',
                    'modal-create': 'Start Creating',
                    'loading-text': 'Casting...',
                    'status-online': 'Ready',
                    'status-offline': 'Offline',
                    'not-selected': 'Not Selected',
                    'open-folder': '📂 Open Folder',
                    'delete-title': 'Delete'
                }
            },
            'hogwarts': {
                name: 'Hogwarts',
                lang: 'en',
                colors: {
                    '--color-primary': '#7c2d12',   // Orange 900 (Gryffindor)
                    '--color-secondary': '#ca8a04', // Yellow 600 (Gold)
                    '--color-accent': '#166534',    // Green 800 (Slytherin)
                    '--color-dark-bg': '#fef3c7',   // Amber 100 (Parchment)
                    '--color-dark-card': '#fffbeb', // Amber 50
                    '--color-dark-border': '#d97706', // Amber 600
                    '--color-text-main': '#451a03', // Orange 950
                    '--color-text-muted': '#78350f', // Amber 800
                    '--color-highlight': '#fef9c3'  // Yellow 100
                },
                styles: {
                    '--radius-nav-btn': '0.5rem',
                    '--radius-bubble': '0.5rem',
                    '--font-display': '"Nunito", sans-serif',
                    '--font-body': '"Nunito", sans-serif',
                    '--border-style': 'double',
                    '--shadow-card': '0 4px 6px rgba(124, 45, 18, 0.2)',
                    '--bg-pattern': 'none',
                    '--hover-transform': 'translateY(-2px)',
                    '--transition-speed': '0.2s'
                },
                ui: {
                    'app-title': { text: '⚡ Hogwarts' },
                    'nav-projects': { icon: '📜', text: 'Spellbook' },
                    'nav-chat': { icon: '🦉', text: 'Owl Post' },
                    'nav-settings': { icon: '🔮', text: 'Crystal Ball' }
                },
                texts: {
                    'page-title': 'Hogwarts Magic Academy 🏰',
                    'projects-heading': 'My Spellbook 📚',
                    'projects-subtitle': 'Manage all your magical projects here!',
                    'create-btn': '✨ New Spell',
                    'no-projects': 'No spells yet',
                    'no-projects-hint': 'Click above to create your first spell!',
                    'welcome-title': 'Welcome to Owl Post!',
                    'welcome-hint': 'Select a spellbook to begin your magical journey!',
                    'session-label': '📜 Scroll History:',
                    'new-session': '➕ New Scroll',
                    'agent-label': '🧙‍♂️ Wizard:',
                    'model-label': '🔮 Oracle:',
                    'attach-title': 'Magic Pouch (Upload)',
                    'voice-title': 'Voice Spell',
                    'input-placeholder': 'Tell the wizard what spell you want... (Shift+Enter new line, Enter send)',
                    'send-btn': '⚡ Cast',
                    'stop-btn': '🛑 Stop',
                    'modal-title': '⚡ New Spell ⚡',
                    'modal-label': 'Name your spell',
                    'modal-placeholder': 'expecto-patronum',
                    'modal-cancel': 'Think Again',
                    'modal-create': 'Create Spell',
                    'loading-text': 'Casting spell...',
                    'status-online': 'Magic Ready',
                    'status-offline': 'Dormant',
                    'not-selected': 'Not Selected',
                    'open-folder': '📂 Open Scroll',
                    'delete-title': 'Vanish'
                }
            },
            'marvel': {
                name: 'Marvel Heroes',
                lang: 'en',
                colors: {
                    '--color-primary': '#dc2626',   // Red 600 (Marvel Red)
                    '--color-secondary': '#1d4ed8', // Blue 700
                    '--color-accent': '#fbbf24',    // Amber 400
                    '--color-dark-bg': '#fee2e2',   // Red 100
                    '--color-dark-card': '#ffffff', // White
                    '--color-dark-border': '#fca5a5', // Red 300
                    '--color-text-main': '#7f1d1d', // Red 900
                    '--color-text-muted': '#dc2626', // Red 600
                    '--color-highlight': '#fef2f2'  // Red 50
                },
                styles: {
                    '--radius-nav-btn': '0.75rem',
                    '--radius-bubble': '0.75rem',
                    '--font-display': '"Nunito", sans-serif',
                    '--font-body': '"Nunito", sans-serif',
                    '--border-style': 'solid',
                    '--shadow-card': '0 4px 10px rgba(220, 38, 38, 0.2)',
                    '--bg-pattern': 'none',
                    '--hover-transform': 'scale(1.08)',
                    '--transition-speed': '0.15s'
                },
                ui: {
                    'app-title': { text: '💥 Marvel Heroes' },
                    'nav-projects': { icon: '🛡️', text: 'Mission HQ' },
                    'nav-chat': { icon: '🦸', text: 'Hero Call' },
                    'nav-settings': { icon: '⚙️', text: 'Stark Tech' }
                },
                texts: {
                    'page-title': 'Marvel Hero Factory 🦸',
                    'projects-heading': 'Mission Control 🌍',
                    'projects-subtitle': 'Manage all your hero missions here!',
                    'create-btn': '💥 New Mission',
                    'no-projects': 'No missions yet',
                    'no-projects-hint': 'Click above to start your first mission!',
                    'welcome-title': 'Welcome to Hero Call!',
                    'welcome-hint': 'Select a mission to begin your hero journey!',
                    'session-label': '📜 Mission Log:',
                    'new-session': '➕ New Mission',
                    'agent-label': '🦸 Hero:',
                    'model-label': '🤖 J.A.R.V.I.S:',
                    'attach-title': 'Utility Belt (Upload)',
                    'voice-title': 'Voice Command',
                    'input-placeholder': 'Tell the hero what mission you want... (Shift+Enter new line, Enter send)',
                    'send-btn': '💪 Go!',
                    'stop-btn': '🛑 Abort',
                    'modal-title': '💥 New Mission 💥',
                    'modal-label': 'Mission codename',
                    'modal-placeholder': 'avengers-assemble',
                    'modal-cancel': 'Stand Down',
                    'modal-create': 'Launch Mission',
                    'loading-text': 'Assembling...',
                    'status-online': 'Systems Online',
                    'status-offline': 'Offline',
                    'not-selected': 'Not Selected',
                    'open-folder': '📂 Open Files',
                    'delete-title': 'Delete'
                }
            }
        };

        this.currentTheme = localStorage.getItem('opencode_theme') || 'dream';
        this.init();
    }

    init() {
        this.renderSwitcher();
        this.applyTheme(this.currentTheme);
    }

    renderSwitcher() {
        const sidebar = document.querySelector('aside nav');
        if (!sidebar) return;

        let container = document.getElementById('theme-switcher-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'theme-switcher-container';
            container.className = 'mt-auto px-4 pb-4';
            
            const label = document.createElement('div');
            label.className = 'text-xs font-bold text-text-muted mb-2 px-2 flex items-center gap-1';
            label.innerHTML = '<span>🎨</span> <span>主题风格</span>';
            container.appendChild(label);

            // Wrapper for custom select styling
            const wrapper = document.createElement('div');
            wrapper.className = 'relative';

            const select = document.createElement('select');
            select.id = 'theme-select';
            // Added appearance-none and pr-8 for custom arrow space
            select.className = 'w-full px-4 py-3 rounded-xl bg-dark-bg border-2 border-dark-border text-sm font-bold text-text-main focus:outline-none focus:border-primary cursor-pointer appearance-none transition-all hover:bg-white shadow-sm';
            
            Object.entries(this.themes).forEach(([key, theme]) => {
                const option = document.createElement('option');
                option.value = key;
                option.innerText = theme.name;
                select.appendChild(option);
            });

            select.value = this.currentTheme;
            select.addEventListener('change', (e) => this.applyTheme(e.target.value));
            
            // Custom Arrow Icon
            const arrow = document.createElement('div');
            arrow.className = 'absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-text-muted';
            arrow.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" /></svg>`;

            wrapper.appendChild(select);
            wrapper.appendChild(arrow);
            container.appendChild(wrapper);
            
            const serverStatus = document.querySelector('aside > div:last-child');
            if (serverStatus && serverStatus.parentNode && serverStatus.parentNode.tagName === 'ASIDE') {
                serverStatus.before(container);
            } else {
                sidebar.after(container);
            }
        }
    }

    applyTheme(themeKey) {
        const theme = this.themes[themeKey];
        if (!theme) return;

        const root = document.documentElement;

        // 1. Update Colors
        Object.entries(theme.colors).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });

        // 2. Update Styles
        if (theme.styles) {
            Object.entries(theme.styles).forEach(([property, value]) => {
                root.style.setProperty(property, value);
            });
        }

        // 3. Update UI Text and Icons
        if (theme.ui) {
            const titleEl = document.querySelector('aside h1');
            if (titleEl && theme.ui['app-title']) {
                titleEl.innerText = theme.ui['app-title'].text;
            }

            ['nav-projects', 'nav-chat', 'nav-settings'].forEach(id => {
                const btn = document.getElementById(id);
                if (btn && theme.ui[id]) {
                    const iconSpan = btn.querySelector('.text-2xl') || btn.querySelector('span:first-child');
                    const textSpan = btn.querySelector('.font-fun') || btn.querySelector('span:last-child');
                    
                    if (iconSpan) iconSpan.innerText = theme.ui[id].icon;
                    if (textSpan) textSpan.innerText = theme.ui[id].text;
                }
            });
        }

        // 4. Apply text translations for English themes
        if (theme.texts) {
            this.applyTexts(theme.texts);
        } else {
            // Reset to Chinese for non-English themes
            this.applyTexts(this.getChineseTexts());
        }

        // 5. Save
        this.currentTheme = themeKey;
        localStorage.setItem('opencode_theme', themeKey);
        
        const select = document.getElementById('theme-select');
        if (select) select.value = themeKey;
    }

    /**
     * Apply text translations to UI elements
     */
    applyTexts(texts) {
        // Page title
        if (texts['page-title']) {
            document.title = texts['page-title'];
        }

        // Projects view
        const projectsHeading = document.querySelector('#projects-view h2');
        if (projectsHeading && texts['projects-heading']) {
            projectsHeading.textContent = texts['projects-heading'];
        }

        const projectsSubtitle = document.querySelector('#projects-view p');
        if (projectsSubtitle && texts['projects-subtitle']) {
            projectsSubtitle.textContent = texts['projects-subtitle'];
        }

        // Create button
        const createBtn = document.getElementById('create-project-btn-main');
        if (createBtn && texts['create-btn']) {
            createBtn.innerHTML = texts['create-btn'];
        }

        // No projects message
        const noProjectsTitle = document.querySelector('#no-projects-message h3');
        if (noProjectsTitle && texts['no-projects']) {
            noProjectsTitle.textContent = texts['no-projects'];
        }

        const noProjectsHint = document.querySelector('#no-projects-message p');
        if (noProjectsHint && texts['no-projects-hint']) {
            noProjectsHint.textContent = texts['no-projects-hint'];
        }

        // Welcome message
        const welcomeTitle = document.querySelector('#welcome-message h2');
        if (welcomeTitle && texts['welcome-title']) {
            welcomeTitle.textContent = texts['welcome-title'];
        }

        const welcomeHint = document.querySelector('#welcome-message p');
        if (welcomeHint && texts['welcome-hint']) {
            welcomeHint.textContent = texts['welcome-hint'];
        }

        // Session controls
        const sessionLabel = document.querySelector('#input-area .text-orange-500');
        if (sessionLabel && texts['session-label']) {
            sessionLabel.textContent = texts['session-label'];
        }

        const newSessionBtn = document.getElementById('new-session-btn');
        if (newSessionBtn && texts['new-session']) {
            newSessionBtn.innerHTML = texts['new-session'];
        }

        // Agent and Model labels
        const agentLabel = document.querySelector('#input-area .text-primary');
        if (agentLabel && texts['agent-label']) {
            agentLabel.textContent = texts['agent-label'];
        }

        const modelLabel = document.querySelector('#input-area .text-blue-500');
        if (modelLabel && texts['model-label']) {
            modelLabel.textContent = texts['model-label'];
        }

        // Input buttons
        const attachBtn = document.getElementById('attach-btn');
        if (attachBtn && texts['attach-title']) {
            attachBtn.title = texts['attach-title'];
        }

        const voiceBtn = document.getElementById('voice-btn');
        if (voiceBtn && texts['voice-title']) {
            voiceBtn.title = texts['voice-title'];
        }

        // Input placeholder
        const messageInput = document.getElementById('message-input');
        if (messageInput && texts['input-placeholder']) {
            messageInput.placeholder = texts['input-placeholder'];
        }

        // Send/Stop buttons
        const sendBtn = document.getElementById('send-btn');
        if (sendBtn && texts['send-btn']) {
            sendBtn.innerHTML = texts['send-btn'];
        }

        const stopBtn = document.getElementById('stop-btn');
        if (stopBtn && texts['stop-btn']) {
            stopBtn.innerHTML = texts['stop-btn'];
        }

        // Create project modal
        const modalTitle = document.querySelector('#create-project-modal h3');
        if (modalTitle && texts['modal-title']) {
            modalTitle.textContent = texts['modal-title'];
        }

        const modalLabel = document.querySelector('#create-project-modal label');
        if (modalLabel && texts['modal-label']) {
            modalLabel.textContent = texts['modal-label'];
        }

        const modalInput = document.getElementById('project-name-input');
        if (modalInput && texts['modal-placeholder']) {
            modalInput.placeholder = texts['modal-placeholder'];
        }

        const cancelBtn = document.getElementById('cancel-create-btn');
        if (cancelBtn && texts['modal-cancel']) {
            cancelBtn.textContent = texts['modal-cancel'];
        }

        const createSubmitBtn = document.querySelector('#create-project-form button[type="submit"]');
        if (createSubmitBtn && texts['modal-create']) {
            createSubmitBtn.textContent = texts['modal-create'];
        }

        // Loading text
        const loadingText = document.getElementById('loading-text');
        if (loadingText && texts['loading-text']) {
            loadingText.textContent = texts['loading-text'];
        }

        // Current project name placeholder
        const currentProjectName = document.getElementById('current-project-name');
        if (currentProjectName && (currentProjectName.textContent === '未选择' || currentProjectName.textContent === 'Not Selected') && texts['not-selected']) {
            currentProjectName.textContent = texts['not-selected'];
        }

        // Status text
        const statusText = document.getElementById('status-text');
        if (statusText && texts['status-online']) {
            // Only update if it shows online status
            if (statusText.textContent === '能量满满' || statusText.textContent === 'Ready' || 
                statusText.textContent === 'Magic Ready' || statusText.textContent === 'Systems Online') {
                statusText.textContent = texts['status-online'];
            }
        }

        // Update all existing project cards' open folder buttons
        const openFolderBtns = document.querySelectorAll('.open-folder-btn');
        openFolderBtns.forEach(btn => {
            if (texts['open-folder']) {
                btn.innerHTML = texts['open-folder'];
            }
        });

        // Update delete buttons titles
        const deleteBtns = document.querySelectorAll('.delete-btn');
        deleteBtns.forEach(btn => {
            if (texts['delete-title']) {
                btn.title = texts['delete-title'];
            }
        });
    }

    /**
     * Get default Chinese texts
     */
    getChineseTexts() {
        return {
            'page-title': '我的游戏梦工厂 🎮',
            'projects-heading': '我的游戏世界 🌍',
            'projects-subtitle': '在这里管理你的所有创意游戏作品！',
            'create-btn': '<span class="text-xl">✨</span> <span class="font-bold text-lg">创造新世界</span>',
            'no-projects': '还没有游戏哦',
            'no-projects-hint': '快点击右上角的按钮，开始你的第一次冒险吧！',
            'welcome-title': '欢迎来到魔法屋！',
            'welcome-hint': '请选择一个游戏城堡，开始你的创造之旅吧！',
            'session-label': '📜 冒险记录:',
            'new-session': '<span>➕</span> 新冒险',
            'agent-label': '🧙‍♂️ 魔法导师:',
            'model-label': '🧠 智慧大脑:',
            'attach-title': '百宝箱 (上传文件)',
            'voice-title': '念咒语 (语音输入)',
            'input-placeholder': '告诉魔法导师你想做什么游戏... (Shift+Enter 换行, Enter 发送)',
            'send-btn': '<span>✨</span> 施法',
            'stop-btn': '<span>✋</span> 停止',
            'modal-title': '✨ 创造新世界 ✨',
            'modal-label': '给你的世界起个名字',
            'modal-placeholder': 'my-super-game',
            'modal-cancel': '再想想',
            'modal-create': '开始创造',
            'loading-text': '施法中...',
            'status-online': '能量满满',
            'status-offline': '休息中',
            'not-selected': '未选择',
            'open-folder': '📂 打开文件夹',
            'delete-title': '删除城堡'
        };
    }

    /**
     * Get current texts for external use (e.g., by components.js)
     */
    getCurrentTexts() {
        const theme = this.themes[this.currentTheme];
        if (theme && theme.texts) {
            return theme.texts;
        }
        return this.getChineseTexts();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});
