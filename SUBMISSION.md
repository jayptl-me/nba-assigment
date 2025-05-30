# SportsOrca Full Stack Development Internship Submission

**Submitted by**: Jay Patel  
**Date**: May 30th, 2025  
**Email**: <sportsorcateam@gmail.com>

## Task Complete: Upcoming NBA Matches Web Application

I have successfully created a web application that displays upcoming NBA matches as requested.

## Requirements Completed

- **Sport Selected**: Basketball (NBA)
- **Web Page**: Clean, responsive interface displaying upcoming matches
- **API Integration**: Ball Don't Lie NBA API
- **Team Information**: Both teams displayed for each match
- **Date/Time Display**: Match scheduling information
- **Optional Backend**: Node.js/Express server implementation

## Solution Overview

A full-stack web application that fetches and displays upcoming NBA matches with professional UI/UX design.

## Technical Stack

**Frontend**: React.js with responsive design and error handling  
**Backend**: Node.js/Express server with API integration  
**API**: Ball Don't Lie NBA API (<https://api.balldontlie.io/v1>)  
**Features**: Auto-refresh, loading states, professional UI

## Quick Setup

```bash
# Install all dependencies
npm run install-deps

# Configure API key in server/.env file
echo "API_KEY=your_api_key_here" > server/.env

# Start the application
npm run dev
```

**Access Points:**

- Frontend: <http://localhost:3000>
- Backend API: <http://localhost:5000/api>

## Project Structure

```text
nba-assignment/
├── server/          # Express backend
├── client/          # React frontend
├── README.md        # Setup guide
└── API_SETUP.md     # API configuration
```

## Implementation Notes

- **API**: Ball Don't Lie NBA API with 5 requests/minute limit
- **Demo Data**: Shows sample matches during NBA off-season
- **Development Time**: ~30 minutes for core functionality

## Summary

Complete implementation of requested NBA matches display with:

- Full-stack architecture (React + Express)
- Professional UI with responsive design
- API integration with error handling
- All task requirements met

**Contact**: <sportsorcateam@gmail.com>
