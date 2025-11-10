# Mood Post LINE Bot 🎵

A LINE bot that analyzes images to detect mood and recommends music based on the vibe!

## Features

- 📸 **Image Mood Detection**: Upload an image and get instant mood analysis
- 🎵 **Music Recommendations**: Get personalized music suggestions based on detected mood
- 🎤 **Artist Mode**: Enter your favorite artists for tailored recommendations
- ✨ **Surprise Mode**: Let the bot surprise you with mood-matched playlists
- 🎨 **Smart Analysis**: Uses Google Vision API to detect emotions, colors, and content

## How It Works

1. **Send an Image**: User sends any image to the bot
2. **Mood Analysis**: Bot analyzes mood using AI (happy, sad, energetic, calm)
3. **Choose Mode**: User selects between "My Favorite Artists" or "Surprise Me"
4. **Get Recommendations**: Bot returns Spotify music recommendations with links

## Setup Instructions

### 1️⃣ Prerequisites

- Node.js 16+ installed
- LINE Developers account
- Google Cloud account (for Vision API)
- Spotify Developer account

### 2️⃣ Create LINE Bot

1. Go to [LINE Developers Console](https://developers.line.biz/console/)
2. Create a new Provider (if you don't have one)
3. Create a new Messaging API channel
4. Go to "Messaging API" tab and note down:
   - **Channel Secret** (in Basic Settings)
   - **Channel Access Token** (generate one in Messaging API tab)
5. Enable "Use webhooks" in Messaging API settings
6. Disable "Auto-reply messages" and "Greeting messages"

### 3️⃣ Get API Keys

**Google Vision API:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Cloud Vision API"
4. Create API Key in Credentials

**Spotify API:**
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create an app
3. Note down Client ID and Client Secret

### 4️⃣ Install Dependencies

```bash
npm install
```

### 5️⃣ Configure Environment

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` with your credentials:
```env
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret

SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

GOOGLE_VISION_API_KEY=your_google_vision_api_key

PORT=3000
```

### 6️⃣ Run the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

### 7️⃣ Expose Server to Internet

For development, use [ngrok](https://ngrok.com/):

```bash
# Install ngrok
npm install -g ngrok

# Start ngrok
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### 8️⃣ Set Webhook URL

1. Go to your LINE channel in [LINE Developers Console](https://developers.line.biz/console/)
2. Go to "Messaging API" tab
3. Set Webhook URL: `https://your-ngrok-url.ngrok.io/webhook`
4. Enable "Use webhook"
5. Click "Verify" to test the connection

### 9️⃣ Add Bot as Friend

1. In LINE Developers Console, find your bot's QR code
2. Scan with LINE app on your phone
3. Start chatting!

## Usage

1. **Send an image** to the bot
2. Wait for mood analysis
3. Choose your preference:
   - 🎤 **My Favorite Artists**: Enter artist names (comma-separated)
   - ✨ **Surprise Me**: Get mood-based recommendations
4. Receive Spotify music links!

## Example Conversation

```
You: [Sends sunset beach photo]

Bot: 🎨 Analyzing your image... This will take a moment!

Bot: ✨ Your image evokes peace and tranquility.

Detected mood: CALM 😌

Details:
Detected: sky, water, sunset, beach, peaceful

Bot: 🎵 How would you like me to find music for you?
     [🎤 My Favorite Artists] [✨ Surprise Me!]

You: [Clicks "Surprise Me!"]

Bot: ✨ Let me surprise you with some calm vibes...

Bot: 🎵 Here are your CALM music recommendations:

1. Weightless
   by Marconi Union
   🎧 https://open.spotify.com/track/...

2. Clair de Lune
   by Claude Debussy
   🎧 https://open.spotify.com/track/...

...

✨ Send me another image for more recommendations!
```

## Deployment Options

### Option 1: Heroku

```bash
# Install Heroku CLI
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set LINE_CHANNEL_ACCESS_TOKEN=your_token
heroku config:set LINE_CHANNEL_SECRET=your_secret
heroku config:set SPOTIFY_CLIENT_ID=your_id
heroku config:set SPOTIFY_CLIENT_SECRET=your_secret
heroku config:set GOOGLE_VISION_API_KEY=your_key

# Deploy
git push heroku main

# Get your webhook URL
heroku info
```

### Option 2: Railway

1. Connect your GitHub repo to [Railway](https://railway.app/)
2. Add environment variables in Railway dashboard
3. Railway will auto-deploy and provide HTTPS URL

### Option 3: AWS/GCP/Azure

Deploy as a containerized app or use serverless functions.

## Project Structure

```
Mood_Post/
├── server.js           # Main LINE bot server
├── package.json        # Dependencies
├── .env.example        # Environment template
├── .env               # Your credentials (git-ignored)
├── index.html         # Original web interface
└── README.md          # This file
```

## Troubleshooting

### Webhook verification fails
- Check that server is running and accessible
- Verify ngrok/deployment URL is correct
- Check LINE_CHANNEL_SECRET matches

### Bot doesn't respond
- Check webhook is enabled in LINE console
- Verify environment variables are set
- Check server logs for errors

### Image analysis fails
- Verify Google Vision API key is valid
- Check API is enabled in Google Cloud Console
- Ensure image size is reasonable (<20MB)

### Music recommendations fail
- Verify Spotify API credentials
- Check token generation works
- Try different search terms

## API Rate Limits

- **LINE Messaging API**: 500 messages/hour (free tier)
- **Google Vision API**: 1000 requests/month free, then paid
- **Spotify API**: Rate limits apply, usually sufficient for personal use

## Security Notes

- Never commit `.env` file to git
- Use environment variables for all secrets
- Consider implementing user rate limiting
- Monitor API usage to avoid unexpected costs

## Future Enhancements

- [ ] Store user preferences in database
- [ ] Add playlist creation feature
- [ ] Support multiple languages
- [ ] Add audio preview clips
- [ ] Implement caching for faster responses
- [ ] Add analytics and usage tracking

## License

MIT

## Support

If you encounter issues, check:
1. Server logs
2. LINE webhook delivery logs
3. API quota limits

## Credits

- LINE Messaging API
- Google Vision API
- Spotify Web API
