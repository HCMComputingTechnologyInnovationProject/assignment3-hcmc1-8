from __future__ import annotations

import os
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
DEFAULT_BACKEND_HOST = "127.0.0.1"
DEFAULT_BACKEND_PORT = 8000


def create_process(command: list[str], cwd: Path, env: dict[str, str] | None = None) -> subprocess.Popen[bytes]:
    process_env = os.environ.copy()
    if env:
        process_env.update(env)

    return subprocess.Popen(
        command,
        cwd=str(cwd),
        env=process_env,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
    )


def port_is_in_use(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(1)
        return sock.connect_ex((host, port)) == 0


def find_available_port(host: str, start_port: int, max_attempts: int = 20) -> int:
    for port in range(start_port, start_port + max_attempts):
        if not port_is_in_use(host, port):
            return port
    raise RuntimeError(f"Could not find a free port in range {start_port}-{start_port + max_attempts - 1}.")


def stop_process(process: subprocess.Popen[bytes] | None) -> None:
    if process is None or process.poll() is not None:
        return

    if os.name == "nt":
        process.send_signal(signal.CTRL_BREAK_EVENT)
        time.sleep(1)
    else:
        process.terminate()

    if process.poll() is None:
        process.terminate()

    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()


def main() -> int:
    backend_host = os.getenv("API_HOST", DEFAULT_BACKEND_HOST)
    preferred_backend_port = int(os.getenv("API_PORT", str(DEFAULT_BACKEND_PORT)))
    backend_port = find_available_port(backend_host, preferred_backend_port)
    backend_url = f"http://{backend_host}:{backend_port}"

    backend_cmd = [sys.executable, "api_server.py"]
    frontend_cmd = ["cmd", "/c", "npm", "run", "dev"]
    backend_env = {
        "API_HOST": backend_host,
        "API_PORT": str(backend_port),
    }
    frontend_env = {
        "VITE_API_BASE_URL": backend_url,
    }

    backend_process: subprocess.Popen[bytes] | None = None
    frontend_process: subprocess.Popen[bytes] | None = None

    try:
        if backend_port != preferred_backend_port:
            print(
                f"Port {preferred_backend_port} is already in use. "
                f"Launching a fresh SentinelAI backend on {backend_url} instead."
            )
        else:
            print(f"Starting SentinelAI backend from root on {backend_url}...")

        backend_process = create_process(backend_cmd, BACKEND_DIR, env=backend_env)
        time.sleep(2)

        print(f"Starting SentinelAI frontend from root with VITE_API_BASE_URL={backend_url}...")
        frontend_process = create_process(frontend_cmd, FRONTEND_DIR, env=frontend_env)

        print("\nSentinelAI is launching:")
        print(f"Backend:  {backend_url}")
        print("Frontend: http://127.0.0.1:5173")
        print("Press Ctrl+C here to stop both processes.\n")

        while True:
            if backend_process.poll() is not None and frontend_process.poll() is not None:
                break
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping SentinelAI processes...")
    finally:
        stop_process(frontend_process)
        stop_process(backend_process)

    backend_code = backend_process.poll()
    frontend_code = frontend_process.poll()

    if backend_code not in (None, 0) and frontend_code not in (None, 0):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
