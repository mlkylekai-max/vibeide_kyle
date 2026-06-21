@echo off
setlocal
set "ROOT_DIR=%~dp0.."
cd /d "%ROOT_DIR%"

python -m venv .venv
call ".venv\Scripts\activate.bat"
python -m pip install -e .

echo installed: %ROOT_DIR%\.venv
