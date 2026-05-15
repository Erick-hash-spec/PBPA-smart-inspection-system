@echo off
REM Smart Reporting System - Windows Setup Script

echo 0255 Smart Petroleum Reporting System - Setup
echo ==============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed. Please install Python 3.10+
    echo Download from: https://www.python.org/
    pause
    exit /b 1
)

echo Step 1: Setting up Backend...
echo.

cd backend

REM Create virtual environment
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing Python dependencies...
python -m pip install --upgrade pip
pip install -r ../requirements.txt

REM Run migrations
echo Running database migrations...
python manage.py makemigrations
python manage.py migrate

REM Load sample data
echo Loading sample data...
python manage.py shell < load_sample_data.py

echo Backend setup complete!
echo.

cd ..

echo Step 2: Setting up Frontend...
echo.

cd frontend

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js/npm is not installed. Please install Node.js 16+
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

REM Install dependencies
echo Installing Node dependencies...
call npm install

REM Create .env file
if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env
)

echo Frontend setup complete!
echo.

cd ..

echo Setup complete!
echo.
echo To start development:
echo.
echo 1. Backend (Terminal 1):
echo    cd backend
echo    venv\Scripts\activate.bat
echo    python manage.py runserver
echo.
echo 2. Frontend (Terminal 2):
echo    cd frontend
echo    npm start
echo.
echo Access the app at: http://localhost:3000
echo.
echo Demo credentials:
echo   Inspector: inspector1 / password123
echo   Supervisor: supervisor1 / password123
echo   Admin: admin1 / password123
echo.
pause
