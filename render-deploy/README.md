# Grand Theft Block Multiplayer

A 3D multiplayer game built with Three.js and WebSockets where players can explore a block world, fly planes, and throw water balloons.

## Features

- 3D world exploration
- Multiplayer functionality
- Airplane flying
- Water balloon throwing
- Mobile-friendly controls
- Real-time player count display

## Local Development

1. **Install dependencies**:
   ```
   npm install
   ```

2. **Start the server**:
   ```
   npm start
   ```
   or
   ```
   node server.js
   ```
   
   For a guided setup with environment options:
   ```
   .\setup-and-run.bat
   ```

3. **Access the game**:
   Open your browser and navigate to `http://localhost:3000`

## Environment Variables

Grand Theft Block supports configuration through environment variables:

| Variable | Description | Default Value |
|----------|-------------|---------------|
| PORT | The port on which the server will run | 3000 |
| NODE_ENV | Environment mode (development, production) | development |
| MAX_PLAYERS | Maximum number of players allowed | 50 |
| INACTIVE_TIMEOUT | Time in ms before inactive players are removed | 60000 |

### Setting Environment Variables

#### Using a .env file (recommended for development)
Create a `.env` file in the project root:
```
PORT=3000
NODE_ENV=development
MAX_PLAYERS=50
INACTIVE_TIMEOUT=60000
```

#### Using command line (Windows)
```
set PORT=8080
set NODE_ENV=development
node server.js
```

For more details, see the [ENVIRONMENT-VARIABLES.md](ENVIRONMENT-VARIABLES.md) guide.

## Deploying to the Web

You can deploy Grand Theft Block to various cloud platforms to make it accessible from mobile devices and share it with friends.

### Deploying to Heroku

1. **Create a Heroku account** at [heroku.com](https://heroku.com)

2. **Install the Heroku CLI** from [devcenter.heroku.com/articles/heroku-cli](https://devcenter.heroku.com/articles/heroku-cli)

3. **Login to Heroku**:
   ```
   heroku login
   ```

4. **Create a new Heroku app**:
   ```
   heroku create your-gtb-app-name
   ```

5. **Deploy to Heroku**:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git push heroku master
   ```

6. **Open your app**:
   ```
   heroku open
   ```

### Deploying to Render

1. **Create a Render account** at [render.com](https://render.com)

2. **Create a new Web Service**:
   - Connect your GitHub repository
   - Select the repository with your Grand Theft Block code
   - Use the following settings:
     - Environment: Node
     - Build Command: `npm install`
     - Start Command: `node server.js`
     - Environment Variables:
       - PORT: 10000
       - NODE_ENV: production
       - MAX_PLAYERS: 100
       - INACTIVE_TIMEOUT: 300000

3. **Deploy your app**:
   - Click "Create Web Service"
   - Render will automatically build and deploy your app

### Deploying to Glitch

1. **Create a Glitch account** at [glitch.com](https://glitch.com)

2. **Create a new project**:
   - Click "New Project" and select "Import from GitHub"
   - Enter your GitHub repository URL

3. **Your app will be automatically deployed**:
   - Glitch will provide you with a unique URL for your game
   - Configure environment variables in the Glitch editor under .env

## Controls

### Desktop Controls
- **WASD**: Move
- **Mouse**: Look around
- **Space**: Jump
- **E**: Enter/exit plane
- **Left Click**: Throw water balloon

### Mobile Controls
- **Left Joystick**: Move
- **Touch Screen**: Look around
- **JUMP Button**: Jump
- **THROW Button**: Throw water balloon
- **PLANE Button**: Enter/exit plane

## License

This project is licensed under the MIT License - see the LICENSE file for details 