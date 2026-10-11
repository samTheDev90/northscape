@echo off
title Panchagarh Voyage
echo.
echo ============================================
echo  Panchagarh Voyage - Local Launcher
echo ============================================
echo.
echo Starting a local web server so your browser
echo can access the app with full IndexedDB support.
echo.
echo A browser window will open automatically.
echo Close this window to stop the server.
echo.

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  start "" http://localhost:8000/index.html
  python -m http.server 8000
  goto :eof
)

where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  start "" http://localhost:8000/index.html
  py -m http.server 8000
  goto :eof
)

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  start "" http://localhost:8000/index.html
  npx --yes serve -l 8000 .
  goto :eof
)

echo.
echo No local server was available on this computer.
echo.
echo You can still use the app: right-click "index.html"
echo and choose "Open with" ^> Chrome or Edge.
echo.
pause