# Environment Variables Guide for Grand Theft Block

This guide explains how to set up and use environment variables for your Grand Theft Block game across different deployment environments.

## Why Use Environment Variables?

Environment variables allow you to:
- Keep sensitive information (API keys, database credentials) out of your code
- Configure your application differently based on the environment (development, staging, production)
- Easily change configuration without modifying code

## Available Environment Variables

The Grand Theft Block game currently supports these environment variables:

| Variable | Description | Default Value | Required |
|----------|-------------|---------------|----------|
| PORT | The port on which the server will run | 3000 | No |
| NODE_ENV | Environment mode (development, production) | development | No |
| MAX_PLAYERS | Maximum number of players allowed | 50 | No |
| INACTIVE_TIMEOUT | Time in ms before inactive players are removed | 60000 | No |

## Setting Environment Variables

### Local Development

#### Windows (Command Prompt)
```
set PORT=8080
set NODE_ENV=development
node server.js
```

#### Windows (PowerShell)
```
$env:PORT = "8080"
$env:NODE_ENV = "development"
node server.js
```

#### Create a .env file (recommended)
1. Create a file named `.env` in your project root
2. Add your variables:
```
PORT=8080
NODE_ENV=development
MAX_PLAYERS=100
INACTIVE_TIMEOUT=120000
```
3. Install the dotenv package:
```
npm install dotenv
```
4. Add this to the top of your server.js file:
```javascript
require('dotenv').config();
```

### Deployment Platforms

#### Render
Environment variables can be set in the Render dashboard:
1. Go to your service in the Render dashboard
2. Click on "Environment"
3. Add your key-value pairs
4. Redeploy your service for the changes to take effect

#### Heroku
```
heroku config:set PORT=8080 NODE_ENV=production
```

#### Replit
Add environment variables in the Secrets tab in your Replit project.

## Reading Environment Variables in Your Code

Access environment variables in your JavaScript code:

```javascript
// server.js example
const port = process.env.PORT || 3000;
const maxPlayers = process.env.MAX_PLAYERS || 50;
const inactiveTimeout = process.env.INACTIVE_TIMEOUT || 60000;

console.log(`Server running on port ${port}`);
console.log(`Max players: ${maxPlayers}`);
console.log(`Inactive timeout: ${inactiveTimeout}ms`);
```

## Security Best Practices

1. Never commit `.env` files to version control (add `.env` to your `.gitignore`)
2. Use different values for development and production
3. Regularly rotate sensitive credentials
4. Limit access to production environment variables

## Troubleshooting

If your environment variables aren't being recognized:
1. Verify they're set correctly
2. Check for typos in variable names
3. Ensure dotenv is configured properly if using .env files
4. Restart your application after changing environment variables 