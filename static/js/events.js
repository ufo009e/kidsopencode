/**
 * SSE Event Stream Handler for OpenCode
 * Handles Server-Sent Events from OpenCode API
 * Enhanced with subagent support for TUI-like experience
 */

class EventStream {
    constructor(directory, onEvent) {
        this.directory = directory;
        this.onEvent = onEvent;
        this.eventSource = null;
        this.connected = false;
        
        // Track active subagents for nested display
        this.activeSubagents = new Map();
    }

    /**
     * Connect to SSE event stream
     */
    connect() {
        if (this.eventSource) {
            this.disconnect();
        }

        // Enable enhancement for subagent support
        const url = `/api/opencode/event?directory=${encodeURIComponent(this.directory)}&enhance=true`;
        
        try {
            this.eventSource = new EventSource(url);
            
            this.eventSource.onopen = () => {
                console.log('[SSE] EventStream connected');
                this.connected = true;
                this.onEvent('connected', {});
            };
            
            this.eventSource.onmessage = (e) => {
                console.log('[SSE RAW]', e.data.substring(0, 100) + '...');
                try {
                    const data = JSON.parse(e.data);
                    console.log('[SSE PARSED]', data.type, data._is_subagent ? '(subagent)' : '');
                    this.handleEvent(data);
                } catch (error) {
                    console.error('Error parsing SSE event:', error, 'Raw data:', e.data);
                }
            };
            
            this.eventSource.onerror = (error) => {
                console.error('[SSE] EventStream error:', error);
                this.connected = false;
                this.onEvent('error', { error: 'Connection error' });
            };
            
        } catch (error) {
            console.error('[SSE] Failed to create EventSource:', error);
            this.onEvent('error', { error: error.message });
        }
    }

