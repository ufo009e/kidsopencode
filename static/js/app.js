/**
 * Main Application for OpenCode Web Builder
 * Ties together all components and handles application logic
 */

class App {
    constructor() {
        // API client
        this.api = new API();
        
        // Event stream
        this.eventStream = null;
        
        // State
        this.currentProject = null;
        this.currentSession = null;
        this.currentModel = null;
        this.currentAgent = 'build';
        this.defaultModel = null;
        this.models = [];
        this.agents = [];
        this.isFirstMessageInSession = true;
        this.personalRules = localStorage.getItem('opencode_personal_rules') || '';
        this.attachedFiles = [];
        this.isStreaming = false;
        this.currentMessageEl = null;
        this.currentMessageText = '';
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.currentView = 'projects'; // 'projects' or 'chat'
        
        // Session management
        this.sessions = [];  // List of sessions for current project
        
        // Subagent tracking (TUI-like feature)
        this.activeSubagents = new Map();  // Map of subagent panels by ID
        this.progressSteps = [];  // Progress tracking steps
        this.progressTracker = null;  // Progress tracker element
        
        // Question tracking (for AI questions that need reply via /question API)
        this.pendingQuestionRequestId = null;  // Current pending question request ID
        
        // DOM elements
        this.elements = {};
        
        // Initialize
        this.init();
    }

    /**
     * Initialize application
     */
    async init() {
        console.log('Initializing OpenCode Web Builder...');
        
        // Cache DOM elements
        this.cacheElements();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load initial data
        await this.loadInitialData();
        
        // Default view
        this.switchView('projects');
        
        console.log('Application initialized');
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            // Navigation
            navProjects: document.getElementById('nav-projects'),
            navChat: document.getElementById('nav-chat'),
            navSettings: document.getElementById('nav-settings'),
            
            // Views
            projectsView: document.getElementById('projects-view'),
            chatView: document.getElementById('chat-view'),
            
            // Projects
            projectsGrid: document.getElementById('projects-grid'),
            noProjectsMessage: document.getElementById('no-projects-message'),
            createProjectBtnMain: document.getElementById('create-project-btn-main'),
            createProjectModal: document.getElementById('create-project-modal'),
            createProjectForm: document.getElementById('create-project-form'),
            projectNameInput: document.getElementById('project-name-input'),
            cancelCreateBtn: document.getElementById('cancel-create-btn'),
            
            // Chat
            chatContainer: document.getElementById('chat-container'),
            welcomeMessage: document.getElementById('welcome-message'),
            messageInput: document.getElementById('message-input'),
            sendBtn: document.getElementById('send-btn'),
            sendIconBtn: document.getElementById('send-icon-btn'),
            stopBtn: document.getElementById('stop-btn'),
            currentProjectName: document.getElementById('current-project-name'),
            
            // Session management
            sessionSelect: document.getElementById('session-select'),
            newSessionBtn: document.getElementById('new-session-btn'),
            
            // Files & Voice
            fileInput: document.getElementById('file-input'),
            attachBtn: document.getElementById('attach-btn'),
            voiceBtn: document.getElementById('voice-btn'),
            attachmentsPreview: document.getElementById('attachments-preview'),
            
            // Model & Agent
            modelSelect: document.getElementById('model-select'),
            agentSelect: document.getElementById('agent-select'),
            
            // Settings
            settingsModal: document.getElementById('settings-modal'),
            closeSettingsBtn: document.getElementById('close-settings-btn'),
            serverStatusDot: document.getElementById('server-status-dot'),
            serverStatusText: document.getElementById('server-status-text'),
            restartServerBtn: document.getElementById('restart-server-btn'),
            opencodePath: document.getElementById('opencode-path'),
            whisperStatusDot: document.getElementById('whisper-status-dot'),
            whisperStatusText: document.getElementById('whisper-status-text'),
            whisperModel: document.getElementById('whisper-model'),
            whisperDevice: document.getElementById('whisper-device'),
            personalRulesInput: document.getElementById('personal-rules-input'),
            saveRulesBtn: document.getElementById('save-rules-btn'),
            
            // Projects root
            projectsRootInput: document.getElementById('projects-root-input'),
            openProjectsRootBtn: document.getElementById('open-projects-root-btn'),
            saveProjectsRootBtn: document.getElementById('save-projects-root-btn')
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Navigation
        this.elements.navProjects.addEventListener('click', () => this.switchView('projects'));
        this.elements.navChat.addEventListener('click', () => {
            if (this.currentProject) {
                this.switchView('chat');
            } else {
                createToast('请先选择一个项目', 'warning');
            }
        });
        this.elements.navSettings.addEventListener('click', () => this.showSettings());
        
        // Projects
        this.elements.createProjectBtnMain.addEventListener('click', () => this.showCreateProjectModal());
        this.elements.createProjectForm.addEventListener('submit', (e) => this.handleCreateProject(e));
        this.elements.cancelCreateBtn.addEventListener('click', () => this.hideCreateProjectModal());
        
        // Chat input
        this.elements.messageInput.addEventListener('keydown', (e) => this.handleInputKeydown(e));
        if (this.elements.sendBtn) this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        if (this.elements.sendIconBtn) this.elements.sendIconBtn.addEventListener('click', () => this.sendMessage());
        this.elements.stopBtn.addEventListener('click', () => this.abortMessage());
        
        // Auto-resize textarea without jitter
        this.elements.messageInput.addEventListener('input', function() {
            // Only resize if content exceeds min-height
            const minHeight = 60;
            const maxHeight = 200;
            
            // Temporarily set to auto to get scrollHeight, but use a hidden clone to avoid jitter
            const currentHeight = this.offsetHeight;
            
            // Reset to min-height to measure actual content height
            this.style.height = minHeight + 'px';
            const scrollHeight = this.scrollHeight;
            
            // Set to the appropriate height
            const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
            this.style.height = newHeight + 'px';
        });
        
        // Files
        this.elements.attachBtn.addEventListener('click', () => this.elements.fileInput.click());
        this.elements.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Voice
        this.elements.voiceBtn.addEventListener('click', () => this.toggleVoiceRecording());
        
        // Session management
        this.elements.sessionSelect.addEventListener('change', (e) => this.handleSessionChange(e));
        this.elements.newSessionBtn.addEventListener('click', () => this.createNewSession());
        
        // Settings
        this.elements.closeSettingsBtn.addEventListener('click', () => this.hideSettings());
        this.elements.restartServerBtn.addEventListener('click', () => this.restartServer());
        this.elements.saveRulesBtn.addEventListener('click', () => this.savePersonalRules());
        
        // Projects root
        if (this.elements.openProjectsRootBtn) {
            this.elements.openProjectsRootBtn.addEventListener('click', () => this.openProjectsRootFolder());
        }
        if (this.elements.saveProjectsRootBtn) {
            this.elements.saveProjectsRootBtn.addEventListener('click', () => this.saveProjectsRoot());
        }
    }

    /**
     * Switch view
     */
    switchView(viewName) {
        this.currentView = viewName;
        
        // Update nav state
        this.elements.navProjects.classList.remove('bg-dark-bg', 'text-primary');
        this.elements.navChat.classList.remove('bg-dark-bg', 'text-primary');
        
        if (viewName === 'projects') {
            this.elements.projectsView.classList.remove('hidden');
            this.elements.chatView.classList.add('hidden');
            this.elements.navProjects.classList.add('bg-dark-bg', 'text-primary');
            this.loadProjects(); // Refresh projects
        } else if (viewName === 'chat') {
            this.elements.projectsView.classList.add('hidden');
            this.elements.chatView.classList.remove('hidden');
            this.elements.navChat.classList.add('bg-dark-bg', 'text-primary');
            this.scrollToBottom();
        }
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        showLoading('加载中...');
        
        try {
            // Check server status
            await this.checkServerStatus();
            
            // Load current project
            await this.loadCurrentProject();
            
            // Load projects
            await this.loadProjects();
            
            // Load models if we have a project
            if (this.currentProject) {
                await this.loadModels();
            }
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            createToast('加载初始化数据失败', 'error');
        } finally {
            hideLoading();
        }
    }

