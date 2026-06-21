@echo off
setlocal
cd /d "%~dp0.."
npx tsx "tools\bili_nav.ts" %*