    /**
     * Disconnect from event stream
     */
    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
            this.connected = false;
            this.activeSubagents.clear();
            console.log('[SSE] EventStream disconnected');
        }
    }

    /**
     * Handle incoming event
     */
    handleEvent(event) {
        const { type, properties } = event;

        switch (type) {
            case 'server.connected':
                console.log('[SSE] Server connected event received');
                this.onEvent('server_connected', properties || {});
                break;
            
            case 'server.heartbeat':
                // Silent heartbeat
                break;
            
            case 'message.part.updated':
                this.handlePartUpdated(properties, event);
                break;
            
            case 'message.updated':
                this.handleMessageUpdated(properties);
                break;
            
            case 'file.edited':
                this.onEvent('file_edited', properties);
                break;
            
            case 'session.status':
                this.onEvent('session_status', properties);
                break;
            
            case 'session.error':
                this.onEvent('session_error', properties);
                break;
            
            case 'session.idle':
                this.onEvent('session_idle', properties);
                break;
            
            case 'connection.error':
                this.onEvent('error', properties);
                break;

            case 'question.asked':
                console.log('[SSE] Question asked event received');
                this.onEvent('question_asked', properties);
                break;

            default:
                console.log('[SSE] Unknown event type:', type, properties);
        }
    }

    /**
     * Handle message.part.updated events
     * Enhanced to detect and handle subagent (task) events
     */
    handlePartUpdated(properties, fullEvent) {
        const { part, delta } = properties;
        const partType = part?.type;

        if (!partType) return;

        switch (partType) {
            case 'text':
                // Streaming text - use delta for incremental updates
                if (delta) {
                    this.onEvent('text_delta', { delta });
                }
                break;
            
            case 'reasoning':
                // AI thinking/reasoning - use full text
                this.onEvent('reasoning', { text: part.text || '' });
                break;
            
            case 'tool':
                // Check if this is a subagent (task tool) event
                if (fullEvent._is_subagent || part.tool === 'task') {
                    this.handleSubagentEvent(part, fullEvent);
                } else {
                    this.handleToolUpdate(part, fullEvent);
                }
                break;
            
            case 'step-start':
                this.onEvent('step_start', {});
                break;
            
            case 'step-finish':
                this.onEvent('step_finish', {
                    reason: part.reason,
                    tokens: part.tokens
                });
                break;
            
            default:
                console.log('[SSE] Unknown part type:', partType, part);
        }
    }

    /**
     * Handle subagent (task tool) events
     * Creates rich subagent data for TUI-like display
     */
    handleSubagentEvent(part, fullEvent) {
        const state = part.state || {};
        const status = state.status;
        const input = state.input || {};
        const partId = part.id || `subagent-${Date.now()}`;
        
        // Build subagent data object
        const subagentData = {
            id: partId,
            tool: 'task',
            status: status,
            subagentType: fullEvent._subagent_type || input.subagent_type || 'general',
            description: fullEvent._subagent_description || input.description || '',
            prompt: input.prompt || '',
            output: state.output || '',
            title: state.title || '',
            error: state.error || null,
            
            // Parsed data from backend enhancement
            parsed: fullEvent._subagent_parsed || null,
            
            // Frontend-parsed tool summary (fallback)
            toolSummary: this.parseTaskOutput(state.output)
        };
        
        // Track active subagent
        this.activeSubagents.set(partId, subagentData);
        
        // Emit appropriate event based on status
        switch (status) {
            case 'pending':
                console.log(`[SSE] 📦 Subagent pending: ${subagentData.subagentType}`);
                this.onEvent('subagent_pending', subagentData);
                break;
            
            case 'running':
                console.log(`[SSE] 🔄 Subagent running: ${subagentData.subagentType}`);
                this.onEvent('subagent_running', subagentData);
                break;
            
            case 'completed':
                console.log(`[SSE] ✅ Subagent completed: ${subagentData.subagentType}`);
                this.activeSubagents.delete(partId);
                this.onEvent('subagent_completed', subagentData);
                break;
            
            case 'failed':
                console.log(`[SSE] ❌ Subagent failed: ${subagentData.subagentType}`);
                this.activeSubagents.delete(partId);
                this.onEvent('subagent_failed', subagentData);
                break;
            
            default:
                this.onEvent('subagent_update', subagentData);
        }
    }

    /**
     * Handle regular tool execution updates
     */
    handleToolUpdate(part, fullEvent) {
        const tool = part.tool;
        const state = part.state || {};
        const status = state.status;

        const toolData = {
            id: part.id || `tool-${Date.now()}`,
            tool,
            status,
            input: state.input,
            output: state.output,
            title: state.title,
            error: state.error,
            // Tool category from backend enhancement
            category: fullEvent._tool_category || this.getToolCategory(tool)
        };

        switch (status) {
            case 'pending':
                this.onEvent('tool_pending', toolData);
                break;
            
            case 'running':
                this.onEvent('tool_running', toolData);
                break;
            
            case 'completed':
                this.onEvent('tool_completed', toolData);
                break;
            
            case 'failed':
                this.onEvent('tool_failed', toolData);
                break;
            
            default:
                this.onEvent('tool_update', toolData);
        }
    }

    /**
     * Parse task output to extract tool calls and summary
     * This is a frontend fallback if backend parsing is unavailable
     */
    parseTaskOutput(output) {
        if (!output) {
            return { tools: [], files: [], summary: '' };
        }
        
        const result = {
            tools: [],
            files: [],
            summary: ''
        };
        
        // Extract tool names
        const toolPatterns = [
            /(?:Called|Using|Executed|Running)\s+(\w+)(?:\s+tool)?/gi,
            /\[(\w+)\]/g,
            /Tool:\s*(\w+)/gi
        ];
        
        const toolsFound = new Set();
        for (const pattern of toolPatterns) {
            let match;
            while ((match = pattern.exec(output)) !== null) {
                const toolName = match[1].toLowerCase();
                if (['bash', 'read', 'write', 'edit', 'grep', 'glob', 'task'].includes(toolName)) {
                    toolsFound.add(toolName);
                }
            }
        }
        result.tools = Array.from(toolsFound);
        
        // Extract file paths
        const filePattern = /[`"']?([^\s`"']+\.\w{1,5})[`"']?/g;
        const filesFound = new Set();
        let fileMatch;
        while ((fileMatch = filePattern.exec(output)) !== null) {
            const filePath = fileMatch[1];
            // Basic validation - should look like a file path
            if (filePath.includes('/') || filePath.includes('\\') || /\.\w{1,4}$/.test(filePath)) {
                filesFound.add(filePath);
            }
        }
        result.files = Array.from(filesFound).slice(0, 10);
        
        // Extract summary (first meaningful content)
        const lines = output.trim().split('\n');
        const summaryLines = [];
        for (const line of lines.slice(0, 5)) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('[') && !trimmed.startsWith('#')) {
                summaryLines.push(trimmed);
                if (summaryLines.join(' ').length > 200) break;
            }
        }
        result.summary = summaryLines.join(' ').substring(0, 300);
        
        return result;
    }

    /**
     * Get tool category for display
     */
    getToolCategory(toolName) {
        const categories = {
            'bash': 'execution',
            'read': 'file',
            'write': 'file',
            'edit': 'file',
            'grep': 'search',
            'glob': 'search',
            'task': 'subagent'
        };
        return categories[toolName?.toLowerCase()] || 'other';
    }

    /**
     * Handle message.updated events
     */
    handleMessageUpdated(properties) {
        const { info } = properties;
        
        if (!info) return;

        const { role, finish, tokens, cost } = info;

        // Only process assistant messages
        if (role !== 'assistant') return;

        if (finish) {
            if (finish === 'tool-calls') {
                // AI is calling tools, not done yet
                this.onEvent('message_tool_calls', { tokens });
            } else {
                // Message is complete (stop, length, error, etc.)
                this.onEvent('message_complete', {
                    finish,
                    tokens,
                    cost
                });
            }
        }
    }

    /**
     * Check if connected
     */
    isConnected() {
        return this.connected;
    }

    /**
     * Get active subagents
     */
    getActiveSubagents() {
        return Array.from(this.activeSubagents.values());
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.EventStream = EventStream;
}