    /**
     * Check server status
     */
    async checkServerStatus() {
        try {
            const status = await this.api.getServerStatus();
            this.updateServerStatus(status.running);
        } catch (error) {
            console.error('Error checking server status:', error);
            this.updateServerStatus(false);
        }
    }

    /**
     * Update server status display
     */
    updateServerStatus(running) {
        if (this.elements.serverStatusDot) {
            this.elements.serverStatusDot.className = `w-3 h-3 rounded-full ${running ? 'bg-green-500' : 'bg-gray-500'} shadow-[0_0_8px_rgba(${running ? '16,185,129' : '107,114,128'},0.5)]`;
        }
        if (this.elements.serverStatusText) {
            this.elements.serverStatusText.textContent = running ? '运行中' : '已停止';
            this.elements.serverStatusText.className = `text-sm font-medium ${running ? 'text-green-400' : 'text-gray-400'}`;
        }
    }

    /**
     * Restart server
     */
    async restartServer() {
        showLoading('重启服务器中...');
        
        try {
            const directory = this.currentProject?.path || '';
            await this.api.restartServer(directory);
            
            // Wait and check status
            await new Promise(resolve => setTimeout(resolve, 3000));
            await this.checkServerStatus();
            
            createToast('服务器重启成功', 'success');
        } catch (error) {
            console.error('Error restarting server:', error);
            createToast('服务器重启失败', 'error');
        } finally {
            hideLoading();
        }
    }

    /**
     * Load current project
     */
    async loadCurrentProject() {
        try {
            const response = await this.api.getCurrentProject();
            this.currentProject = response.project;
            
            if (this.currentProject) {
                this.elements.currentProjectName.textContent = this.currentProject.name;
                // If we have a current project, we might want to load its history later
            } else {
                this.elements.currentProjectName.textContent = '未选择';
            }
        } catch (error) {
            console.error('Error loading current project:', error);
        }
    }

