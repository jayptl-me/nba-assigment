# SportsOrca NBA Upcoming Matches

## Project Overview

This is a full-stack web application that displays upcoming NBA matches fetched from the Ball Don't Lie NBA API. The project was created as part of the SportsOrca Full Stack Development Internship task.

![NBA Live Tracker](https://i.imgur.com/example-screenshot.jpg)

## Technology Stack

- **Frontend**: React.js (v19.1.0) with modern UI components
- **Backend**: Node.js with Express.js (v4.18.2)
- **API**: Ball Don't Lie NBA API (https://api.balldontlie.io/v1)
- **Styling**: Custom CSS with glassmorphism design
- **Data Formatting**: Moment.js
- **HTTP Client**: Axios
- **Security**: Helmet.js
- **Rate Limiting**: express-rate-limit

## Features

- 🏀 Real-time NBA game schedules
- 📱 Responsive design for all devices
- 🔄 Auto-refresh data every 5 minutes
- 🎨 Modern glassmorphism UI with animations
- ⚡ Fast loading with comprehensive error handling
- 🔑 Secure API key management
- 🔒 Security headers with Helmet.js
- ⚖️ Rate limiting to prevent abuse
- 📝 Request logging
- 🌐 Configurable CORS settings
- 🎭 Demo mode when no games are scheduled

## API Information

- **API Provider**: Ball Don't Lie NBA API
- **Base URL**: https://api.balldontlie.io/v1
- **Endpoints Used**:
  - `/games` - Get upcoming NBA games
  - `/teams` - Get all NBA teams
- **Authentication**: API key required (free tier available)
- **Documentation**: [Ball Don't Lie API Docs](https://www.balldontlie.io/home.html#api-docs)

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Ball Don't Lie API key (get it free at https://www.balldontlie.io/)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd sports_orca
   ```

2. **Install dependencies**

   ```bash
   npm run install-deps
   ```

   This will install dependencies for the root, server, and client directories.

3. **Set up environment variables**

   ```bash
   cd server
   ```

   Create a `.env` file and add your API key:

   ```
   API_KEY=your_actual_api_key_here
   PORT=5000
   ```

   See [API_SETUP.md](./API_SETUP.md) for detailed instructions on obtaining an API key.

4. **Start the application**
   ```bash
   cd ..
   npm run dev
   ```
   This will start both the backend server (port 5000) and React frontend (port 3000).

### Alternative Setup (Development)

**Start Backend Server:**

```bash
cd server
npm run dev
```

**Start Frontend (in another terminal):**

```bash
cd client
npm start
```

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. The app will automatically fetch and display upcoming NBA matches
3. Games are sorted by date/time
4. The display includes:
   - Team names and cities
   - Game date and time
   - Current status (Upcoming, Live, Final)
   - Scores (for live/completed games)
   - Period and time remaining (for live games)

## API Rate Limits

The free tier of Ball Don't Lie API allows:

- 5 requests per minute
- Access to games, teams, and players endpoints

The app is designed to respect these limits by:

- Adding 1-second delays between API calls
- Limiting to 2 days of upcoming games
- Caching results and refreshing every 5 minutes
- Implementing fallback to demo mode when no games are available

## Project Structure

```
sports_orca/
├── package.json          # Root package configuration with scripts
├── README.md             # Project documentation
├── API_SETUP.md          # API key setup instructions
├── server/               # Backend Express server
│   ├── index.js          # Main server file
│   ├── package.json      # Server dependencies
│   ├── .env              # Environment variables (create this)
│   ├── logs/             # Server logs directory
│   └── scripts/          # Server utility scripts
└── client/               # Frontend React app
    ├── public/           # Static files
    ├── src/              # React source code
    │   ├── App.js        # Main app component
    │   ├── App.css       # Main styles
    │   └── components/   # React components
    │       ├── Header.js
    │       ├── MatchCard.js
    │       └── UpcomingMatches.js
    └── package.json      # Client dependencies
```

## Components

### Backend Components

- **Express Server**: Handles API requests with middleware for security and logging
- **API Routes**:
  - `/api/games/upcoming`: Fetches upcoming NBA games
  - `/api/teams`: Gets all NBA teams
  - `/api/health`: Server health check endpoint
- **Middleware**:
  - CORS configuration
  - Helmet security headers
  - Rate limiting
  - Request logging
  - API key validation

### Frontend Components

- **App.js**: Main application container
- **Header.js**: Page header with animated basketball icon
- **UpcomingMatches.js**: Manages state, API fetching, and rendering of match cards
- **MatchCard.js**: Displays individual game information with status indicators

## Security Features

- API key stored in environment variables (not in code)
- Helmet.js for security headers
- Rate limiting to prevent abuse
- Request logging for auditing
- Configurable CORS to prevent unauthorized access
- Body size limits to prevent DOS attacks
- Error message sanitization in production mode

## Styling

The application features a modern glassmorphism design with:

- Gradient backgrounds
- Frosted glass effects with backdrop-filter
- Smooth animations and transitions
- Responsive grid layout
- Mobile-friendly design
- Status indicators with color coding
- Custom loading spinners
- Demo mode indicators

## Error Handling

- Network error handling with retry functionality
- API rate limit awareness
- Loading states with visual feedback
- Fallback to demo mode when no games are available
- Graceful error messages for users
- Console logging for debugging
- Request logging to files

## Deployment

The application can be deployed to various platforms:

1. **Traditional Hosting**:

   - Build the client: `npm run build`
   - Deploy the server and client/build directory

2. **Container-Based**:

   - A Dockerfile is included for containerization
   - Deploy to Kubernetes, Docker Swarm, or cloud container services

3. **Serverless**:
   - Adapt the backend for serverless functions
   - Deploy frontend to static hosting

## Future Enhancements

- Live score updates with WebSockets
- Team statistics and standings
- Player information and stats
- Game highlights integration
- Push notifications for game starts
- Historical data and statistics
- User accounts and favorite teams
- Dark/light theme toggle
- PWA support for offline access

## Troubleshooting

- **API Key Issues**: Verify your API key in the `.env` file and check [API_SETUP.md](./API_SETUP.md)
- **CORS Errors**: Configure allowed origins in the server's `.env` file
- **Rate Limiting**: The app may show temporary errors if API rate limits are exceeded
- **Empty Results**: If no games are scheduled, the app will enter demo mode

## Contributing

This project was created for the SportsOrca internship evaluation. For questions or improvements, please:

1. Fork the repository
2. Create a feature branch
3. Submit a pull request with detailed descriptions
4. Follow the code style guidelines

## License

MIT License

---

**Created for SportsOrca Full Stack Development Internship**  
**Submission Date**: May 30th, 2025  
**Contact**: sportsorcateam@gmail.com
