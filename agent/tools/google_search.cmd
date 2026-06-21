@echo off
setlocal
cd /d "%~dp0.."
npx tsx "tools\google_search.ts" %*
