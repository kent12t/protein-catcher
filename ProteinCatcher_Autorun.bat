@echo off
REM Use the directory containing this batch file as the project directory
cd /d "%~dp0" || exit /b 1

REM Run npm dev command
echo Starting Web Server...
start /b npm run dev

REM Wait for 3 seconds
echo Waiting...
timeout /t 3 /nobreak

REM Open the launcher from the same directory as this batch file
echo Opening second batch file...
start "" "%~dp0EdgeKioskLauncher.bat"

REM Close this batch file
echo Closing this batch file...
exit
