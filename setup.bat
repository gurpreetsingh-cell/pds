@echo off
echo Setting up PDS Escalation Hub with SQLite database...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python from https://python.org
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)

echo ✅ Python found
echo.

REM Install dependencies
echo Installing Python dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed
echo.

REM Initialize database
echo Creating SQLite database and admin user...
python init_db.py
if errorlevel 1 (
    echo ❌ Failed to initialize database
    pause
    exit /b 1
)

echo ✅ Database initialized
echo.

REM Test database connection
echo Testing database connection...
python check_db.py
if errorlevel 1 (
    echo ❌ Database test failed
    pause
    exit /b 1
)

echo ✅ Database test passed
echo.

echo 🎉 Setup complete! Your SQLite database file (escalation.db) has been created.
echo.
echo To start the server, run: python app.py
echo Then open: http://localhost:5000
echo.
echo Login with: admin / admin123
echo.
pause