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
                }
            },
            'hogwarts': {
                name: 'Hogwarts',
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
                }
            },
            'marvel': {
                name: 'Marvel Heroes',
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

        // 4. Save
        this.currentTheme = themeKey;
        localStorage.setItem('opencode_theme', themeKey);
        
        const select = document.getElementById('theme-select');
        if (select) select.value = themeKey;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});
