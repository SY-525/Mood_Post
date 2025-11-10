# Quick Start Guide 🚀

Get your LINE bot running in 5 minutes!

## Step-by-Step Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Get Your LINE Credentials

1. Visit: https://developers.line.biz/console/
2. Create a Messaging API channel
3. Copy your credentials:
   - Channel Secret (Basic Settings tab)
   - Channel Access Token (Messaging API tab - click "Issue")

### 3. Setup Environment File

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your LINE credentials
# (Keep the existing Spotify and Google API keys for now)
```

Your `.env` should look like:
```env
LINE_CHANNEL_ACCESS_TOKEN=YOUR_LINE_TOKEN_HERE
LINE_CHANNEL_SECRET=YOUR_LINE_SECRET_HERE

# These are already filled in (you can replace with your own later)
SPOTIFY_CLIENT_ID=3a72c2c41f06421a84b47252b4f77e01
SPOTIFY_CLIENT_SECRET=4df125be91034342aa36fdbe578af679
GOOGLE_VISION_API_KEY=AIzaSyASgk4x58RuQGYXFoBjTqLo48O5T0eo4HI

PORT=3000
```

### 4. Start the Server

```bash
npm start
```

You should see:
```
🚀 Mood Post LINE Bot server running on port 3000
📝 Webhook URL: http://localhost:3000/webhook
```

### 5. Make Your Server Public (ngrok)

In a NEW terminal:

```bash
# If you don't have ngrok, install it:
npm install -g ngrok

# Start ngrok
ngrok http 3000
```

Copy the HTTPS URL from ngrok (looks like: `https://abc123.ngrok-free.app`)

### 6. Configure LINE Webhook

1. Go back to: https://developers.line.biz/console/
2. Open your Messaging API channel
3. Go to "Messaging API" tab
4. Find "Webhook settings"
5. Set Webhook URL: `https://your-ngrok-url.ngrok-free.app/webhook`
6. Toggle "Use webhook" to ON
7. Click "Verify" button (should show success ✅)

### 7. Disable Auto-Reply

Still in LINE console:
1. Scroll to "LINE Official Account features"
2. Click "Edit" next to each:
   - Auto-reply messages → Disable
   - Greeting messages → Disable

### 8. Add Your Bot!

1. In LINE console, find the QR code
2. Scan with your LINE app
3. Send an image!

## Test Your Bot

Send any image to your bot and you should get:
1. "🎨 Analyzing your image..." message
2. Mood detection results
3. Options to choose music preference
4. Music recommendations!

## Common Issues

### "Webhook verification failed"
- Make sure ngrok is running
- Check the URL has `/webhook` at the end
- Verify LINE_CHANNEL_SECRET is correct

### "Bot doesn't respond"
- Check `npm start` terminal for errors
- Verify webhook is enabled (toggle ON)
- Check you disabled auto-reply

### "Image analysis error"
- Google API key might need replacement
- Check server logs for specific error

## Next Steps

Once it's working:
1. Get your own Google Vision API key (instructions in README.md)
2. Get your own Spotify API credentials
3. Deploy to a permanent server (Heroku, Railway, etc.)

## Need Help?

Check the full README.md for detailed documentation!
