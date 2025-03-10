# Grand Theft Block Online Deployment Guide

This guide will help you deploy your Grand Theft Block game online so you can play it from anywhere and share it with friends.

## Option 1: Deploy to Render.com (Recommended)

Render.com offers a free tier that's perfect for hosting your Grand Theft Block game.

### Step 1: Create a GitHub Repository

1. Sign up for a GitHub account at [github.com](https://github.com)
2. Install Git from [git-scm.com/downloads](https://git-scm.com/downloads)
3. Run the `deploy-to-github.bat` script in this folder
4. Follow the prompts to create and push to your GitHub repository

### Step 2: Deploy on Render

1. Go to [dashboard.render.com](https://dashboard.render.com/)
2. Sign up for a free account
3. Click "New +" and select "Web Service"
4. Connect your GitHub account and select your Grand Theft Block repository
5. Use these settings:
   - Name: grandtheftblock
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Environment Variables:
     - PORT: 10000
     - NODE_ENV: production
     - MAX_PLAYERS: 100
     - INACTIVE_TIMEOUT: 300000
6. Click "Create Web Service"

Your game will be deployed and available at a URL like `https://grandtheftblock.onrender.com` (the exact URL will be shown in your Render dashboard).

## Option 2: Deploy to Glitch.com

Glitch is another easy platform for hosting web applications.

1. Go to [glitch.com](https://glitch.com) and sign up
2. Click "New Project" and select "Import from GitHub"
3. Enter your GitHub repository URL (created in Option 1)
4. Your project will be imported and automatically deployed
5. Configure environment variables:
   - Click on the project name in the top left
   - Select "Settings" → ".env"
   - Add your environment variables:
     ```
     PORT=3000
     NODE_ENV=production
     MAX_PLAYERS=50
     INACTIVE_TIMEOUT=300000
     ```
6. Click "Share" to get your public URL

## Option 3: Deploy to Replit.com

Replit is a coding platform that makes it easy to host web applications.

1. Go to [replit.com](https://replit.com) and sign up
2. Click "Create Repl" and select "Import from GitHub"
3. Enter your GitHub repository URL
4. Select "Node.js" as the language
5. Click "Import from GitHub"
6. Configure environment variables:
   - Click on the "Secrets" tab (lock icon)
   - Add each environment variable as a new secret:
     - PORT: 3000
     - NODE_ENV: production
     - MAX_PLAYERS: 50
     - INACTIVE_TIMEOUT: 300000
7. Click "Run" to start your server
8. Your game will be available at the URL shown in the preview window

## Environment Variables Configuration

Grand Theft Block uses environment variables to customize its behavior. Here's what each variable does:

| Variable | Description | Recommended Value |
|----------|-------------|------------------|
| PORT | The port on which the server will run | 3000 (Replit/Glitch), 10000 (Render) |
| NODE_ENV | Environment mode | production |
| MAX_PLAYERS | Maximum number of players allowed | 50-100 |
| INACTIVE_TIMEOUT | Time in ms before inactive players are removed | 300000 (5 minutes) |

Adjusting these variables can help you optimize your game for different hosting environments and player loads.

## Playing Your Game Online

Once deployed, you can:

1. Share the URL with friends
2. Play from any device with a web browser (computer, phone, tablet)
3. See how many players are online in real-time
4. Enjoy the full multiplayer experience from anywhere!

## Troubleshooting

- **Game doesn't load**: Make sure your deployment platform has installed all dependencies
- **Can't connect to server**: Check if your server is running (look at the logs in your deployment platform)
- **Mobile controls don't work**: Make sure you're accessing the game via HTTPS for full mobile support
- **Lag or performance issues**: Try a different browser or reduce the number of players
- **Environment variables not working**: Verify they're set correctly in your deployment platform's settings 