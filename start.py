#!/usr/bin/env python3
"""
Startup script for Pecha Annotation Tool
Starts both backend FastAPI server and frontend development server
"""

import os
import sys
import time
import signal
import platform
import subprocess
from pathlib import Path
from typing import Optional


class Colors:
    """ANSI color codes for terminal output"""
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    CYAN = '\033[0;36m'
    NC = '\033[0m'  # No Color
    
    @classmethod
    def colorize(cls, text: str, color: str) -> str:
        """Add color to text if terminal supports it"""
        if platform.system() == "Windows" and not os.environ.get("ANSICON"):
            return text  # No color on Windows without ANSI support
        return f"{color}{text}{cls.NC}"


class ServerManager:
    """Manages backend and frontend server processes"""
    
    def __init__(self):
        self.backend_process: Optional[subprocess.Popen] = None
        self.frontend_process: Optional[subprocess.Popen] = None
        self.root_dir = Path(__file__).parent.absolute()
        self.venv_dir = self.root_dir / ".venv"
        self.backend_dir = self.root_dir / "backend"
        self.frontend_dir = self.root_dir / "frontend"
        
        # Set up signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        print(f"\n{Colors.colorize('🛑 Shutting down servers...', Colors.YELLOW)}")
        self.cleanup()
        sys.exit(0)
    
    def _get_venv_python(self) -> Path:
        """Get the path to Python executable in virtual environment"""
        if platform.system() == "Windows":
            return self.venv_dir / "Scripts" / "python.exe"
        else:
            return self.venv_dir / "bin" / "python"
    
    def check_requirements(self) -> bool:
        """Check if all requirements are met"""
        print(Colors.colorize("🔍 Checking requirements...", Colors.BLUE))
        
        # Check virtual environment
        if not self.venv_dir.exists():
            print(Colors.colorize("❌ Virtual environment (.venv) not found!", Colors.RED))
            print(Colors.colorize("💡 Please create a virtual environment:", Colors.YELLOW))
            print("   python -m venv .venv")
            return False
        
        # Check if Python exists in venv
        venv_python = self._get_venv_python()
        if not venv_python.exists():
            print(Colors.colorize(f"❌ Python not found in virtual environment: {venv_python}", Colors.RED))
            return False
        
        # Check backend directory
        if not self.backend_dir.exists():
            print(Colors.colorize("❌ Backend directory not found!", Colors.RED))
            return False
        
        # Check main.py
        main_py = self.backend_dir / "main.py"
        if not main_py.exists():
            print(Colors.colorize("❌ main.py not found in backend directory!", Colors.RED))
            return False
        
        # Check frontend directory
        if not self.frontend_dir.exists():
            print(Colors.colorize("❌ Frontend directory not found!", Colors.RED))
            return False
        
        # Check package.json
        package_json = self.frontend_dir / "package.json"
        if not package_json.exists():
            print(Colors.colorize("❌ package.json not found in frontend directory!", Colors.RED))
            return False
        
        print(Colors.colorize("✅ All requirements met!", Colors.GREEN))
        return True
    
    def start_backend(self) -> bool:
        """Start the FastAPI backend server"""
        print(Colors.colorize("🚀 Starting FastAPI backend server...", Colors.GREEN))
        
        try:
            venv_python = self._get_venv_python()
            
            # Create environment with virtual environment activation
            env = os.environ.copy()
            if platform.system() == "Windows":
                env["PATH"] = f"{self.venv_dir / 'Scripts'}{os.pathsep}{env['PATH']}"
            else:
                env["PATH"] = f"{self.venv_dir / 'bin'}{os.pathsep}{env['PATH']}"
                env["VIRTUAL_ENV"] = str(self.venv_dir)
            
            # Start backend process
            self.backend_process = subprocess.Popen(
                [str(venv_python), "main.py"],
                cwd=self.backend_dir,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True
            )
            
            # Wait a moment and check if process started successfully
            time.sleep(2)
            if self.backend_process.poll() is not None:
                stdout, stderr = self.backend_process.communicate()
                print(Colors.colorize("❌ Backend server failed to start!", Colors.RED))
                if stdout:
                    print(f"Output: {stdout}")
                return False
            
            print(Colors.colorize("✅ Backend server started successfully!", Colors.GREEN))
            print(Colors.colorize("📍 API available at: http://localhost:8000", Colors.CYAN))
            print(Colors.colorize("📖 API docs at: http://localhost:8000/docs", Colors.CYAN))
            return True
            
        except Exception as e:
            print(Colors.colorize(f"❌ Error starting backend: {e}", Colors.RED))
            return False
    
    def start_frontend(self) -> bool:
        """Start the frontend development server"""
        print(Colors.colorize("🎨 Starting frontend development server...", Colors.GREEN))
        
        try:
            # Check if npm is available
            try:
                subprocess.run(["npm", "--version"], check=True, capture_output=True)
            except (subprocess.CalledProcessError, FileNotFoundError):
                print(Colors.colorize("❌ npm not found! Please install Node.js and npm.", Colors.RED))
                return False
            
            # Start frontend process
            self.frontend_process = subprocess.Popen(
                ["npm", "run", "dev"],
                cwd=self.frontend_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True
            )
            
            # Wait a moment and check if process started successfully
            time.sleep(3)
            if self.frontend_process.poll() is not None:
                stdout, stderr = self.frontend_process.communicate()
                print(Colors.colorize("❌ Frontend server failed to start!", Colors.RED))
                if stdout:
                    print(f"Output: {stdout}")
                return False
            
            print(Colors.colorize("✅ Frontend development server started!", Colors.GREEN))
            print(Colors.colorize("🌐 Frontend available at: http://localhost:5173", Colors.CYAN))
            return True
            
        except Exception as e:
            print(Colors.colorize(f"❌ Error starting frontend: {e}", Colors.RED))
            return False
    
    def cleanup(self):
        """Cleanup running processes"""
        processes_to_kill = []
        
        if self.backend_process and self.backend_process.poll() is None:
            processes_to_kill.append(("Backend", self.backend_process))
        
        if self.frontend_process and self.frontend_process.poll() is None:
            processes_to_kill.append(("Frontend", self.frontend_process))
        
        for name, process in processes_to_kill:
            try:
                print(f"🛑 Stopping {name} server...")
                process.terminate()
                
                # Wait for graceful shutdown
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    print(f"⚡ Force killing {name} server...")
                    process.kill()
                    process.wait()
                
                print(f"✅ {name} server stopped")
            except Exception as e:
                print(f"❌ Error stopping {name} server: {e}")
    
    def run(self):
        """Main execution method"""
        print("=" * 60)
        print(Colors.colorize("🔥 PECHA ANNOTATION TOOL STARTUP", Colors.GREEN))
        print("=" * 60)
        
        # Check requirements
        if not self.check_requirements():
            return False
        
        # Start backend
        if not self.start_backend():
            self.cleanup()
            return False
        
        # Wait a moment for backend to fully start
        time.sleep(3)
        
        # Start frontend
        if not self.start_frontend():
            self.cleanup()
            return False
        
        print("\n" + "=" * 60)
        print(Colors.colorize("🎉 ALL SERVERS RUNNING SUCCESSFULLY!", Colors.GREEN))
        print("=" * 60)
        print(f"{Colors.colorize('🖥️  Backend API:', Colors.YELLOW)} http://localhost:8000")
        print(f"{Colors.colorize('📖 API Documentation:', Colors.YELLOW)} http://localhost:8000/docs")
        print(f"{Colors.colorize('🌐 Frontend App:', Colors.YELLOW)} http://localhost:5173")
        print(f"{Colors.colorize('⏹️  Stop servers:', Colors.YELLOW)} Press Ctrl+C")
        print("=" * 60)
        
        try:
            # Keep the script running and monitor processes
            while True:
                # Check if processes are still running
                backend_running = self.backend_process and self.backend_process.poll() is None
                frontend_running = self.frontend_process and self.frontend_process.poll() is None
                
                if not backend_running:
                    print(Colors.colorize("❌ Backend server stopped unexpectedly!", Colors.RED))
                    break
                
                if not frontend_running:
                    print(Colors.colorize("❌ Frontend server stopped unexpectedly!", Colors.RED))
                    break
                
                time.sleep(1)
        
        except KeyboardInterrupt:
            pass
        finally:
            self.cleanup()
        
        return True


def main():
    """Main entry point"""
    try:
        manager = ServerManager()
        success = manager.run()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(Colors.colorize(f"💥 Unexpected error: {e}", Colors.RED))
        sys.exit(1)


if __name__ == "__main__":
    main() 