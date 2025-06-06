# Getting Your Ball Don't Lie API Key

## Step 1: Create an Account

1. Visit https://www.balldontlie.io/
2. Click "Sign Up" to create a free account
3. Verify your email address

## Step 2: Get Your API Key

1. Log into your Ball Don't Lie account
2. Go to your dashboard
3. Find your API key in the "API Key" section
4. Copy the key (it will look something like: `abc123def456...`)

## Step 3: Configure the Environment

1. Open the file `server/.env`
2. Replace `your_api_key_here` with your actual API key:
   ```
   API_KEY=abc123def456ghi789jkl012mno345pqr678
   ```

## API Subscription Tiers

Ball Don't Lie offers different subscription tiers with varying rate limits and access to different endpoints:

| Tier     | Requests/Min | Cost (USD/mo) |
| -------- | ------------ | ------------- |
| Free     | 5            | $0            |
| ALL-STAR | 60           | $9.99         |
| GOAT     | 600          | $39.99        |

### Available Endpoints by Tier

#### Free Tier

- Teams
- Players
- Games

#### ALL-STAR Tier

- All Free tier endpoints
- Game Player Stats
- Active Players
- Player Injuries

#### GOAT Tier

- All ALL-STAR tier endpoints
- Season Averages
- Game Advanced Stats
- Box Scores
- Team Standings
- Leaders
- Betting Odds

Our application is designed to work with the free tier, but will automatically enable additional features if you have a higher tier subscription.
PORT=5000

````
3. Save the file

## Free Tier Limits

- 5 requests per minute
- Access to basic endpoints (games, teams, players)
- No cost required

## Important Notes

- Keep your API key secure and never commit it to version control
- The free tier is sufficient for this demo application
- If you exceed rate limits, the app will handle errors gracefully

## Testing Your Setup

After setting up your API key, start the application with:

```bash
npm run dev
````

If everything is working correctly, you should see NBA games loading in the browser at http://localhost:3000
