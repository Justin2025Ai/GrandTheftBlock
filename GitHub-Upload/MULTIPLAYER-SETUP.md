# Grand Theft Block Multiplayer Setup Guide

This guide will help you set up the multiplayer functionality for Grand Theft Block.

## Local Development Setup

1. **Run the setup script**:
   - Double-click `setup-local.bat` to copy the necessary files to the public directory.

2. **Install dependencies**:
   - Make sure you have Node.js installed on your computer.
   - Open a command prompt in the project directory.
   - Run `npm install` to install the required dependencies.

3. **Start the server**:
   - Double-click `start-server.bat` or run `node server.js` in the command prompt.
   - The server will start on port 3000 (or the port specified in the PORT environment variable).

4. **Play the game**:
   - Open a web browser and navigate to `http://localhost:3000`.
   - Click "Start Game" to begin playing.
   - You can open multiple browser windows to test the multiplayer functionality.

## Replit Setup

1. **Create a new Replit project**:
   - Go to [Replit](https://replit.com).
   - Click "Create Repl".
   - Choose "Node.js" as the template.
   - Name your project (e.g., "grandtheftblock-multiplayer").

2. **Upload your files**:
   - Upload all the project files to your Replit project.
   - Make sure to include:
     - `server.js`
     - `package.json`
     - `.replit`
     - `public/index.html`
     - `public/styles.css`
     - `public/game.js`

3. **Install dependencies**:
   - In the Replit Shell, run: `npm install`.

4. **Run the server**:
   - Click the "Run" button or type `npm start` in the Shell.
   - Replit will automatically start the server and provide a URL.

5. **Share with friends**:
   - Share the Replit URL with your friends so they can join your game.

## Troubleshooting

- **WebSocket connection issues**:
  - Check the browser console for error messages.
  - Make sure your firewall isn't blocking WebSocket connections.
  - On Replit, ensure the WebSocket server is running on the same port as the HTTP server.

- **Players not seeing each other**:
  - Verify that all players are connected to the same server.
  - Check the browser console for WebSocket connection errors.

- **Game performance issues**:
  - Reduce the number of objects in the scene.
  - Optimize the update frequency of player positions.

## Advanced Configuration

- **Change the port**:
  - Set the `PORT` environment variable to change the server port.
  - Example: `PORT=8080 node server.js`

- **Enable HTTPS**:
  - For production, consider setting up HTTPS for secure WebSocket connections.
  - You'll need to modify the server code to use HTTPS and WSS protocols.

- **Add authentication**:
  - For a more secure multiplayer experience, consider adding user authentication.
  - This would require additional server-side code and a database. 