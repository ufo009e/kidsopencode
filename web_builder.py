#!/usr/bin/env python3
"""
Web Builder - FastAPI-based web interface for OpenCode AI

This application provides a modern web interface for interacting with OpenCode,
replacing the tkinter-based builder.py with a browser-based solution.

Architecture:
- FastAPI backend serving static files and API routes
- OpenCode SDK integration for type-safe API calls
- Enhanced SSE event streaming with subagent support
- Project management
- Voice transcription using Whisper
- File upload support

Author: OpenCode Web Builder
License: MIT
"""

import sys
import os
import json
import base64
import mimetypes
import subprocess
import socket
import shutil
import tempfile
import webbrowser
import threading
import re
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
import asyncio

# FastAPI and related imports
try:
    from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
    from fastapi.responses import JSONResponse, StreamingResponse, FileResponse, HTMLResponse
    from fastapi.staticfiles import StaticFiles
    from fastapi.middleware.cors import CORSMiddleware
    from contextlib import asynccontextmanager
    from pydantic import BaseModel
    import httpx
    import uvicorn
except ImportError:
    print("Error: Required packages not installed.")
    print("Please install: pip install fastapi uvicorn httpx python-multipart pydantic")
    sys.exit(1)

# OpenCode SDK (optional - falls back to direct API if not available)
HAS_OPENCODE_SDK = False
try:
    # Note: The package is "opencode-ai" but imports as "opencode_ai"
    from opencode_ai import Opencode, AsyncOpencode
    HAS_OPENCODE_SDK = True
    print("[SDK] OpenCode SDK available (opencode-ai)")
except ImportError:
    print("[SDK] OpenCode SDK not available. Using direct API proxy.")
    print("      To enable SDK: pip install opencode-ai")

# Whisper for voice transcription
HAS_WHISPER = False
try:
    from faster_whisper import WhisperModel
    import sounddevice as sd
    import numpy as np
    import torch
    HAS_WHISPER = True
except ImportError:
    print("Warning: Whisper not available. Voice transcription disabled.")
    print("To enable: pip install faster-whisper sounddevice numpy torch")


# =============================================================================
# Pydantic Models for API
# =============================================================================

class MessagePart(BaseModel):
    """A single part of a message (text, file, etc.)"""
    type: str
    text: Optional[str] = None
    mime: Optional[str] = None
    filename: Optional[str] = None
    url: Optional[str] = None

class ModelInfo(BaseModel):
    """Model selection info"""
    providerID: str
    modelID: str

class SendMessageRequest(BaseModel):
    """Request body for sending a message"""
    parts: List[MessagePart]
    model: Optional[ModelInfo] = None

class CreateSessionRequest(BaseModel):
    """Request body for creating a session"""
    title: Optional[str] = None


# =============================================================================
# Task Output Parser (for extracting subagent details)
# =============================================================================

