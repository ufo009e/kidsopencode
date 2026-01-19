/**
 * API Client for OpenCode Web Builder
 * Handles all communication with the FastAPI backend
 */

class API {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
    }

    /**
     * Generic request handler
     */
    async request(method, endpoint, data = null, isFormData = false) {
        const options = {
            method,
            headers: {}
        };

        if (data) {
            if (isFormData) {
                options.body = data;
            } else if (method !== 'GET') {
                if (data instanceof FormData) {
                    options.body = data;
                } else {
                    options.headers['Content-Type'] = 'application/json';
                    options.body = JSON.stringify(data);
                }
            }
        }

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, options);
            
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`API Error: ${response.status} - ${error}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            
            return await response.text();
            
        } catch (error) {
            console.error(`API request failed: ${method} ${endpoint}`, error);
            throw error;
        }
    }

    // =========================================================================
    // Project Management
    // =========================================================================

    async getProjects() {
        const response = await this.request('GET', '/api/projects');
        return response.projects || [];
    }

    async createProject(name, path = null) {
        const formData = new FormData();
        formData.append('name', name);
        if (path) formData.append('path', path);
        
        return await this.request('POST', '/api/projects', formData, true);
    }

    async deleteProject(name) {
        return await this.request('DELETE', `/api/projects/${encodeURIComponent(name)}`);
    }

    async getCurrentProject() {
        return await this.request('GET', '/api/projects/current');
    }

    async selectProject(name) {
        const formData = new FormData();
        formData.append('name', name);
        return await this.request('POST', '/api/projects/select', formData, true);
    }

    // =========================================================================
    // OpenCode API Proxy
    // =========================================================================

    async getSessions(directory) {
        return await this.request('GET', `/api/opencode/session?directory=${encodeURIComponent(directory)}`);
    }

    async createSession(directory, title = null) {
        const data = title ? { title } : {};
        return await this.request('POST', `/api/opencode/session?directory=${encodeURIComponent(directory)}`, data);
    }

    async sendMessage(directory, sessionId, parts, model = null) {
        const data = { parts };
        if (model) {
            data.model = model;
        }
        
        // Send message and get full response
        // OpenCode may return the full response synchronously
        const url = `/api/opencode/session/${sessionId}/message?directory=${encodeURIComponent(directory)}`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            // Read the full response - OpenCode returns complete message
            const result = await response.json();
            console.log('[API] Message response received:', result);
            return result;
            
        } catch (error) {
            console.error('API sendMessage error:', error);
            throw error;
        }
    }

    async abortSession(directory, sessionId) {
        return await this.request('POST', `/api/opencode/session/${sessionId}/abort?directory=${encodeURIComponent(directory)}`);
    }

    async getProviders(directory) {
        return await this.request('GET', `/api/opencode/provider?directory=${encodeURIComponent(directory)}`);
    }

    async getAgents(directory) {
        return await this.request('GET', `/api/opencode/agent?directory=${encodeURIComponent(directory)}`);
    }

    async getMessages(directory, sessionId) {
        return await this.request('GET', `/api/opencode/session/${sessionId}/message?directory=${encodeURIComponent(directory)}`);
    }

    /**
     * Reply to a question request from AI
     * This is the correct way to respond to AI questions - calling the question API
     * rather than sending a new message
     * 
     * @param {string} directory - Project directory path
     * @param {string} requestId - The question request ID from question.asked event
     * @param {Array<Array<string>>} answers - Answers in order of questions, each answer is an array of selected labels
     */
    async replyQuestion(directory, requestId, answers) {
        console.log('[API] Replying to question:', requestId, 'answers:', answers);
        return await this.request(
            'POST', 
            `/api/opencode/question/${requestId}/reply?directory=${encodeURIComponent(directory)}`,
            { answers }
        );
    }

    /**
     * Reject a question request (user cancelled)
     * @param {string} directory - Project directory path
     * @param {string} requestId - The question request ID
     */
    async rejectQuestion(directory, requestId) {
        console.log('[API] Rejecting question:', requestId);
        return await this.request(
            'POST',
            `/api/opencode/question/${requestId}/reject?directory=${encodeURIComponent(directory)}`
        );
    }

    /**
     * List all pending questions
     * @param {string} directory - Project directory path
     * @returns {Array} List of pending question requests
     */
    async listPendingQuestions(directory) {
        console.log('[API] Listing pending questions');
        return await this.request(
            'GET',
            `/api/opencode/question?directory=${encodeURIComponent(directory)}`
        );
    }

    // =========================================================================
    // Voice Transcription
    // =========================================================================

    async transcribeAudio(audioBlob) {
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        return await this.request('POST', '/api/voice/transcribe', formData, true);
    }

    // =========================================================================
    // Server Management
    // =========================================================================

    async getServerStatus() {
        return await this.request('GET', '/api/server/status');
    }

    async restartServer(directory = '') {
        return await this.request('POST', '/api/server/restart', { directory });
    }

    // =========================================================================
    // Configuration
    // =========================================================================

    async getConfig() {
        return await this.request('GET', '/api/config');
    }

    async updateConfig(configData) {
        return await this.request('POST', '/api/config', configData);
    }

    // =========================================================================
    // Health Check
    // =========================================================================

    async healthCheck() {
        return await this.request('GET', '/api/health');
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.API = API;
}
