# PDS Escalation Hub

A web-based dashboard for managing and tracking product delivery escalations with analytics.

## Features

- User authentication and management
- Log new escalations with detailed information
- Track open and closed escalations
- Analytics dashboard with KPIs, TAT tracking, and charts
- Bulk import from Excel/CSV
- Export data functionality
- Responsive design

## Deployment on Render

This project is configured for easy deployment on Render as a static site.

### Steps to Deploy:

1. **Create a Git Repository:**
   - Initialize a git repo in this folder: `git init`
   - Add all files: `git add .`
   - Commit: `git commit -m "Initial commit"`

2. **Connect to Render:**
   - Go to [Render.com](https://render.com) and sign up/login
   - Click "New +" and select "Static Site"
   - Connect your Git repository (GitHub, GitLab, or Bitbucket)

3. **Configure Build Settings:**
   - **Build Command:** Leave empty (no build required)
   - **Publish Directory:** `./` (root directory)
   - The `render.yaml` file will be automatically detected for additional configuration

4. **Deploy:**
   - Click "Create Static Site"
   - Render will build and deploy your site
   - Your site will be available at the generated URL

## Local Development

Since this is a static site, you can open `index.html` directly in a web browser for local testing. No server required.

## Data Storage

The application uses browser localStorage for data persistence. All escalation data is stored locally in the user's browser.

## Technologies Used

- HTML5
- CSS3 (Custom properties, Flexbox, Grid)
- JavaScript (ES6+)
- SheetJS (xlsx) for Excel import/export
- Google Fonts (Syne, DM Mono, DM Sans)