class TaskOutputParser:
    """Parse task tool output to extract subagent execution details"""
    
    @staticmethod
    def parse(output: str) -> Dict[str, Any]:
        """
        Parse task output to extract tool calls, summaries, etc.
        
        Returns:
            {
                'tools': ['grep', 'read', 'write', ...],
                'files_read': ['file1.py', ...],
                'files_written': ['file2.py', ...],
                'summary': 'Brief summary...',
                'has_errors': False
            }
        """
        if not output:
            return {'tools': [], 'files_read': [], 'files_written': [], 'summary': '', 'has_errors': False}
        
        result = {
            'tools': [],
            'files_read': [],
            'files_written': [],
            'summary': '',
            'has_errors': False
        }
        
        # Extract tool names from patterns like "Called X", "Using X tool", "Executed X"
        tool_patterns = [
            r'(?:Called|Using|Executed|Running|Invoking)\s+(\w+)(?:\s+tool)?',
            r'\[(\w+)\]',  # [bash], [read], etc.
            r'Tool:\s*(\w+)',
        ]
        
        tools_found = set()
        for pattern in tool_patterns:
            matches = re.findall(pattern, output, re.IGNORECASE)
            for match in matches:
                tool_name = match.lower()
                if tool_name in ['bash', 'read', 'write', 'edit', 'grep', 'glob', 'task']:
                    tools_found.add(tool_name)
        
        result['tools'] = list(tools_found)
        
        # Extract file paths for read operations
        read_patterns = [
            r'(?:Reading|Read|Opened)\s+[`"\']?([^\s`"\']+\.\w+)[`"\']?',
            r'File:\s*([^\s]+\.\w+)',
        ]
        for pattern in read_patterns:
            matches = re.findall(pattern, output, re.IGNORECASE)
            result['files_read'].extend(matches)
        
        # Extract file paths for write operations
        write_patterns = [
            r'(?:Writing|Wrote|Created|Modified|Updated)\s+[`"\']?([^\s`"\']+\.\w+)[`"\']?',
        ]
        for pattern in write_patterns:
            matches = re.findall(pattern, output, re.IGNORECASE)
            result['files_written'].extend(matches)
        
        # Check for errors
        error_patterns = [r'error', r'failed', r'exception', r'unable to']
        for pattern in error_patterns:
            if re.search(pattern, output, re.IGNORECASE):
                result['has_errors'] = True
                break
        
        # Extract summary (first meaningful paragraph or first 200 chars)
        lines = output.strip().split('\n')
        summary_lines = []
        for line in lines[:5]:  # First 5 lines
            line = line.strip()
            if line and not line.startswith('[') and not line.startswith('#'):
                summary_lines.append(line)
                if len(' '.join(summary_lines)) > 200:
                    break
        
        result['summary'] = ' '.join(summary_lines)[:300]
        
        # Deduplicate
        result['files_read'] = list(set(result['files_read']))[:10]
        result['files_written'] = list(set(result['files_written']))[:10]
        
        return result


def enhance_sse_event(event_data: Dict) -> Dict:
    """
    Enhance SSE event data with additional metadata for subagent/task handling.
    
    This function:
    1. Identifies task tool events (subagent calls)
    2. Parses task output to extract tool usage details
    3. Adds metadata to help frontend render subagent panels
    """
    if not isinstance(event_data, dict):
        return event_data
    
    event_type = event_data.get('type')
    
    # Handle message.part.updated events
    if event_type == 'message.part.updated':
        properties = event_data.get('properties', {})
        part = properties.get('part', {})
        part_type = part.get('type')
        
        # Check if this is a tool event
        if part_type == 'tool':
            tool_name = part.get('tool', '')
            state = part.get('state', {})
            status = state.get('status', '')
            
            # Mark task tool as subagent
            if tool_name == 'task':
                event_data['_is_subagent'] = True
                event_data['_subagent_type'] = state.get('input', {}).get('subagent_type', 'general')
                event_data['_subagent_description'] = state.get('input', {}).get('description', '')
                
                # Parse completed task output
                if status == 'completed':
                    output = state.get('output', '')
                    parsed = TaskOutputParser.parse(output)
                    event_data['_subagent_parsed'] = parsed
            
            # Add tool category metadata
            event_data['_tool_category'] = get_tool_category(tool_name)
    
    return event_data


def get_tool_category(tool_name: str) -> str:
    """Categorize tools for UI display"""
    categories = {
        'bash': 'execution',
        'read': 'file',
        'write': 'file',
        'edit': 'file',
        'grep': 'search',
        'glob': 'search',
        'task': 'subagent',
    }
    return categories.get(tool_name.lower(), 'other')


# =============================================================================
# Configuration
# =============================================================================

