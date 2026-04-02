from __future__ import annotations

import os
import signal
import subprocess
import sys
import time
import urllib.request
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"


def create_process(command: list[str], cwd: Path) -> subprocess.Popen[bytes]:
    return subprocess.Popen(
        command,
        cwd=str(cwd),
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
    )


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
    backend_cmd = [sys.executable, "api_server.py"]
    frontend_cmd = ["cmd", "/c", "npm", "run", "dev"]

    backend_process: subprocess.Popen[bytes] | None = None

    try:
        with urllib.request.urlopen("http://127.0.0.1:8000/api/health", timeout=2) as response:
            existing_backend = response.read().decode("utf-8")
        print("A backend is already running on http://127.0.0.1:8000")
        print("If you changed backend code, stop that existing server first or you may still be using the old version.")
        print(f"Existing backend health: {existing_backend}")
    except Exception:
        print("Starting SentinelAI backend from root...")
        backend_process = create_process(backend_cmd, BACKEND_DIR)
        time.sleep(2)

    print("Starting SentinelAI frontend from root...")
    frontend_process = create_process(frontend_cmd, FRONTEND_DIR)

    print("\nSentinelAI is launching:")
    print("Backend:  http://127.0.0.1:8000")
    print("Frontend: http://127.0.0.1:5173")
    print("Press Ctrl+C here to stop both processes.\n")

    try:
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
