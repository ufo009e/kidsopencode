/**
 * Markdown Rendering Utilities
 * Uses marked.js and Prism.js for syntax highlighting
 * Enhanced with full Markdown support including tables, task lists, etc.
 */

/**
 * Configure marked.js with full feature support
 */
if (typeof marked !== 'undefined') {
    // Custom renderer for marked v15+ (token object API)
    const renderer = {
        // Enhanced code block rendering with copy button
        // In v15+, receives { text, lang, escaped } token object
        code({ text, lang, escaped }) {
            const code = text || '';
            const language = lang || '';
            const validLang = language && typeof Prism !== 'undefined' && Prism.languages[language] ? language : 'plaintext';
            const langClass = `language-${validLang}`;
            const codeId = `code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            return `
                <div class="code-block-wrapper relative group">
                    <div class="code-header flex items-center justify-between px-3 py-1.5 bg-gray-800 rounded-t-lg border-b border-gray-700">
                        <span class="text-xs text-gray-400 font-mono">${validLang}</span>
                        <button onclick="copyCode('${codeId}')" class="copy-btn text-xs text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1">
                            📋 复制
                        </button>
                    </div>
                    <pre class="!mt-0 !rounded-t-none"><code id="${codeId}" class="${langClass}">${escapeHtml(code)}</code></pre>
                </div>
            `;
        },
        
        // Enhanced table rendering
        // In v15+, receives { header, rows } token object
        table({ header, rows }) {
            // header and rows are arrays of cells
            let headerHtml = '';
            let bodyHtml = '';
            
            if (header && header.length > 0) {
                headerHtml = '<tr>' + header.map(cell => {
                    const text = cell.text || '';
                    const align = cell.align ? ` style="text-align:${cell.align}"` : '';
                    return `<th class="px-4 py-2 border border-dark-border text-left font-semibold"${align}>${text}</th>`;
                }).join('') + '</tr>';
            }
            
            if (rows && rows.length > 0) {
                bodyHtml = rows.map(row => {
                    return '<tr>' + row.map(cell => {
                        const text = cell.text || '';
                        const align = cell.align ? ` style="text-align:${cell.align}"` : '';
                        return `<td class="px-4 py-2 border border-dark-border"${align}>${text}</td>`;
                    }).join('') + '</tr>';
                }).join('');
            }
            
            return `
                <div class="table-wrapper overflow-x-auto my-4">
                    <table class="min-w-full border-collapse">
                        <thead class="bg-dark-card">${headerHtml}</thead>
                        <tbody>${bodyHtml}</tbody>
                    </table>
                </div>
            `;
        },
        
        // Enhanced link rendering
        // In v15+, receives { href, title, text, tokens } token object
        link({ href, title, text, tokens }) {
            const linkHref = href || '';
            const linkTitle = title || '';
            const linkText = text || 'link';
            
            const isExternal = linkHref && (linkHref.startsWith('http://') || linkHref.startsWith('https://'));
            const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
            const titleAttr = linkTitle ? ` title="${linkTitle}"` : '';
            return `<a href="${linkHref}"${titleAttr}${target} class="text-primary hover:underline">${linkText}</a>`;
        },
        
        // Enhanced image rendering
        // In v15+, receives { href, title, text } token object
        image({ href, title, text }) {
            const imgHref = href || '';
            const imgTitle = title || '';
            const altText = text || 'image';
            
            const titleAttr = imgTitle ? ` title="${imgTitle}"` : '';
            return `<img src="${imgHref}" alt="${altText}"${titleAttr} class="max-w-full h-auto rounded-lg my-2" loading="lazy">`;
        },
        
        // Task list support
        // In v15+, receives { text, task, checked, tokens } token object
        listitem({ text, task, checked, tokens }) {
            let content = text || '';
            const isTask = task || false;
            const isChecked = checked || false;
            
            // Safety check
            if (content === '[object Object]') {
                content = '';
            }
            
            if (isTask) {
                const checkbox = isChecked 
                    ? '<input type="checkbox" checked disabled class="mr-2 accent-primary">'
                    : '<input type="checkbox" disabled class="mr-2">';
                return `<li class="task-list-item flex items-start gap-1">${checkbox}<span>${content}</span></li>`;
            }
            return `<li>${content}</li>`;
        },
        
        // Blockquote styling
        // In v15+, receives { raw, text, tokens } token object
        blockquote({ raw, text, tokens }) {
            // In v15+, we need to parse the inner tokens or use raw
            let content = text || raw || '';
            
            // Safety check
            if (typeof content === 'object') {
                content = '';
            }
            if (content === '[object Object]') {
                content = '';
            }
            
            return `<blockquote class="border-l-4 border-primary pl-4 my-4 text-gray-400 italic">${content}</blockquote>`;
        },
        
        // Horizontal rule
        hr() {
            return '<hr class="my-6 border-dark-border">';
        }
    };
    
    marked.use({ renderer });
}

/**
 * Copy code to clipboard
 */
function copyCode(codeId) {
    const codeElement = document.getElementById(codeId);
    if (!codeElement) return;
    
    const text = codeElement.textContent;
    navigator.clipboard.writeText(text).then(() => {
        // Find the copy button and show feedback
        const wrapper = codeElement.closest('.code-block-wrapper');
        const btn = wrapper?.querySelector('.copy-btn');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '✅ 已复制';
            setTimeout(() => {
                btn.innerHTML = originalText;
            }, 2000);
        }
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

/**
 * Render markdown text to HTML
 * @param {string} text - Markdown text
 * @returns {string} - HTML string
 */
function renderMarkdown(text) {
    if (!text) return '';
    
    // Ensure input is string
    if (typeof text !== 'string') {
        const original = text;
        console.warn('renderMarkdown received non-string:', original);
        try {
            if (String(original) === '[object Object]') {
                // Try to stringify if it's a plain object to get something useful
                text = JSON.stringify(original, null, 2);
            } else {
                text = String(original);
            }
        } catch (e) {
            return '';
        }
    }
    
    try {
        // Use marked.js to parse markdown
        const html = marked.parse(text);
        return html;
    } catch (error) {
        console.error('Markdown rendering error:', error);
        // Fallback: return text with basic HTML escaping
        return escapeHtml(text).replace(/\n/g, '<br>');
    }
}

/**
 * Highlight code blocks in an element
 * @param {HTMLElement} element - Element containing code blocks
 */
function highlightCode(element) {
    if (typeof Prism === 'undefined') return;
    
    try {
        // Find all code blocks
        const codeBlocks = element.querySelectorAll('pre code');
        
        codeBlocks.forEach(block => {
            // Prism.js auto-highlights if class is present
            Prism.highlightElement(block);
        });
    } catch (error) {
        console.error('Code highlighting error:', error);
    }
}

/**
 * Render markdown and apply syntax highlighting
 * @param {string} text - Markdown text
 * @param {HTMLElement} container - Container element
 */
function renderAndHighlight(text, container) {
    if (!container) return;
    
    // Render markdown
    const html = renderMarkdown(text);
    container.innerHTML = html;
    
    // Add markdown-content class for styling
    container.classList.add('markdown-content');
    
    // Highlight code
    highlightCode(container);
    
    // Process any math if KaTeX is available
    if (typeof renderMathInElement !== 'undefined') {
        try {
            renderMathInElement(container, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\[', right: '\\]', display: true},
                    {left: '\\(', right: '\\)', display: false}
                ],
                throwOnError: false
            });
        } catch (e) {
            console.warn('Math rendering not available');
        }
    }
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
    if (typeof text !== 'string') {
        if (text && typeof text === 'object') {
            try {
                return escapeHtml(JSON.stringify(text));
            } catch (e) {
                return String(text);
            }
        }
        return String(text);
    }
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Create a code block element
 * @param {string} code - Code content
 * @param {string} language - Programming language
 * @returns {HTMLElement} - Pre element with code
 */
function createCodeBlock(code, language = '') {
    const pre = document.createElement('pre');
    const codeEl = document.createElement('code');
    
    if (language) {
        codeEl.className = `language-${language}`;
    }
    
    codeEl.textContent = code;
    pre.appendChild(codeEl);
    
    // Highlight if Prism is available
    if (typeof Prism !== 'undefined' && language) {
        try {
            Prism.highlightElement(codeEl);
        } catch (error) {
            console.error('Code highlighting error:', error);
        }
    }
    
    return pre;
}

/**
 * Extract language from code fence
 * @param {string} text - Text starting with code fence
 * @returns {object} - {language, code}
 */
function extractCodeFence(text) {
    const match = text.match(/^```(\w+)?\n([\s\S]*?)```/);
    
    if (match) {
        return {
            language: match[1] || '',
            code: match[2] || ''
        };
    }
    
    return null;
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.renderMarkdown = renderMarkdown;
    window.highlightCode = highlightCode;
    window.renderAndHighlight = renderAndHighlight;
    window.escapeHtml = escapeHtml;
    window.createCodeBlock = createCodeBlock;
    window.extractCodeFence = extractCodeFence;
    window.copyCode = copyCode;
}
