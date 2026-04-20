# PDS Escalation Hub

A web-based dashboard for managing and tracking product delivery escalations with MySQL database and cross-device synchronization.

## Features

- User authentication and management
- Log new escalations with detailed information
- Track open and closed escalations across devices
- Analytics dashboard with KPIs, TAT tracking, and charts
- Bulk import from Excel/CSV
- Export data functionality
- SQLite database for local development (file-based)
- JWT-based authentication
- Responsive design

## Quick Start (SQLite - Local Files)

### Automatic Setup (Windows)
1. **Install Python** (if not already installed):
   - Download from [python.org](https://python.org)
   - Check "Add Python to PATH" during installation

2. **Install Git** (for version control):
   - Download from [git-scm.com](https://git-scm.com/download/win)
   - Install with default settings

3. **Run Setup Scripts**:
   ```bash
   setup.bat        # Install dependencies and create database
   github-setup.bat # Initialize Git repository
   ```

4. **Connect to GitHub** (see GitHub Setup section below)

5. **Start the Server**:
   ```bash
   python app.py
   ```

6. **Open in Browser**:
   - Go to: http://localhost:5000
   - Login with: `admin` / `admin123`

### Manual Setup
```bash
pip install -r requirements.txt
python init_db.py
python app.py
```

## GitHub Setup

### Step-by-Step GitHub Connection:

1. **Create GitHub Account** (if you don't have one):
   - Go to [github.com](https://github.com) and sign up

2. **Create New Repository**:
   - Click the "+" icon → "New repository"
   - Repository name: `escalation-hub` (or your choice)
   - Description: "PDS Escalation Management System"
   - Keep it **Public** or **Private** (your choice)
   - **DO NOT** initialize with README, .gitignore, or license
   - Click "Create repository"

3. **Connect Local Repository to GitHub**:
   ```bash
   # Copy the repository URL from GitHub (looks like: https://github.com/yourusername/escalation-hub.git)

   git remote add origin YOUR_REPOSITORY_URL
   git branch -M main
   git push -u origin main
   ```

4. **Verify on GitHub**:
   - Refresh your GitHub repository page
   - You should see all your files uploaded!

### Managing Your Repository:

```bash
# Make changes and commit
git add .
git commit -m "Your commit message"

# Push changes to GitHub
git push

# Pull latest changes from GitHub
git pull

# Check status
git status
```

## Setup

### 1. Database Setup

The app uses **SQLite** for local development (file-based database stored in your project folder). For production, you can easily switch to MySQL.

#### Local Development (SQLite - No Setup Required!)
- Database file: `escalation.db` (created automatically)
- No external services needed
- Data persists locally and can be committed to Git

#### Production Deployment (Optional - MySQL)
Choose one of these MySQL hosting options:

##### Option A: FreeDB (No Signup!)
1. Go to [FreeDB](https://freedb.tech)
2. Click "Create Database" → Choose MySQL → Get credentials instantly

##### Option B: Railway
1. Go to [Railway](https://railway.app) and sign up
2. Create project → Add MySQL database → Get connection string

##### Option C: PlanetScale
1. Go to [PlanetScale](https://planetscale.com) and create account
2. Create database → Get connection string

### 2. Environment Setup

1. Install dependencies: `pip install -r requirements.txt`
2. Copy `.env` and update with your database credentials
3. Run database initialization: `python init_db.py`

### 3. Deployment on Render

This project is configured for deployment on Render as a web service.

#### Steps to Deploy:

1. **Create a Git Repository:**
   - Initialize a git repo in this folder: `git init`
   - Add all files: `git add .`
   - Commit: `git commit -m "Initial commit"`

2. **Connect to Render:**
   - Go to [Render.com](https://render.com) and sign up/login
   - Click "New +" and select "Web Service"
   - Connect your Git repository (GitHub, GitLab, or Bitbucket)

3. **Configure Build Settings:**
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python app.py`
   - Add environment variables in Render dashboard:
     - `DATABASE_URL`: Your database connection string
     - `SECRET_KEY`: A random secret key for JWT

4. **Deploy:**
   - Click "Create Web Service"
   - Render will build and deploy your app
   - Your app will be available at the generated URL

## Local Development

1. Set up your database and update `.env`
2. Run `python init_db.py` to create tables and admin user
3. Start the server: `python app.py`
4. Open http://localhost:5000 in your browser

## Data Storage

The application uses MySQL database for persistent data storage with cross-device synchronization. User authentication is handled via JWT tokens.

## Technologies Used

- **Backend:** Flask, SQLAlchemy, PyMySQL, JWT, bcrypt
- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Database:** MySQL (PlanetScale recommended)
- **Libraries:** SheetJS (xlsx) for Excel import/export
- **Fonts:** Google Fonts (Syne, DM Mono, DM Sans)