    /**
     * Load projects
     */
    async loadProjects() {
        try {
            const projects = await this.api.getProjects();
            this.renderProjectsGrid(projects);
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }

    /**
     * Render projects grid
     */
    renderProjectsGrid(projects) {
        this.elements.projectsGrid.innerHTML = '';
        
        if (projects.length === 0) {
            this.elements.projectsGrid.classList.add('hidden');
            this.elements.noProjectsMessage.classList.remove('hidden');
        } else {
            this.elements.projectsGrid.classList.remove('hidden');
            this.elements.noProjectsMessage.classList.add('hidden');
            
            projects.forEach(project => {
                const card = createProjectCard(
                    project, 
                    () => this.selectProject(project),
                    () => this.deleteProject(project.name),
                    () => this.openProjectFolder(project)
                );
                this.elements.projectsGrid.appendChild(card);
            });
        }
    }

    /**
     * Select project
     */
    async selectProject(project) {
        // If currently streaming, stop it first
        if (this.isStreaming) {
            await this.abortMessage();
        }

        showLoading('正在进入项目...');
        
        try {
            // Select project in backend
            await this.api.selectProject(project.name);
            this.currentProject = project;
            this.elements.currentProjectName.textContent = project.name;
            
            // Switch to chat view
            this.switchView('chat');
            
            // Load models and agents
            await this.loadModels();
            
            // Load chat history (sessions)
            await this.loadChatHistory(project);
            
            createToast(`已进入项目: ${project.name}`, 'success');
        } catch (error) {
            console.error('Error selecting project:', error);
            createToast('进入项目失败', 'error');
        } finally {
            hideLoading();
        }
    }
    
    /**
     * Load chat history and populate session dropdown
     */
    async loadChatHistory(project) {
        try {
            this.clearChat();
            
            // Get sessions
            const response = await this.api.getSessions(project.path);
            let sessions = [];
            
            if (Array.isArray(response)) {
                sessions = response;
            } else if (response.sessions) {
                sessions = response.sessions;
            }
            
            // Store sessions for later use
            this.sessions = sessions;
            
            // Populate session dropdown
            this.populateSessionDropdown(sessions);
            
            if (sessions && sessions.length > 0) {
                // Get last session (newest first, so pick [0])
                const lastSession = sessions[0]; 
                this.currentSession = lastSession.id;
                this.isFirstMessageInSession = false;
                
                // Update dropdown selection
                this.elements.sessionSelect.value = lastSession.id;
                
                // Load messages for this session
                await this.loadSessionMessages(project.path, lastSession.id);
                
                // Try to restore model/agent from session info
                if (lastSession.modelID && lastSession.providerID) {
                    this.currentModel = {
                        modelID: lastSession.modelID,
                        providerID: lastSession.providerID
                    };
                    // Update model select if available
                    if (this.elements.modelSelect) {
                        this.elements.modelSelect.value = lastSession.modelID;
                    }
                }
                if (lastSession.agent) {
                    this.currentAgent = lastSession.agent;
                    if (this.elements.agentSelect) {
                        this.elements.agentSelect.value = lastSession.agent;
                    }
                }
            } else {
                // No sessions, start fresh
                this.currentSession = null;
                this.isFirstMessageInSession = true;
                this.elements.welcomeMessage.style.display = 'block';
            }
            
        } catch (error) {
            console.error('Error loading history:', error);
            createToast('加载历史记录失败', 'error');
        }
    }
    
    /**
     * Populate session dropdown
     */
    populateSessionDropdown(sessions) {
        if (!this.elements.sessionSelect) return;
        
        let html = '';
        if (sessions && sessions.length > 0) {
            sessions.forEach((session, index) => {
                const title = session.title || `会话 ${index + 1}`;
                const date = session.time?.created 
                    ? new Date(session.time.created).toLocaleString('zh-CN', { 
                        month: 'short', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })
                    : '';
                html += `<option value="${session.id}">${title}${date ? ` (${date})` : ''}</option>`;
            });
        } else {
            html = '<option value="">无会话</option>';
        }
        
        this.elements.sessionSelect.innerHTML = html;
    }
    
    /**
     * Handle session change from dropdown
     */
    async handleSessionChange(e) {
        const sessionId = e.target.value;
        if (!sessionId || !this.currentProject) return;
        
        // If currently streaming, stop it first
        if (this.isStreaming) {
            await this.abortMessage();
        }
        
        showLoading('加载会话...');
        
        try {
            this.currentSession = sessionId;
            this.isFirstMessageInSession = false;
            
            // Clear and load messages
            this.clearChat();
            await this.loadSessionMessages(this.currentProject.path, sessionId);
            
            // Find session info and restore model/agent
            const session = this.sessions?.find(s => s.id === sessionId);
            if (session) {
                if (session.modelID && session.providerID) {
                    this.currentModel = {
                        modelID: session.modelID,
                        providerID: session.providerID
                    };
                    if (this.elements.modelSelect) {
                        this.elements.modelSelect.value = session.modelID;
                    }
                }
                if (session.agent) {
                    this.currentAgent = session.agent;
                    if (this.elements.agentSelect) {
                        this.elements.agentSelect.value = session.agent;
                    }
                }
            }
            
        } catch (error) {
            console.error('Error switching session:', error);
            createToast('切换会话失败', 'error');
        } finally {
            hideLoading();
        }
    }
    
    /**
     * Create new session
     */
    async createNewSession() {
        if (!this.currentProject) {
            createToast('请先选择一个项目', 'warning');
            return;
        }
        
        // If currently streaming, stop it first
        if (this.isStreaming) {
            await this.abortMessage();
        }
        
        try {
            // Create new session
            const session = await this.api.createSession(this.currentProject.path);
            this.currentSession = session.id;
            this.isFirstMessageInSession = true;
            
            // Clear chat
            this.clearChat();
            this.elements.welcomeMessage.style.display = 'block';
            
            // Refresh session list
            const response = await this.api.getSessions(this.currentProject.path);
            let sessions = [];
            if (Array.isArray(response)) {
                sessions = response;
            } else if (response.sessions) {
                sessions = response.sessions;
            }
            this.sessions = sessions;
            this.populateSessionDropdown(sessions);
            
            // Select the new session
            this.elements.sessionSelect.value = session.id;
            
            createToast('新会话已创建', 'success');
        } catch (error) {
            console.error('Error creating session:', error);
            createToast('创建会话失败', 'error');
        }
    }
    
    /**
     * Load messages for a specific session
     */
    async loadSessionMessages(projectPath, sessionId) {
        const messagesResponse = await this.api.getMessages(projectPath, sessionId);
        let messages = [];
        
        if (Array.isArray(messagesResponse)) {
            messages = messagesResponse;
        } else if (messagesResponse.messages) {
            messages = messagesResponse.messages;
        }
        
        // Check for pending questions for this session
        try {
            const pendingQuestions = await this.api.listPendingQuestions(projectPath);
            console.log('[App] Pending questions:', pendingQuestions);
            
            // Find pending question for this session
            const sessionPendingQuestion = pendingQuestions?.find(q => q.sessionID === sessionId);
            if (sessionPendingQuestion) {
                console.log('[App] Found pending question for this session:', sessionPendingQuestion.id);
                this.pendingQuestionRequestId = sessionPendingQuestion.id;
            } else {
                this.pendingQuestionRequestId = null;
            }
        } catch (error) {
            console.warn('[App] Could not fetch pending questions:', error);
            this.pendingQuestionRequestId = null;
        }
        
        // Extract model and agent info from the last message (user or assistant)
        if (messages && messages.length > 0) {
            // Find the last message with model/agent info
            for (let i = messages.length - 1; i >= 0; i--) {
                const msg = messages[i];
                const info = msg.info;
                
                if (info) {
                    let foundModel = false;
                    let foundAgent = false;
                    
                    // Restore model - check both formats:
                    // Format 1 (assistant): info.modelID, info.providerID
                    // Format 2 (user): info.model.modelID, info.model.providerID
                    const modelID = info.modelID || info.model?.modelID;
                    const providerID = info.providerID || info.model?.providerID;
                    
                    if (modelID && providerID) {
                        console.log('[App] Restoring model from history:', modelID, providerID);
                        this.currentModel = {
                            modelID: modelID,
                            providerID: providerID
                        };
                        
                        // Update model select dropdown
                        if (this.elements.modelSelect) {
                            this.elements.modelSelect.value = modelID;
                        }
                        foundModel = true;
                    }
                    
                    // Restore agent
                    if (info.agent) {
                        console.log('[App] Restoring agent from history:', info.agent);
                        this.currentAgent = info.agent;
                        
                        // Update agent select dropdown
                        if (this.elements.agentSelect) {
                            this.elements.agentSelect.value = info.agent;
                        }
                        foundAgent = true;
                    }
                    
                    // Found model or agent, stop searching
                    if (foundModel || foundAgent) {
                        break;
                    }
                }
            }
        }
        
        // Render messages
        if (messages && messages.length > 0) {
            this.elements.welcomeMessage.style.display = 'none';
            messages.forEach((msg, index) => {
                const isLast = index === messages.length - 1;
                this.renderHistoricalMessage(msg, isLast);
            });
            this.scrollToBottom();
        } else {
            this.elements.welcomeMessage.style.display = 'block';
        }
    }
    
    /**
     * Render historical message with full Markdown support
     */
    renderHistoricalMessage(msg, isLast = false) {
        // Support both direct role and info.role structure
        const role = msg.role || msg.info?.role;
        const parts = msg.parts || [];
        
        if (role === 'user') {
            // User message - extract text from parts or content
            let text = '';
            let attachments = [];
            
            if (parts && Array.isArray(parts) && parts.length > 0) {
                parts.forEach(part => {
                    if (part.type === 'text') {
                        let textVal = part.text;
                        if (typeof textVal === 'object') textVal = JSON.stringify(textVal, null, 2);
                        text += textVal || '';
                    } else if (part.type === 'file') {
                        attachments.push({ name: part.filename || 'file' });
                    }
                });
            } else if (msg.content) {
                text = msg.content;
            }
            
            const userMsg = createUserMessage(text, attachments);
            this.elements.chatContainer.appendChild(userMsg);
            
        } else if (role === 'assistant') {
            const assistantMsg = createAssistantMessage();
            this.elements.chatContainer.appendChild(assistantMsg);
            
            let textContent = '';
            let reasoningText = '';
            const toolCalls = [];
            const subagents = [];
            const questionnaires = [];
            
            // Process parts if available
            if (parts && Array.isArray(parts) && parts.length > 0) {
                parts.forEach(part => {
                    switch (part.type) {
                        case 'text':
                            let textVal = part.text;
                            if (typeof textVal === 'object') textVal = JSON.stringify(textVal, null, 2);
                            textContent += textVal || '';
                            break;
                        case 'reasoning':
                            reasoningText = part.text || '';
                            break;
                        case 'tool':
                            const toolData = {
                                tool: part.tool,
                                status: part.state?.status || 'completed',
                                input: part.state?.input,
                                output: part.state?.output,
                                title: part.state?.title,
                                error: part.state?.error
                            };
                            if (part.tool === 'task') {
                                subagents.push({
                                    ...toolData,
                                    subagentType: part.state?.input?.subagent_type || 'general',
                                    description: part.state?.input?.description || ''
                                });
                            } else if (part.tool === 'question' && part.state?.input?.questions) {
                                // Check if question is already answered
                                // If status is 'completed' and output exists, it's answered
                                const isAnswered = part.state?.status === 'completed' && part.state?.output;
                                questionnaires.push({
                                    ...part.state.input,
                                    _isAnswered: isAnswered,
                                    _output: part.state?.output
                                });
                            } else {
                                toolCalls.push(toolData);
                            }
                            break;
                    }
                });
            } else if (msg.content) {
                textContent = msg.content;
            }
            
            // Add reasoning section if present
            if (reasoningText) {
                addThinkingSection(assistantMsg, reasoningText);
            }
            
            // Add subagent panels
            subagents.forEach(subagent => {
                addSubagentToMessage(assistantMsg, subagent);
            });

            // Add questionnaires (from history)
            questionnaires.forEach(qData => {
                if (qData._isAnswered) {
                    // Question already answered - show as read-only with answer
                    addAnsweredQuestionToMessage(assistantMsg, qData);
                } else {
                    // Question not answered - show interactive form
                    addQuestionnaireToMessage(assistantMsg, qData, (answers) => {
                        // For historical messages with pending questions, we already have the requestId
                        // from loadSessionMessages() which fetched pending questions
                        this.submitQuestionnaire(answers, qData.questions);
                    });
                    
                    // If this is the last message and we have a pending question, show input mode
                    if (isLast && this.pendingQuestionRequestId) {
                        this.setInputQuestionMode(true);
                        updateStatus('等待回复...', '❓');
                        
                        // Connect SSE to receive AI's response after user answers
                        this.connectEventStream();
                    }
                }
            });
            
            // Add tool results
            toolCalls.forEach(tool => {
                addToolResult(assistantMsg, tool);
            });
            
            // Add text content with full Markdown rendering
            if (textContent) {
                appendTextToMessage(assistantMsg, textContent);
            }
        }
    }

    /**
     * Delete project
     */
    async deleteProject(name) {
        if (!confirm(`确定要删除项目 "${name}" 吗？此操作不可恢复。`)) {
            return;
        }
        
        showLoading('正在删除...');
        
        try {
            await this.api.deleteProject(name);
            await this.loadProjects();
            
            if (this.currentProject?.name === name) {
                this.currentProject = null;
                this.elements.currentProjectName.textContent = '未选择';
                this.switchView('projects');
            }
            
            createToast(`项目 "${name}" 已删除`, 'success');
        } catch (error) {
            console.error('Error deleting project:', error);
            createToast('删除项目失败', 'error');
        } finally {
            hideLoading();
        }
    }

    /**
     * Show create project modal
     */
    showCreateProjectModal() {
        this.elements.createProjectModal.classList.remove('hidden');
        this.elements.projectNameInput.value = '';
        this.elements.projectNameInput.focus();
    }

    /**
     * Hide create project modal
     */
    hideCreateProjectModal() {
        this.elements.createProjectModal.classList.add('hidden');
    }

    /**
     * Handle create project form submission
     */
    async handleCreateProject(e) {
        e.preventDefault();
        
        const name = this.elements.projectNameInput.value.trim();
        if (!name) return;
        
        this.hideCreateProjectModal();
        showLoading('创建项目中...');
        
        try {
            await this.api.createProject(name);
            const project = { name, path: `projects/${name}` }; // Fallback if api doesn't return full obj
            // Ideally get the new project object
            await this.loadProjects(); // Refresh list
            
            // Find the new project and select it
            const projects = await this.api.getProjects();
            const newProject = projects.find(p => p.name === name);
            
            if (newProject) {
                await this.selectProject(newProject);
            }
            
            createToast(`项目 "${name}" 创建成功`, 'success');
        } catch (error) {
            console.error('Error creating project:', error);
            createToast('创建项目失败', 'error');
        } finally {
            hideLoading();
        }
    }

    /**
     * Load models and agents
     */
    async loadModels() {
        if (!this.currentProject) return;
        
        this.models = [];
        this.agents = [];
        
        try {
            // Get Providers (Models) - only show CONNECTED providers
            const providerResponse = await this.api.getProviders(this.currentProject.path);
            
            // Get connected provider IDs
            const connectedIds = providerResponse.connected || [];
            
            // Models to hide
            const hiddenModels = ['gpt-5-nano', 'big-pickle', 'GPT-5 Nano', 'Big Pickle'];
            
            if (providerResponse.all && Array.isArray(providerResponse.all)) {
                providerResponse.all.forEach(provider => {
                    // Only include models from connected providers
                    if (!connectedIds.includes(provider.id)) {
                        return;
                    }
                    
                    const providerName = provider.name || provider.id;
                    
                    if (provider.models && typeof provider.models === 'object') {
                        Object.entries(provider.models).forEach(([modelId, modelInfo]) => {
                            const modelName = modelInfo.name || modelId;
                            
                            // Skip hidden models
                            if (hiddenModels.some(h => 
                                modelId.toLowerCase().includes(h.toLowerCase()) || 
                                modelName.toLowerCase().includes(h.toLowerCase())
                            )) {
                                return;
                            }
                            
                            this.models.push({
                                id: modelId,
                                providerId: provider.id,
                                providerName: providerName,
                                name: modelName,
                                type: 'model'
                            });
                        });
                    }
                });
            }
            
            // Store default model info
            if (providerResponse.default) {
                this.defaultModel = providerResponse.default;
            }
            
        } catch (error) {
            console.error('Error loading models:', error);
        }
        
        // Get Agents
        try {
            const agentResponse = await this.api.getAgents(this.currentProject.path);
            // Response can be array or object with agents
            let agentsList = [];
            
            if (Array.isArray(agentResponse)) {
                agentsList = agentResponse;
            } else if (agentResponse && agentResponse.agents) {
                agentsList = agentResponse.agents;
            } else if (agentResponse && typeof agentResponse === 'object') {
                // Maybe it's an object with agent names as keys
                agentsList = Object.values(agentResponse);
            }
            
            // Filter: only show agents that are not subagent and not hidden
            agentsList.forEach(agent => {
                if (agent.mode === 'subagent' || agent.hidden) {
                    return;
                }
                this.agents.push({
                    id: agent.name || agent.id,
                    name: agent.name || agent.id,
                    description: agent.description || '',
                    type: 'agent'
                });
            });
        } catch (err) {
            console.warn('Failed to load agents:', err);
        }
        
        // Populate select
        this.renderModelSelect();
    }

    /**
     * Render model and agent select dropdowns (separate)
     */
    renderModelSelect() {
        // === Agent Select ===
        let agentHtml = '';
        if (this.agents.length > 0) {
            this.agents.forEach(agent => {
                const isDefault = agent.id === 'build';
                agentHtml += `<option value="${agent.id}" ${isDefault ? 'selected' : ''}>${agent.name}</option>`;
            });
        } else {
            agentHtml = '<option value="">无可用 Agent</option>';
        }
        this.elements.agentSelect.innerHTML = agentHtml;
        
        // Set default agent to "build"
        const buildOption = this.elements.agentSelect.querySelector('option[value="build"]');
        if (buildOption) {
            this.elements.agentSelect.value = 'build';
            this.currentAgent = 'build';
        } else if (this.agents.length > 0) {
            this.currentAgent = this.agents[0].id;
        }
        
        // Agent change handler
        this.elements.agentSelect.onchange = (e) => {
            this.currentAgent = e.target.value;
            console.log('Agent changed to:', this.currentAgent);
        };
        
        // === Model Select ===
        let modelHtml = '';
        if (this.models.length > 0) {
            const providerGroups = {};
            this.models.forEach(m => {
                const key = m.providerName || m.providerId || 'Other';
                if (!providerGroups[key]) providerGroups[key] = [];
                providerGroups[key].push(m);
            });
            
            Object.entries(providerGroups).forEach(([providerName, models]) => {
                modelHtml += `<optgroup label="${providerName}">`;
                models.forEach(model => {
                    modelHtml += `<option value="${model.id}" data-provider="${model.providerId}">${model.name}</option>`;
                });
                modelHtml += `</optgroup>`;
            });
        } else {
            modelHtml = '<option value="">无可用模型</option>';
        }
        this.elements.modelSelect.innerHTML = modelHtml;
        
        // Set default model with priority:
        // 1. Keep current model if already set (from history or previous selection)
        // 2. Prefer "grok-code-fast-1" if available in connected providers
        // 3. Fall back to API default
        // 4. Fall back to first available model
        
        const preferredModelId = 'grok-code-fast-1';
        const preferredModel = this.models.find(m => m.id === preferredModelId);
        
        if (this.currentModel && this.currentModel.modelID) {
            // Keep current model if it's still available
            const currentStillAvailable = this.models.find(m => m.id === this.currentModel.modelID);
            if (currentStillAvailable) {
                this.elements.modelSelect.value = this.currentModel.modelID;
                console.log('[App] Keeping current model:', this.currentModel.modelID);
            } else if (preferredModel) {
                // Current model not available, use preferred
                this.elements.modelSelect.value = preferredModelId;
                this.currentModel = {
                    modelID: preferredModelId,
                    providerID: preferredModel.providerId
                };
                console.log('[App] Current model unavailable, using preferred:', preferredModelId);
            } else if (this.defaultModel && this.defaultModel.modelID) {
                // Use API default
                this.elements.modelSelect.value = this.defaultModel.modelID;
                this.currentModel = this.defaultModel;
                console.log('[App] Using API default model:', this.defaultModel.modelID);
            } else if (this.models.length > 0) {
                // Use first available
                this.currentModel = {
                    modelID: this.models[0].id,
                    providerID: this.models[0].providerId
                };
                console.log('[App] Using first available model:', this.models[0].id);
            }
        } else if (preferredModel) {
            // No current model, use preferred
            this.elements.modelSelect.value = preferredModelId;
            this.currentModel = {
                modelID: preferredModelId,
                providerID: preferredModel.providerId
            };
            console.log('[App] Setting preferred default model:', preferredModelId);
        } else if (this.defaultModel && this.defaultModel.modelID) {
            // Use API default
            this.elements.modelSelect.value = this.defaultModel.modelID;
            this.currentModel = this.defaultModel;
            console.log('[App] Using API default model:', this.defaultModel.modelID);
        } else if (this.models.length > 0) {
            // Use first available
            this.currentModel = {
                modelID: this.models[0].id,
                providerID: this.models[0].providerId
            };
            console.log('[App] Using first available model:', this.models[0].id);
        }
        
        // Model change handler
        this.elements.modelSelect.onchange = (e) => {
            const selectedOption = e.target.selectedOptions[0];
            this.currentModel = {
                modelID: e.target.value,
                providerID: selectedOption.dataset.provider
            };
            console.log('Model changed to:', this.currentModel);
        };
    }

    /**
     * Clear chat
     */
    clearChat() {
        this.elements.chatContainer.innerHTML = '';
        this.elements.chatContainer.appendChild(this.elements.welcomeMessage);
        this.currentMessageEl = null;
        this.currentMessageText = '';
    }

    /**
     * Handle input keydown
     */
    handleInputKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
        }
    }

    /**
     * Set input question mode state
     */
    setInputQuestionMode(active) {
        if (!this.elements.messageInput) return;
        
        if (active) {
            this.elements.messageInput.placeholder = "👆 小朋友，请先在上面的卡片里回答问题哦！";
            // Add highlighting styles
            this.elements.messageInput.classList.add('bg-yellow-50', 'border-yellow-400', 'text-yellow-800', 'placeholder-yellow-600');
            this.elements.messageInput.classList.remove('bg-dark-bg', 'border-dark-border');
            this.isQuestionPending = true;
        } else {
            this.elements.messageInput.placeholder = "输入消息...";
            // Remove highlighting styles
            this.elements.messageInput.classList.remove('bg-yellow-50', 'border-yellow-400', 'text-yellow-800', 'placeholder-yellow-600');
            this.elements.messageInput.classList.add('bg-dark-bg', 'border-dark-border');
            this.elements.messageInput.disabled = false;
            this.isQuestionPending = false;
        }
    }

    /**
     * Send message
     */
    async sendMessage(content = null, explicitAttachments = null) {
        if (!this.currentProject) {
            createToast('请先选择一个项目', 'warning');
            return;
        }
        
        // Reset question pending state if user manually sends a message
        if (this.isQuestionPending) {
            this.setInputQuestionMode(false);
        }
        
        // Determine text and files
        let text = '';
        let files = [];
        
        if (content !== null) {
            text = content;
            files = explicitAttachments || [];
        } else {
            text = this.elements.messageInput.value.trim();
            files = this.attachedFiles;
        }
        
        if (!text && files.length === 0) return;
        
        if (this.isStreaming) return;
        
        // Create session if needed
        let isNewSession = false;
        if (!this.currentSession) {
            try {
                const session = await this.api.createSession(this.currentProject.path);
                this.currentSession = session.id;
                isNewSession = true;
                this.isFirstMessageInSession = true;
            } catch (error) {
                console.error('Error creating session:', error);
                createToast('创建会话失败', 'error');
                return;
            }
        }
        
        // Build message parts
        const parts = [];
        for (const file of files) {
            const fileData = await this.readFileAsDataURL(file);
            parts.push({
                type: 'file',
                mime: file.type,
                filename: file.name,
                url: fileData
            });
        }
        
        if (text) {
            // Prepend personal rules to first message in session
            let messageText = text;
            if (this.isFirstMessageInSession && this.personalRules && this.personalRules.trim()) {
                messageText = `[个人规则]\n${this.personalRules.trim()}\n\n[用户消息]\n${text}`;
                this.isFirstMessageInSession = false;
            }
            
            parts.push({
                type: 'text',
                text: messageText
            });
        }
        
        // UI Update
        const userMsg = createUserMessage(text, files);
        this.elements.chatContainer.appendChild(userMsg);
        
        // Clear input only if we used the input
        if (content === null) {
            this.elements.messageInput.value = '';
            this.elements.messageInput.style.height = '60px'; // Reset to min height
            this.attachedFiles = [];
            this.elements.attachmentsPreview.innerHTML = '';
            this.elements.attachmentsPreview.classList.add('hidden');
        }
        
        this.elements.welcomeMessage.style.display = 'none';
        
        this.startAssistantMessage();
        
        this.isStreaming = true;
        if (this.elements.sendBtn) this.elements.sendBtn.classList.add('hidden');
        if (this.elements.sendIconBtn) this.elements.sendIconBtn.classList.add('hidden');
        this.elements.stopBtn.classList.remove('hidden');
        updateStatus('生成中...', '⏳');
        
        // Connect to SSE first
        this.connectEventStream();
        
        // Small delay to ensure SSE connection is established
        await new Promise(resolve => setTimeout(resolve, 200));
        
        try {
            // Send message - the response comes via SSE OR synchronously
            const response = await this.api.sendMessage(
                this.currentProject.path,
                this.currentSession,
                parts,
                this.currentModel
            );
            
            // If we get a full response here, process it directly
            // This is a fallback if SSE doesn't work
            if (response && response.parts && response.parts.length > 0) {
                console.log('[FALLBACK] Processing synchronous response');
                this.processMessageResponse(response);
                this.stopStreaming();
                updateStatus('准备就绪', '⚡');
            }
            // Otherwise, SSE should handle the streaming
        } catch (error) {
            // Ignore 504 Gateway Timeout if SSE is active (backend processing took too long but stream is alive)
            if (error.toString().includes('504') && this.eventStream) {
                console.warn('POST request timed out (504), but SSE stream is active. Continuing...');
                return;
            }
            
            console.error('Error sending message:', error);
            createToast('发送消息失败', 'error');
            this.stopStreaming();
            updateStatus('准备就绪', '⚡');
        }
        
        this.scrollToBottom();
    }

    /**
     * Read file as data URL
     */
    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Start assistant message
     */
    startAssistantMessage() {
        this.currentMessageEl = createAssistantMessage();
        this.elements.chatContainer.appendChild(this.currentMessageEl);
        this.currentMessageText = '';
        
        // Add streaming indicator with anime quotes
        addStreamingIndicator(this.currentMessageEl);
    }

    /**
     * Connect to event stream
     */
    connectEventStream() {
        if (!this.currentProject) return;
        
        const projectPath = this.currentProject.path;
        console.log('[SSE] Connecting for directory:', projectPath);
        
        if (this.eventStream) {
            console.log('[SSE] Disconnecting previous stream');
            this.eventStream.disconnect();
        }
        
        this.eventStream = new EventStream(
            projectPath,
            (eventType, data) => {
                console.log('[SSE EVENT]', eventType, data);
                this.handleStreamEvent(eventType, data);
            }
        );
        
        this.eventStream.connect();
    }

    /**
     * Process message response from POST (synchronous response)
     */
    processMessageResponse(response) {
        const { info, parts } = response;
        
        if (!parts || parts.length === 0) return;
        
        let textContent = '';
        let reasoningText = '';
        const toolCalls = [];
        
        // Process all parts
        for (const part of parts) {
            switch (part.type) {
                case 'text':
                    let textVal = part.text;
                    if (typeof textVal === 'object') textVal = JSON.stringify(textVal, null, 2);
                    textContent += textVal || '';
                    break;
                    
                case 'reasoning':
                    reasoningText = part.text || '';
                    break;
                    
                case 'tool':
                    toolCalls.push({
                        tool: part.tool,
                        status: part.state?.status || 'completed',
                        input: part.state?.input,
                        output: part.state?.output,
                        title: part.state?.title,
                        error: part.state?.error
                    });
                    break;
                    
                case 'step-start':
                case 'step-finish':
                    // Skip step markers
                    break;
                    
                default:
                    console.log('Unknown part type:', part.type, part);
            }
        }
        
        // Add reasoning section if present
        if (reasoningText) {
            addThinkingSection(this.currentMessageEl, reasoningText);
        }
        
        // Add tool results
        for (const tool of toolCalls) {
            addToolResult(this.currentMessageEl, tool);
        }
        
        // Add text content
        if (textContent) {
            appendTextToMessage(this.currentMessageEl, textContent);
        }
        
        // Add footer with token info
        if (info) {
            addMessageFooter(this.currentMessageEl, {
                finish: info.finish,
                tokens: info.tokens,
                cost: info.cost
            });
        }
        
        this.scrollToBottom();
    }
    
    /**
     * Handle stream event (for SSE)
     * Enhanced with subagent support for TUI-like experience
     */
    handleStreamEvent(eventType, data) {
        console.log('[APP EVENT]', eventType, data);
        
        // Normalize keys from Python backend (which uses _ prefix for enhancements)
        if (data && typeof data === 'object') {
            if (data._subagent_parsed) data.parsed = data._subagent_parsed;
            if (data._subagent_type) data.subagentType = data._subagent_type;
            if (data._subagent_description) data.description = data._subagent_description;
            
            // Extract tool summary from metadata if available (for real-time updates)
            const part = data.properties?.part;
            const metadata = part?.state?.input?.metadata;
            if (metadata?.summary && Array.isArray(metadata.summary)) {
                data.toolSummary = {
                    list: metadata.summary
                };
            }
        }
        
        switch (eventType) {
            case 'text_delta':
                let delta = data.delta;
                if (typeof delta === 'object') delta = JSON.stringify(delta, null, 2);
                this.currentMessageText += (delta || '');
                appendTextToMessage(this.currentMessageEl, this.currentMessageText);
                this.scrollToBottom();
                break;
            
            case 'reasoning':
                addThinkingSection(this.currentMessageEl, data.text);
                this.scrollToBottom();
                break;
            
            // Regular tool events
            case 'tool_pending':
            case 'tool_running':
            case 'tool_completed':
            case 'tool_failed':
                this.handleToolEvent(eventType, data);
                break;
            
            // Subagent events (TUI-like feature)
            case 'subagent_pending':
            case 'subagent_running':
                this.handleSubagentStart(data);
                break;
            
            case 'subagent_completed':
                this.handleSubagentComplete(data);
                break;
            
            case 'subagent_failed':
                this.handleSubagentFailed(data);
                break;
            
            case 'subagent_update':
                this.handleSubagentUpdate(data);
                break;
            
            // Step events for progress tracking
            case 'step_start':
                this.handleStepStart(data);
                break;
            
            case 'step_finish':
                this.handleStepFinish(data);
                break;
            
            case 'message_complete':
                addMessageFooter(this.currentMessageEl, data);
                this.cleanupAfterMessage();
                this.stopStreaming();
                updateStatus('准备就绪', '⚡');
                break;
            
             case 'message_tool_calls':
                 // AI is calling tools, update status
                 updateStatus('执行工具...', '🔧');
                 break;

             case 'question_asked':
                 // Handle question.asked event
                 // data contains: { id, sessionID, questions, tool }
                 if (!this.currentMessageEl) return;

                 // Save the question request ID for reply
                 this.pendingQuestionRequestId = data.id;
                 console.log('[App] Question asked, requestId:', data.id);

                 // Remove streaming indicator before adding questionnaire
                 removeStreamingIndicator(this.currentMessageEl);
                 
                 // Add questionnaire to current message
                 // Pass the questions array and a callback that formats answers correctly
                 addQuestionnaireToMessage(this.currentMessageEl, data, (answers) => {
                     this.submitQuestionnaire(answers, data.questions);
                 });
                 this.scrollToBottom();
                 
                 // DON'T disconnect SSE! We need it to receive AI's response after user answers
                 // Just update UI state to show we're waiting for user input
                 this.isStreaming = false;  // Allow user to interact
                 if (this.elements.sendBtn) this.elements.sendBtn.classList.remove('hidden');
                 if (this.elements.sendIconBtn) this.elements.sendIconBtn.classList.remove('hidden');
                 this.elements.stopBtn.classList.add('hidden');
                 updateStatus('等待回复...', '❓');
                 
                 // Guide user to the questionnaire
                 this.setInputQuestionMode(true);
                 break;

             case 'session_error':
                createToast('会话错误: ' + (data.error || '未知错误'), 'error');
                this.cleanupAfterMessage();
                this.stopStreaming();
                break;
            
            case 'session_idle':
                // Session is idle, cleanup
                this.cleanupAfterMessage();
                break;
            
            default:
                // console.log('Unhandled event:', eventType, data);
                break;
        }
    }
    
    /**
     * Handle regular tool events
     */
    handleToolEvent(eventType, data) {
        // Check for 'question' tool
        if (data.tool === 'question' && data.input?.questions) {
            const existing = this.currentMessageEl?.querySelector(`[data-tool-id="${data.id}"]`);
            if (existing) return; // Already rendered
            
            // Note: When question comes via tool event, we may not have the requestID
            // The proper requestID comes from question.asked event
            // For tool events, data.id is the tool call ID, not question request ID
            console.log('[App] Question tool detected, tool id:', data.id);
            
            addQuestionnaireToMessage(this.currentMessageEl, data.input, (answers) => {
                this.submitQuestionnaire(answers, data.input.questions);
            });
            return;
        }

        // Check if we already have this tool result displayed
        const existingTool = this.currentMessageEl?.querySelector(`[data-tool-id="${data.id}"]`);
        
        if (existingTool) {
            // Update existing tool result with all available data
            updateToolStatus(existingTool, data.status, data.output, data.input, data.error);
        } else {
            // Add new tool result
            const toolEl = addToolResult(this.currentMessageEl, data);
            if (toolEl && data.id) {
                toolEl.dataset.toolId = data.id;
            }
        }
        
        // Keep streaming indicator at the bottom
        moveStreamingIndicatorToBottom(this.currentMessageEl);
        this.scrollToBottom();
    }
    
    /**
     * Submit questionnaire answers via the correct Question API
     * @param {Object} answers - Raw answers from questionnaire component (keyed by question header)
     * @param {Array} questions - Original questions array from question.asked event
     */
    async submitQuestionnaire(answers, questions) {
        console.log('[App] Submitting questionnaire answers:', answers);
        console.log('[App] Question requestId:', this.pendingQuestionRequestId);
        
        // Re-enable input
        this.setInputQuestionMode(false);
        
        if (!this.pendingQuestionRequestId) {
            console.warn('[App] No pending question request ID, falling back to message send');
            // Fallback: send as regular message (not ideal but works)
            const text = "我已提交以下回答：\n" + JSON.stringify(answers, null, 2);
            this.sendMessage(text);
            return;
        }
        
        if (!this.currentProject) {
            createToast('错误：没有选中的项目', 'error');
            return;
        }
        
        try {
            // Convert answers to the format expected by OpenCode Question API
            // OpenCode expects: { answers: [["answer1"], ["answer2", "answer3"], ...] }
            // Each question gets an array of selected labels
            
            let formattedAnswers;
            if (questions && Array.isArray(questions)) {
                // Convert using questions order
                formattedAnswers = questions.map((q, idx) => {
                    const questionKey = q.header || `Question ${idx + 1}`;
                    const answer = answers[questionKey];
                    
                    if (Array.isArray(answer)) {
                        return answer;  // Multiple choice already in array format
                    } else if (answer !== undefined && answer !== null) {
                        return [String(answer)];  // Single choice or text input
                    }
                    return [];  // No answer
                });
            } else {
                // Fallback: convert object values to arrays
                formattedAnswers = Object.values(answers).map(a => 
                    Array.isArray(a) ? a : (a ? [String(a)] : [])
                );
            }
            
            console.log('[App] Formatted answers for API:', formattedAnswers);
            
            // Call the Question Reply API
            updateStatus('提交回答中...', '⏳');
            
            const result = await this.api.replyQuestion(
                this.currentProject.path,  // Use path, not the object
                this.pendingQuestionRequestId,
                formattedAnswers
            );
            
            console.log('[App] Question reply result:', result);
            
            // Clear pending question
            this.pendingQuestionRequestId = null;
            
            // AI will continue processing after receiving the answer
            // The SSE event stream is ALREADY connected (we didn't disconnect it)
            // Just set the streaming state and update UI
            this.isStreaming = true;
            if (this.elements.sendBtn) this.elements.sendBtn.classList.add('hidden');
            if (this.elements.sendIconBtn) this.elements.sendIconBtn.classList.add('hidden');
            this.elements.stopBtn.classList.remove('hidden');
            updateStatus('处理中...', '⏳');
            
            console.log('[App] Question answered, waiting for AI to continue via SSE...');
            
        } catch (error) {
            console.error('[App] Error submitting questionnaire:', error);
            createToast('提交回答失败: ' + error.message, 'error');
            
            // Clear pending question on error
            this.pendingQuestionRequestId = null;
            updateStatus('准备就绪', '⚡');
        }
    }
    
    /**
     * Handle subagent start event (pending/running)
     */
    handleSubagentStart(data) {
        if (!this.currentMessageEl) return;
        
        const subagentId = data.id || `subagent-${Date.now()}`;
        
        // Check if we already have a panel for this subagent
        let panel = this.activeSubagents.get(subagentId);
        
        if (panel) {
            // Update existing panel
            updateSubagentPanel(panel, data);
        } else {
            // Create new subagent panel
            panel = addSubagentToMessage(this.currentMessageEl, data);
            if (panel) {
                this.activeSubagents.set(subagentId, panel);
            }
        }
        
        // Keep streaming indicator at the bottom
        moveStreamingIndicatorToBottom(this.currentMessageEl);
        
        // Add to progress tracker
        this.addProgressStep({
            id: subagentId,
            name: `Subagent: ${data.subagentType || 'general'}`,
            description: data.description,
            status: data.status
        });
        
        updateStatus(`执行 Subagent: ${data.subagentType || 'general'}...`, '📦');
        this.scrollToBottom();
    }
    
    /**
     * Handle subagent completion
     */
    handleSubagentComplete(data) {
        const subagentId = data.id;
        const panel = this.activeSubagents.get(subagentId);
        
        if (panel) {
            updateSubagentPanel(panel, data);
            this.activeSubagents.delete(subagentId);
        } else {
            // If panel doesn't exist (rare case), create it
            addSubagentToMessage(this.currentMessageEl, data);
        }
        
        // Update progress step
        this.updateProgressStep(subagentId, 'completed');
        
        updateStatus('处理中...', '⏳');
        this.scrollToBottom();
    }
    
    /**
     * Handle subagent failure
     */
    handleSubagentFailed(data) {
        const subagentId = data.id;
        const panel = this.activeSubagents.get(subagentId);
        
        if (panel) {
            updateSubagentPanel(panel, data);
            this.activeSubagents.delete(subagentId);
        } else {
            addSubagentToMessage(this.currentMessageEl, data);
        }
        
        // Update progress step
        this.updateProgressStep(subagentId, 'failed');
        
        createToast(`Subagent 执行失败: ${data.subagentType || 'unknown'}`, 'error');
        this.scrollToBottom();
    }
    
    /**
     * Handle subagent update (generic update)
     */
    handleSubagentUpdate(data) {
        const subagentId = data.id;
        const panel = this.activeSubagents.get(subagentId);
        
        if (panel) {
            updateSubagentPanel(panel, data);
        }
    }
    
    /**
     * Handle step start event
     */
    handleStepStart(data) {
        // Could be used for progress tracking
        console.log('[STEP START]', data);
    }
    
    /**
     * Handle step finish event
     */
    handleStepFinish(data) {
        console.log('[STEP FINISH]', data);
    }
    
    /**
     * Add a step to progress tracker
     */
    addProgressStep(step) {
        // Check if step already exists
        const existingIndex = this.progressSteps.findIndex(s => s.id === step.id);
        
        if (existingIndex >= 0) {
            this.progressSteps[existingIndex] = step;
        } else {
            this.progressSteps.push(step);
        }
        
        // Update or create progress tracker UI
        this.updateProgressTrackerUI();
    }
    
    /**
     * Update a progress step status
     */
    updateProgressStep(stepId, status) {
        const step = this.progressSteps.find(s => s.id === stepId);
        if (step) {
            step.status = status;
            this.updateProgressTrackerUI();
        }
    }
    
    /**
     * Update progress tracker UI
     */
    updateProgressTrackerUI() {
        // Only show progress tracker if we have steps
        if (this.progressSteps.length === 0) {
            if (this.progressTracker) {
                this.progressTracker.remove();
                this.progressTracker = null;
            }
            return;
        }
        
        if (this.progressTracker) {
            // Update existing tracker
            updateProgressTracker(this.progressTracker.id, this.progressSteps);
        } else {
            // Create new tracker
            this.progressTracker = createProgressTracker(this.progressSteps, {
                id: 'main-progress-tracker',
                title: '📋 执行进度',
                position: 'fixed'
            });
            document.body.appendChild(this.progressTracker);
        }
    }
    
    /**
     * Cleanup after message is complete
     */
    cleanupAfterMessage() {
        // Clear active subagents
        this.activeSubagents.clear();
        
        // Clear progress steps after a delay
        setTimeout(() => {
            this.progressSteps = [];
            if (this.progressTracker) {
                this.progressTracker.remove();
                this.progressTracker = null;
            }
        }, 3000);  // Keep progress visible for 3 seconds after completion
    }

    /**
     * Stop streaming
     */
    stopStreaming() {
        this.isStreaming = false;
        if (this.elements.sendBtn) this.elements.sendBtn.classList.remove('hidden');
        if (this.elements.sendIconBtn) this.elements.sendIconBtn.classList.remove('hidden');
        this.elements.stopBtn.classList.add('hidden');
        
        if (this.eventStream) {
            this.eventStream.disconnect();
            this.eventStream = null;
        }
    }

    /**
     * Abort message
     */
    async abortMessage() {
        if (!this.currentSession || !this.currentProject) return;
        
        try {
            await this.api.abortSession(this.currentProject.path, this.currentSession);
            createToast('生成已停止', 'info');
        } catch (error) {
            console.error('Error aborting message:', error);
        } finally {
            this.stopStreaming();
            updateStatus('准备就绪', '⚡');
        }
    }

    /**
     * Scroll chat to bottom
     */
    scrollToBottom() {
        this.elements.chatContainer.scrollTop = this.elements.chatContainer.scrollHeight;
    }

    /**
     * Handle file select
     */
    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        
        files.forEach(file => {
            this.attachedFiles.push(file);
            
            const preview = createFilePreview(file, (removedFile) => {
                const index = this.attachedFiles.indexOf(removedFile);
                if (index > -1) {
                    this.attachedFiles.splice(index, 1);
                }
                if (this.attachedFiles.length === 0) {
                    this.elements.attachmentsPreview.classList.add('hidden');
                }
            });
            
            this.elements.attachmentsPreview.appendChild(preview);
        });
        
        if (this.attachedFiles.length > 0) {
            this.elements.attachmentsPreview.classList.remove('hidden');
        }
        
        e.target.value = '';
    }

    /**
     * Toggle voice recording
     */
    async toggleVoiceRecording() {
        if (this.isRecording) {
            await this.stopVoiceRecording();
        } else {
            await this.startVoiceRecording();
        }
    }

    /**
     * Start voice recording
     */
    async startVoiceRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (e) => {
                this.audioChunks.push(e.data);
            };
            
            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                await this.transcribeAudio(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            this.elements.voiceBtn.classList.add('recording', 'bg-red-500', 'text-white');
            this.elements.voiceBtn.classList.remove('text-gray-400');
            createToast('正在录音...', 'info');
            
        } catch (error) {
            console.error('Error starting recording:', error);
            createToast('无法启动录音', 'error');
        }
    }

    /**
     * Stop voice recording
     */
    async stopVoiceRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.elements.voiceBtn.classList.remove('recording', 'bg-red-500', 'text-white');
            this.elements.voiceBtn.classList.add('text-gray-400');
        }
    }

    /**
     * Transcribe audio
     */
    async transcribeAudio(audioBlob) {
        showLoading('正在转录...');
        
        try {
            const response = await this.api.transcribeAudio(audioBlob);
            
            if (response.text) {
                this.elements.messageInput.value += (this.elements.messageInput.value ? ' ' : '') + response.text;
                // Trigger input event to resize textarea
                this.elements.messageInput.dispatchEvent(new Event('input'));
                createToast('转录完成', 'success');
            } else {
                createToast('未检测到语音', 'warning');
            }
        } catch (error) {
            console.error('Error transcribing audio:', error);
            createToast('转录失败', 'error');
        } finally {
            hideLoading();
        }
    }

    /**
     * Show settings
     */
    async showSettings() {
        this.elements.settingsModal.classList.remove('hidden');
        
        // Load personal rules into textarea
        if (this.elements.personalRulesInput) {
            this.elements.personalRulesInput.value = this.personalRules;
        }
        
        // Load projects root
        await this.loadProjectsRoot();
        
        // Load all status info
        await this.loadSettingsInfo();
    }
    
    /**
     * Save personal rules to localStorage
     */
    savePersonalRules() {
        if (this.elements.personalRulesInput) {
            this.personalRules = this.elements.personalRulesInput.value;
            localStorage.setItem('opencode_personal_rules', this.personalRules);
            createToast('个人规则已保存', 'success');
        }
    }
    
    /**
     * Load settings information
     */
    async loadSettingsInfo() {
        try {
            // Get server status
            const serverStatus = await this.api.getServerStatus();
            this.updateServerStatus(serverStatus.running);
            
            // Update OpenCode path
            if (this.elements.opencodePath) {
                this.elements.opencodePath.textContent = serverStatus.opencode_path || '未找到';
            }
            
            // Get health check for Whisper status and web port
            const health = await this.api.healthCheck();
            
            // Update Whisper status
            if (this.elements.whisperStatusDot && this.elements.whisperStatusText) {
                const whisper = health.whisper || {};
                const whisperEnabled = whisper.enabled || health.whisper_enabled;
                
                this.elements.whisperStatusDot.className = `w-3 h-3 rounded-full ${whisperEnabled ? 'bg-green-500' : 'bg-gray-500'}`;
                this.elements.whisperStatusText.textContent = whisperEnabled ? '已启用' : '未启用';
                this.elements.whisperStatusText.className = `font-medium ${whisperEnabled ? 'text-green-400' : 'text-gray-400'}`;
                
                // Update Whisper model and device
                if (this.elements.whisperModel) {
                    this.elements.whisperModel.textContent = whisper.model || 'N/A';
                }
                if (this.elements.whisperDevice) {
                    const device = whisper.device || 'N/A';
                    this.elements.whisperDevice.textContent = device;
                    // Add color indicator for GPU
                    if (device === 'CUDA') {
                        this.elements.whisperDevice.innerHTML = `<span class="text-green-400">${device}</span> (GPU)`;
                    } else if (device === 'CPU') {
                        this.elements.whisperDevice.innerHTML = `<span class="text-yellow-400">${device}</span>`;
                    }
                }
            }
            
            // Update Web Builder port
            const webPortEl = document.getElementById('web-port');
            if (webPortEl && health.web_port) {
                webPortEl.textContent = health.web_port;
            }
            
        } catch (error) {
            console.error('Error loading settings info:', error);
        }
    }

    /**
     * Hide settings
     */
    hideSettings() {
        this.elements.settingsModal.classList.add('hidden');
    }
    
    /**
     * Load projects root directory
     */
    async loadProjectsRoot() {
        try {
            const response = await fetch('/api/projects-root');
            if (response.ok) {
                const data = await response.json();
                if (this.elements.projectsRootInput) {
                    this.elements.projectsRootInput.value = data.path || data.default;
                }
            }
        } catch (error) {
            console.error('Error loading projects root:', error);
        }
    }
    
    /**
     * Save projects root directory
     */
    async saveProjectsRoot() {
        const path = this.elements.projectsRootInput?.value?.trim();
        if (!path) {
            createToast('请输入有效的路径', 'warning');
            return;
        }
        
        try {
            const formData = new FormData();
            formData.append('path', path);
            
            const response = await fetch('/api/projects-root', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                createToast('项目根目录已保存', 'success');
                // Reload projects list
                await this.loadProjects();
            } else {
                const error = await response.json();
                createToast(`保存失败: ${error.detail}`, 'error');
            }
        } catch (error) {
            console.error('Error saving projects root:', error);
            createToast('保存项目根目录失败', 'error');
        }
    }
    
    /**
     * Open projects root folder in file explorer
     */
    async openProjectsRootFolder() {
        const path = this.elements.projectsRootInput?.value?.trim();
        if (!path) {
            createToast('请先设置项目根目录', 'warning');
            return;
        }
        
        await this.openFolder(path);
    }
    
    /**
     * Open a folder in the system file explorer
     */
    async openFolder(path) {
        try {
            const formData = new FormData();
            formData.append('path', path);
            
            const response = await fetch('/api/open-folder', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                createToast('已打开文件夹', 'success');
            } else {
                const error = await response.json();
                createToast(`打开失败: ${error.detail}`, 'error');
            }
        } catch (error) {
            console.error('Error opening folder:', error);
            createToast('打开文件夹失败', 'error');
        }
    }
    
    /**
     * Open project folder in file explorer
     */
    async openProjectFolder(project) {
        if (project && project.path) {
            await this.openFolder(project.path);
        } else {
            createToast('项目路径无效', 'warning');
        }
    }

    /**
     * Demo Questionnaire (For testing)
     */
    demoQuestionnaire() {
        if (!this.currentProject) {
            createToast('请先选择一个项目', 'warning');
            return;
        }
        
        // Switch to chat view if not already
        this.switchView('chat');
        
        // Create assistant message
        const msgEl = createAssistantMessage();
        this.elements.chatContainer.appendChild(msgEl);
        
        // Add intro text
        appendTextToMessage(msgEl, "我们需要了解一些关于你游戏的细节，以便为你生成最佳方案。");
        
        // Demo Data
        const data = {
          "questions": [
            {
              "header": "游戏类型",
              "multiple": false,
              "options": [
                {
                  "description": "使用简单的HTML/CSS/JS，无需额外依赖",
                  "label": "网页版"
                },
                {
                  "description": "需要Unity或其他引擎，适合更复杂的游戏",
                  "label": "桌面应用"
                }
              ],
              "question": "你希望这个医院游戏是什么类型的？"
            },
            {
              "header": "游戏风格",
              "multiple": false,
              "options": [
                {
                  "description": "更注重资源管理和策略规划",
                  "label": "模拟经营"
                },
                {
                  "description": "更注重快速决策和反应",
                  "label": "时间管理"
                },
                {
                  "description": "两者结合，既有策略又有时间压力",
                  "label": "混合风格"
                }
              ],
              "question": "你希望游戏的主要玩法是什么？"
            },
            {
              "header": "美术风格",
              "multiple": false,
              "options": [
                {
                  "description": "像素风格的复古游戏",
                  "label": "像素风"
                },
                {
                  "description": "2D扁平化设计，现代简洁",
                  "label": "扁平2D"
                },
                {
                  "description": "立体画面，更真实的感觉",
                  "label": "3D"
                }
              ],
              "question": "你希望游戏采用什么美术风格？"
            },
            {
              "header": "复杂度",
              "multiple": false,
              "options": [
                {
                  "description": "简单的核心玩法，容易上手",
                  "label": "简单"
                },
                {
                  "description": "适度的复杂度，有一定挑战",
                  "label": "中等"
                },
                {
                  "description": "深度系统，适合长期游玩",
                  "label": "复杂"
                }
              ],
              "question": "游戏的复杂度你希望如何？"
            }
          ]
        };
        
        // Add questionnaire
        addQuestionnaireToMessage(msgEl, data, (answers) => {
            console.log('Submitted answers:', answers);
            
            // Create user message with answers
            const answerText = "我已提交游戏偏好：\n" + JSON.stringify(answers, null, 2);
            const userMsg = createUserMessage(answerText);
            this.elements.chatContainer.appendChild(userMsg);
            this.scrollToBottom();
            
            // Here you would typically send this back to the backend
            // this.sendMessageWithHiddenText(JSON.stringify(answers)); 
        });
        
        this.scrollToBottom();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