class Config:
    """Application configuration"""
    
    # Directories
    PROJECTS_DIR: Path = Path.home() / "Desktop" / "game"
    DATA_DIR: Path = Path.home() / ".game_launcher"
    CONFIG_FILE: Path = DATA_DIR / "config.json"
    STATIC_DIR: Path = Path(__file__).parent / "static"
    
    # OpenCode API
    OPENCODE_BASE_URL: str = "http://localhost:2380"
    OPENCODE_PORT: int = 2380
    API_TIMEOUT: int = 300  # 5 minutes
    
    # Whisper (Voice)
    WHISPER_MODEL: str = "base"  # tiny, base, small, medium, large
    WHISPER_DEVICE: str = "auto"  # auto, cpu, cuda
    WHISPER_LANGUAGE: str = "zh"  # Chinese
    
    # Web Server
    WEB_PORT: int = 8686
    WEB_HOST: str = "0.0.0.0"
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]  # Allow all origins for local development
    
    @classmethod
    def ensure_directories(cls):
        """Create necessary directories if they don't exist"""
        cls.PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
        cls.DATA_DIR.mkdir(parents=True, exist_ok=True)
        cls.STATIC_DIR.mkdir(parents=True, exist_ok=True)
        (cls.STATIC_DIR / "css").mkdir(exist_ok=True)
        (cls.STATIC_DIR / "js").mkdir(exist_ok=True)
    
    @classmethod
    def load_config(cls) -> Dict:
        """Load configuration from file"""
        if cls.CONFIG_FILE.exists():
            try:
                with open(cls.CONFIG_FILE, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    # Update PROJECTS_DIR if custom path is set
                    if config.get("projects_root"):
                        cls.PROJECTS_DIR = Path(config["projects_root"])
                    return config
            except:
                pass
        return {
            "last_project": "",
            "last_model": "",
            "last_provider": "",
            "debug_enabled": False,
            "projects_root": str(cls.PROJECTS_DIR)
        }
    
    @classmethod
    def save_config(cls, config: Dict):
        """Save configuration to file"""
        cls.ensure_directories()
        with open(cls.CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)


# =============================================================================
# Platform Utilities
# =============================================================================

class PlatformUtils:
    """Cross-platform utilities for OpenCode server management"""
    
    @staticmethod
    def find_opencode_path() -> Optional[str]:
        """Find OpenCode executable on the system"""
        
        # Check environment variable
        env_path = os.environ.get('OPENCODE_PATH')
        if env_path and os.path.exists(env_path):
            return env_path
        
        # Platform-specific search locations
        if sys.platform == 'win32':
            # Windows
            search_paths = [
                Path(os.environ.get('LOCALAPPDATA', '')) / 'Programs' / 'opencode' / 'opencode.exe',
                Path(os.environ.get('PROGRAMFILES', '')) / 'opencode' / 'opencode.exe',
                Path.home() / 'AppData' / 'Local' / 'Programs' / 'opencode' / 'opencode.exe',
            ]
        else:
            # Linux/Mac
            search_paths = [
                Path('/usr/local/bin/opencode'),
                Path('/usr/bin/opencode'),
                Path.home() / '.local' / 'bin' / 'opencode',
                Path.home() / 'bin' / 'opencode',
            ]
        
        for path in search_paths:
            if path.exists():
                return str(path)
        
        # Check PATH
        import shutil as sh
        opencode_cmd = sh.which('opencode')
        if opencode_cmd:
            return opencode_cmd
        
        return None
    
    @staticmethod
    def is_port_available(port: int) -> bool:
        """Check if a port is available"""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('localhost', port))
                return True
        except OSError:
            return False
    
    @staticmethod
    async def is_opencode_server_running(port: int = 2380) -> bool:
        """Check if OpenCode server is running"""
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                response = await client.get(f"http://localhost:{port}/health")
                return response.status_code == 200
        except:
            return False
    
    @staticmethod
    def start_opencode_server(directory: str, port: int = 2380) -> bool:
        """Start OpenCode server as a background process"""
        opencode_path = PlatformUtils.find_opencode_path()
        
        if not opencode_path:
            print("Error: OpenCode executable not found")
            return False
        
        try:
            # Build command
            cmd = [opencode_path, "serve", "--port", str(port)]
            
            # Start process
            if sys.platform == 'win32':
                # Windows: Hide window
                subprocess.Popen(
                    cmd,
                    cwd=directory,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    creationflags=subprocess.CREATE_NO_WINDOW
                )
            else:
                # Linux/Mac
                subprocess.Popen(
                    cmd,
                    cwd=directory,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
            
            print(f"OpenCode server started on port {port}")
            return True
            
        except Exception as e:
            print(f"Error starting OpenCode server: {e}")
            return False


# =============================================================================
# Project Manager
# =============================================================================

class ProjectManager:
    """Manage projects (create, delete, list)"""
    
    @staticmethod
    def get_all_projects() -> List[Dict]:
        """Get list of all projects"""
        projects = []

        if Config.PROJECTS_DIR.exists():
            for item in Config.PROJECTS_DIR.iterdir():
                if item.is_dir() and not item.name.startswith('.'):
                    projects.append({
                        'name': item.name,
                        'path': str(item),
                        'created': item.stat().st_ctime,
                        'modified': item.stat().st_mtime
                    })
        
        # Sort by creation time (newest first)
        projects.sort(key=lambda x: x['created'], reverse=True)
        return projects
    
    @staticmethod
    def create_project(name: str, path: Optional[str] = None) -> Dict:
        """Create a new project"""
        # Use provided path or default
        if path:
            project_path = Path(path)
        else:
            project_path = Config.PROJECTS_DIR / name
        
        # Check if exists
        if project_path.exists():
            raise ValueError(f"Project already exists: {project_path}")
        
        # Create directory structure
        project_path.mkdir(parents=True, exist_ok=True)
        (project_path / "src").mkdir(exist_ok=True)
        (project_path / "assets").mkdir(exist_ok=True)
        
        # Create README
        readme_path = project_path / "README.md"
        readme_path.write_text(f"# {name}\n\nCreated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        return {
            'name': name,
            'path': str(project_path),
            'created': project_path.stat().st_ctime,
            'modified': project_path.stat().st_mtime
        }
    
    @staticmethod
    def delete_project(name: str) -> bool:
        """Delete a project"""
        project_path = Config.PROJECTS_DIR / name
        
        if not project_path.exists():
            return False
        
        try:
            shutil.rmtree(project_path)
            return True
        except Exception as e:
            print(f"Error deleting project: {e}")
            return False
    
    @staticmethod
    def get_project(name: str) -> Optional[Dict]:
        """Get a single project by name"""
        project_path = Config.PROJECTS_DIR / name
        
        if not project_path.exists():
            return None
        
        return {
            'name': name,
            'path': str(project_path),
            'created': project_path.stat().st_ctime,
            'modified': project_path.stat().st_mtime
        }


# =============================================================================
# Whisper Service (Voice Transcription)
# =============================================================================

class WhisperService:
    """Speech-to-text transcription using Faster Whisper"""
    
    def __init__(self):
        self.model: Optional[Any] = None
        self.enabled = HAS_WHISPER
        self.device = "unknown"
        self.model_name = Config.WHISPER_MODEL
        self.compute_type = "unknown"
        
        if self.enabled:
            self._load_model()
    
    def _load_model(self):
        """Load Whisper model"""
        try:
            # Detect device
            device = Config.WHISPER_DEVICE
            if device == "auto":
                device = "cuda" if torch.cuda.is_available() else "cpu"
            
            self.device = device
            self.compute_type = "float16" if device == "cuda" else "int8"
            
            print(f"Loading Whisper model: {Config.WHISPER_MODEL} on {device}")
            
            self.model = WhisperModel(
                Config.WHISPER_MODEL,
                device=device,
                compute_type=self.compute_type
            )
            
            print("Whisper model loaded successfully")
        except Exception as e:
            print(f"Error loading Whisper model: {e}")
            self.enabled = False
    
    def get_status(self) -> Dict:
        """Get Whisper service status"""
        return {
            "enabled": self.enabled,
            "model": self.model_name,
            "device": self.device.upper() if self.enabled else "N/A",
            "compute_type": self.compute_type if self.enabled else "N/A"
        }
    
    async def transcribe_file(self, file_path: str) -> Optional[str]:
        """Transcribe an audio file"""
        if not self.enabled or not self.model:
            return None
        
        try:
            # Transcribe
            segments, info = self.model.transcribe(
                file_path,
                language=Config.WHISPER_LANGUAGE,
                beam_size=5
            )
            
            # Extract text
            text = " ".join([segment.text for segment in segments])
            return text.strip()
            
        except Exception as e:
            print(f"Error transcribing audio: {e}")
            return None


# =============================================================================
# FastAPI Application
# =============================================================================

# Global services
whisper_service = WhisperService()

# Global state
app_state = {
    "current_project": None,
    "opencode_running": False
}

# Lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("=" * 60)
    print("OpenCode Web Builder Starting...")
    print("=" * 60)
    
    # Ensure directories exist
    Config.ensure_directories()
    print(f"[OK] Directories initialized")
    
    # Check for OpenCode
    opencode_path = PlatformUtils.find_opencode_path()
    if opencode_path:
        print(f"[OK] OpenCode found: {opencode_path}")
    else:
        print("[!] OpenCode not found. Server auto-start disabled.")
    
    # Check if OpenCode server is running
    server_running = await PlatformUtils.is_opencode_server_running(Config.OPENCODE_PORT)
    
    if server_running:
        print(f"[OK] OpenCode server already running on port {Config.OPENCODE_PORT}")
        app_state["opencode_running"] = True
    else:
        print(f"[!] OpenCode server not running")
        
        # Try to start server if we have a project
        config = Config.load_config()
        last_project = config.get("last_project", "")
        
        if last_project and opencode_path:
            print(f"  Starting OpenCode server in {last_project}...")
            success = PlatformUtils.start_opencode_server(last_project, Config.OPENCODE_PORT)
            
            if success:
                # Wait for server to start
                await asyncio.sleep(3)
                server_running = await PlatformUtils.is_opencode_server_running(Config.OPENCODE_PORT)
                
                if server_running:
                    print(f"[OK] OpenCode server started successfully")
                    app_state["opencode_running"] = True
                else:
                    print(f"[!] OpenCode server failed to start")
        elif not last_project:
            print(f"  No project configured. Create a project to start OpenCode server.")
    
    # Check Whisper
    if whisper_service.enabled:
        print(f"[OK] Whisper voice transcription enabled")
    else:
        print(f"[!] Whisper voice transcription disabled")
    
    print("=" * 60)
    print(f"Web Builder running at http://localhost:{Config.WEB_PORT}")
    print(f"Opening browser...")
    print("=" * 60)
    
    # Open browser after a short delay to ensure server is ready
    def open_browser():
        import time
        time.sleep(1.5)  # Wait for server to be fully ready
        webbrowser.open(f"http://localhost:{Config.WEB_PORT}")
    
    browser_thread = threading.Thread(target=open_browser, daemon=True)
    browser_thread.start()
    
    yield
    
    # Shutdown
    print("\nShutting down Web Builder...")

# Initialize FastAPI app with lifespan
app = FastAPI(
    title="OpenCode Web Builder",
    description="Web interface for OpenCode AI",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# Middleware - No Cache Headers
# =============================================================================

from starlette.middleware.base import BaseHTTPMiddleware

class NoCacheMiddleware(BaseHTTPMiddleware):
    """Add no-cache headers to all responses"""
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        # Add no-cache headers for static files
        if request.url.path.startswith('/static') or request.url.path.startswith('/css') or request.url.path.startswith('/js'):
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return response

app.add_middleware(NoCacheMiddleware)


# =============================================================================
# API Routes - Health & Status
# =============================================================================

@app.get("/")
async def root():
    """Serve the main HTML page with no-cache headers"""
    index_path = Config.STATIC_DIR / "index.html"
    if index_path.exists():
        response = FileResponse(index_path)
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
    else:
        return HTMLResponse(
            content="""
            <html>
                <head><title>OpenCode Web Builder</title></head>
                <body>
                    <h1>OpenCode Web Builder</h1>
                    <p>Frontend files not found. Please create static/index.html</p>
                </body>
            </html>
            """,
            status_code=200
        )

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "opencode_running": await PlatformUtils.is_opencode_server_running(),
        "whisper": whisper_service.get_status(),
        "whisper_enabled": whisper_service.enabled,  # For backwards compatibility
        "web_port": Config.WEB_PORT
    }


# =============================================================================
# API Routes - Server Management
# =============================================================================

@app.get("/api/server/status")
async def get_server_status():
    """Get OpenCode server status"""
    running = await PlatformUtils.is_opencode_server_running(Config.OPENCODE_PORT)
    
    return {
        "running": running,
        "port": Config.OPENCODE_PORT,
        "url": Config.OPENCODE_BASE_URL,
        "opencode_path": PlatformUtils.find_opencode_path()
    }

@app.post("/api/server/restart")
async def restart_server(directory: str = ""):
    """Restart OpenCode server"""
    # Use current project or default
    work_dir = directory or str(Config.PROJECTS_DIR)
    
    # Start server
    success = PlatformUtils.start_opencode_server(work_dir, Config.OPENCODE_PORT)
    
    if success:
        # Wait a bit for server to start
        await asyncio.sleep(2)
        running = await PlatformUtils.is_opencode_server_running(Config.OPENCODE_PORT)
        
        return {
            "success": running,
            "message": "Server started" if running else "Server start attempted but not responding"
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to start OpenCode server")


# =============================================================================
# API Routes - Project Management
# =============================================================================

@app.get("/api/projects")
async def list_projects():
    """List all projects"""
    projects = ProjectManager.get_all_projects()
    return {"projects": projects}

@app.post("/api/projects")
async def create_project(name: str = Form(...), path: Optional[str] = Form(None)):
    """Create a new project"""
    try:
        project = ProjectManager.create_project(name, path)
        return {"success": True, "project": project}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating project: {e}")

@app.delete("/api/projects/{name}")
async def delete_project(name: str):
    """Delete a project"""
    success = ProjectManager.delete_project(name)
    
    if success:
        return {"success": True, "message": f"Project '{name}' deleted"}
    else:
        raise HTTPException(status_code=404, detail=f"Project '{name}' not found")

@app.get("/api/projects/current")
async def get_current_project():
    """Get current project"""
    config = Config.load_config()
    current = config.get("last_project", "")
    
    if current:
        # Extract project name from path
        name = Path(current).name
        project = ProjectManager.get_project(name)
        return {"project": project}
    
    return {"project": None}

@app.post("/api/projects/select")
async def select_project(name: str = Form(...)):
    """Select a project as current"""
    project = ProjectManager.get_project(name)
    
    if not project:
        raise HTTPException(status_code=404, detail=f"Project '{name}' not found")
    
    # Save to config
    config = Config.load_config()
    config["last_project"] = project["path"]
    Config.save_config(config)
    
    app_state["current_project"] = project
    
    return {"success": True, "project": project}


# =============================================================================
# API Routes - SSE Event Streaming (MUST be before proxy route!)
# =============================================================================

@app.get("/api/opencode/event")
async def stream_events(directory: str = "", enhance: bool = True):
    """
    Stream Server-Sent Events from OpenCode
    Proxies the /event endpoint with optional enhancement for subagent support
    
    NOTE: This route MUST be defined before the generic proxy route to avoid being overridden.
    
    Args:
        directory: Project directory path
        enhance: If True, parse and enhance events with subagent metadata
    """
    
    # Use provided directory or current project
    if not directory:
        config = Config.load_config()
        directory = config.get("last_project", str(Config.PROJECTS_DIR))
    
    print(f"[SSE] Starting for: {directory} (enhance={enhance})")
    
    async def event_generator():
        """Generate SSE events from OpenCode with optional enhancement"""
        target_url = f"{Config.OPENCODE_BASE_URL}/event"
        params = {"directory": directory}
        
        print(f"[SSE] Connecting to: {target_url}?directory={directory}")
        
        # Use httpx with streaming - no timeout for SSE
        async with httpx.AsyncClient() as client:
            try:
                # Start streaming request
                async with client.stream(
                    'GET', 
                    target_url, 
                    params=params,
                    timeout=httpx.Timeout(connect=10.0, read=None, write=None, pool=None)
                ) as response:
                    print(f"[SSE] Connected! Status: {response.status_code}")
                    
                    if response.status_code != 200:
                        print(f"[SSE] Bad status: {response.status_code}")
                        error_event = {"type": "connection.error", "properties": {"error": f"Status {response.status_code}"}}
                        yield f"data: {json.dumps(error_event)}\n\n"
                        return
                    
                    # Buffer for accumulating partial data
                    buffer = ""
                    
                    # Iterate over raw bytes and decode
                    async for chunk in response.aiter_bytes():
                        buffer += chunk.decode('utf-8', errors='ignore')
                        
                        # SSE events are separated by double newlines
                        # Process complete events from buffer
                        while '\n\n' in buffer:
                            event_str, buffer = buffer.split('\n\n', 1)
                            if event_str.strip():
                                # Parse and enhance the event if requested
                                if enhance and event_str.startswith('data: '):
                                    try:
                                        # Extract JSON data
                                        json_str = event_str[6:]  # Remove 'data: ' prefix
                                        event_data = json.loads(json_str)
                                        
                                        # Enhance with subagent metadata
                                        enhanced_data = enhance_sse_event(event_data)
                                        
                                        # Log subagent events
                                        if enhanced_data.get('_is_subagent'):
                                            subagent_type = enhanced_data.get('_subagent_type', 'unknown')
                                            print(f"[SSE] 📦 Subagent event: {subagent_type}")
                                        
                                        # Yield enhanced event
                                        yield f"data: {json.dumps(enhanced_data)}\n\n"
                                    except json.JSONDecodeError:
                                        # Forward as-is if not valid JSON
                                        print(f"[SSE] >> {event_str[:60]}...")
                                        yield f"{event_str}\n\n"
                                else:
                                    # Forward event without enhancement
                                    print(f"[SSE] >> {event_str[:60]}...")
                                    yield f"{event_str}\n\n"
                                
            except asyncio.CancelledError:
                print("[SSE] Connection cancelled")
                raise
            except Exception as e:
                print(f"[SSE] Error: {type(e).__name__}: {e}")
                import traceback
                traceback.print_exc()
                error_event = {"type": "connection.error", "properties": {"error": str(e)}}
                yield f"data: {json.dumps(error_event)}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )


# =============================================================================
# API Routes - OpenCode Proxy
# =============================================================================

@app.api_route("/api/opencode/{path:path}", methods=["GET", "POST", "DELETE", "PATCH", "PUT"])
async def proxy_opencode(request: Request, path: str):
    """
    Transparent proxy to OpenCode server
    Forwards all requests to http://localhost:2380/{path}
    """
    
    # Build target URL
    target_url = f"{Config.OPENCODE_BASE_URL}/{path}"
    
    # Get query parameters
    params = dict(request.query_params)
    
    # Add directory parameter if not present
    if "directory" not in params:
        config = Config.load_config()
        current_dir = config.get("last_project", str(Config.PROJECTS_DIR))
        params["directory"] = current_dir
    
    # Get request body
    try:
        body = await request.body()
    except:
        body = None
    
    # Get headers (exclude host, content-length)
    headers = {
        k: v for k, v in request.headers.items()
        if k.lower() not in ('host', 'content-length')
    }
    
    # Make request to OpenCode
    async with httpx.AsyncClient(timeout=Config.API_TIMEOUT) as client:
        try:
            response = await client.request(
                method=request.method,
                url=target_url,
                params=params,
                content=body,
                headers=headers
            )
            
            # Filter out hop-by-hop headers that shouldn't be forwarded
            excluded_headers = {
                'content-length', 'content-encoding', 'transfer-encoding',
                'connection', 'keep-alive', 'proxy-authenticate',
                'proxy-authorization', 'te', 'trailers', 'upgrade'
            }
            response_headers = {
                k: v for k, v in response.headers.items()
                if k.lower() not in excluded_headers
            }
            
            # Return response
            content_type = response.headers.get('content-type', '')
            if content_type.startswith('application/json'):
                try:
                    return JSONResponse(
                        content=response.json(),
                        status_code=response.status_code
                    )
                except:
                    return JSONResponse(
                        content={"raw": response.text},
                        status_code=response.status_code
                    )
            else:
                return JSONResponse(
                    content={"raw": response.text},
                    status_code=response.status_code
                )
            
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="OpenCode server timeout")
        except httpx.ConnectError:
            raise HTTPException(status_code=503, detail="OpenCode server not available")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Proxy error: {e}")


# =============================================================================
# API Routes - Voice Transcription
# =============================================================================

@app.post("/api/voice/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe uploaded audio file"""
    
    if not whisper_service.enabled:
        raise HTTPException(status_code=503, detail="Voice transcription not available")
    
    # Save uploaded file to temp location
    temp_file = None
    try:
        # Create temp file
        suffix = Path(file.filename).suffix if file.filename else ".webm"
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        
        # Write uploaded content
        content = await file.read()
        temp_file.write(content)
        temp_file.close()
        
        # Transcribe
        text = await whisper_service.transcribe_file(temp_file.name)
        
        if text:
            return {"success": True, "text": text}
        else:
            raise HTTPException(status_code=500, detail="Transcription failed")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error transcribing audio: {e}")
    
    finally:
        # Clean up temp file
        if temp_file:
            try:
                os.unlink(temp_file.name)
            except:
                pass


# =============================================================================
# API Routes - File System Operations
# =============================================================================

@app.post("/api/open-folder")
async def open_folder(path: str = Form(...)):
    """Open a folder in the system file explorer"""
    try:
        folder_path = Path(path)
        
        if not folder_path.exists():
            raise HTTPException(status_code=404, detail=f"Folder not found: {path}")
        
        if not folder_path.is_dir():
            # If it's a file, open its parent directory
            folder_path = folder_path.parent
        
        # Platform-specific folder opening
        if sys.platform == 'win32':
            os.startfile(str(folder_path))
        elif sys.platform == 'darwin':  # macOS
            subprocess.Popen(['open', str(folder_path)])
        else:  # Linux
            subprocess.Popen(['xdg-open', str(folder_path)])
        
        return {"success": True, "path": str(folder_path)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error opening folder: {e}")


@app.get("/api/projects-root")
async def get_projects_root():
    """Get the current projects root directory"""
    config = Config.load_config()
    return {
        "path": str(Config.PROJECTS_DIR),
        "default": str(Path.home() / "Desktop" / "game")
    }


@app.post("/api/projects-root")
async def set_projects_root(path: str = Form(...)):
    """Set the projects root directory"""
    try:
        new_path = Path(path)
        
        # Create directory if it doesn't exist
        new_path.mkdir(parents=True, exist_ok=True)
        
        # Update config
        config = Config.load_config()
        config["projects_root"] = str(new_path)
        Config.save_config(config)
        
        # Update runtime config
        Config.PROJECTS_DIR = new_path
        
        return {"success": True, "path": str(new_path)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error setting projects root: {e}")


# =============================================================================
# API Routes - Configuration
# =============================================================================

@app.get("/api/config")
async def get_config():
    """Get application configuration"""
    config = Config.load_config()
    return {"config": config}

@app.post("/api/config")
async def update_config(config_data: Dict[str, Any]):
    """Update application configuration"""
    current_config = Config.load_config()
    current_config.update(config_data)
    Config.save_config(current_config)
    return {"success": True, "config": current_config}


# =============================================================================
# Static Files (CSS, JS, Images)
# =============================================================================

# Mount static files directory
if Config.STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(Config.STATIC_DIR)), name="static")
    app.mount("/css", StaticFiles(directory=str(Config.STATIC_DIR / "css")), name="css")
    app.mount("/js", StaticFiles(directory=str(Config.STATIC_DIR / "js")), name="js")


# Note: Startup and shutdown events are now handled by the lifespan context manager above


# =============================================================================
# Main Entry Point
# =============================================================================

def main():
    """Main entry point"""
    
    # Run server
    uvicorn.run(
        app,
        host=Config.WEB_HOST,
        port=Config.WEB_PORT,
        log_level="info"
    )


if __name__ == "__main__":
    main()
