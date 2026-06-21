@echo off
setlocal
set "ROOT_DIR=%~dp0.."
cd /d "%ROOT_DIR%"

python --version
echo venv:   %ROOT_DIR%\.venv
echo config: %ROOT_DIR%\config\app.yaml
echo runtime browser dir: %ROOT_DIR%\runtime\browser_runtime
echo workplaces dir: %ROOT_DIR%\workplaces
echo pythonpath bootstrap: %ROOT_DIR%\src
