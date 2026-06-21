@echo off
setlocal
set "ROOT_DIR=%~dp0.."
cd /d "%ROOT_DIR%"

call ".venv\Scripts\activate.bat"
set "PYTHONPATH=%ROOT_DIR%\src;%PYTHONPATH%"
python -m coddecat.cli scaffold-init
python -m coddecat.cli runtime-start
python -m coddecat.cli dashboard
