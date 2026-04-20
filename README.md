# PDS Escalation Hub

A web-based dashboard for managing and tracking product delivery escalations with SQLite by default and cross-device synchronization.

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

## Quick Start

### Local development
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Create the database:
   ```bash
   python init_db.py
   ```
3. Start the server:
   ```bash
   python app.py
   ```
4. Open the app in your browser:
   - http://localhost:5000
   - Login with: `admin` / `admin123`

### Render deployment
1. Push this repo to GitHub.
2. On Render, create a new Web Service and connect the repo.
3. Use these settings:
   - Build command: `pip install -r requirements.txt`
   - Start command: `gunicorn app:app`
   - Environment variables: `SECRET_KEY` and optional `DATABASE_URL`
4. If you do not set `DATABASE_URL`, the app will use `sqlite:///instance/escalation.db`.

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

The app uses **SQLite by default**. On Render, the local file lives at `instance/escalation.db` and keeps data for the running service.

#### Local Development (SQLite)
- Database file: `instance/escalation.db` (created automatically)
- No external database is required
- The database file is ignored by git

#### Optional: External database
If you want a managed database instead, set `DATABASE_URL` in Render or `.env` to a Postgres or MySQL connection string.

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
   - **Start Command:** `gunicorn app:app`
   - Add environment variables in Render dashboard:
     - `SECRET_KEY`: A random secret key for JWT
     - Optional: `DATABASE_URL` if you want to use an external database

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

The application uses SQLite by default and stores data in `instance/escalation.db`. On Render, this file is preserved by the service disk. Authentication is handled via JWT tokens.

## Technologies Used

- **Backend:** Flask, SQLAlchemy, JWT, bcrypt
- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Database:** PostgreSQL (Render recommended)
- **Libraries:** SheetJS (xlsx) for Excel import/export
- **Fonts:** Google Fonts (Syne, DM Mono, DM Sans)