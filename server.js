const express = require("express");
const line = require("@line/bot-sdk");
const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();

const app = express();

// LINE Bot Configuration
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const blobClient = new line.messagingApi.MessagingApiBlobClient({
  channelAccessToken: config.channelAccessToken,
});

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken,
});

// Store user sessions (in production, use Redis or database)
const userSessions = new Map();
// Store user language preferences
const userLanguages = new Map();

// Translations
const translations = {
  en: {
    welcome: "👋 Welcome to Mood Post Bot! 🎵\n\nI analyze your photos and recommend music that matches the vibe!\n\n📸 How it works:\n1. Send me any image\n2. I'll detect the mood (happy, calm, energetic, sad)\n3. Get personalized song recommendations!\n\nPlease choose your language:",
    analyzing: "🎨 Analyzing your image... This will take a moment!",
    moodDetected: "✨ {description}\n\nDetected mood: {mood} {emoji}\n\nDetails: {details}\n\n🎵 Reply with 'artist' to use your favorite artists, or reply with 'surprise' for random recommendations!",
    askArtists: "🎤 Great! Tell me your favorite artists!\n\nYou can send multiple artists separated by commas.\nExample: Juice WRLD, Joji, Travis Scott",
    searching: "🔍 Searching for music by {artists}...",
    surprising: "✨ Let me surprise you with some {mood} vibes...",
    recommendations: "🎵 Here are your {mood} music recommendations:\n\n",
    sendImageFirst: "Please send me an image first so I can detect the mood! 📸",
    anotherImage: "\n✨ Send me another image for more recommendations!",
    happy: "Your image radiates happiness and positivity!",
    sad: "Your image has a melancholic, introspective feel.",
    energetic: "Your image is full of energy and excitement!",
    calm: "Your image evokes peace and tranquility.",
  },
  zh: {
    welcome: "👋 歡迎使用 Mood Post Bot！🎵\n\n我會分析你的照片，並推薦符合氛圍的音樂！\n\n📸 使用方式：\n1. 傳送任何圖片給我\n2. 我會偵測情緒（開心、平靜、充滿活力、悲傷）\n3. 獲得個人化的歌曲推薦！\n\n請選擇你的語言：",
    analyzing: "🎨 正在分析你的圖片...請稍候！",
    moodDetected: "✨ {description}\n\n偵測到的情緒：{mood} {emoji}\n\n細節：{details}\n\n🎵 回覆 'artist' 使用你最愛的歌手，或回覆 'surprise' 獲得隨機推薦！",
    askArtists: "🎤 太好了！告訴我你最喜歡的歌手！\n\n你可以用逗號分隔多位歌手。\n例如：周杰倫, 五月天, 蔡依林",
    searching: "🔍 正在搜尋 {artists} 的音樂...",
    surprising: "✨ 讓我給你一些 {mood} 氛圍的音樂...",
    recommendations: "🎵 這是你的 {mood} 音樂推薦：\n\n",
    sendImageFirst: "請先傳送圖片給我，讓我偵測情緒！📸",
    anotherImage: "\n✨ 傳送另一張圖片獲得更多推薦！",
    happy: "你的圖片散發快樂與正能量！",
    sad: "你的圖片帶有憂鬱、內省的感覺。",
    energetic: "你的圖片充滿能量與興奮！",
    calm: "你的圖片喚起平靜與寧靜。",
  }
};

// Helper function to get user's language
function getUserLanguage(userId) {
  return userLanguages.get(userId) || 'en';
}

// Helper function to get translated text
function t(userId, key, replacements = {}) {
  const lang = getUserLanguage(userId);
  let text = translations[lang][key] || translations.en[key];
  
  // Replace placeholders
  Object.keys(replacements).forEach(key => {
    text = text.replace(`{${key}}`, replacements[key]);
  });
  
  return text;
}
// Middleware
app.use("/webhook", line.middleware(config));
app.use(express.json());
app.use(express.static("public"));

// Health check endpoint
app.get("/", (req, res) => {
  res.send("Mood Post LINE Bot is running! 🎵");
});

// Webhook endpoint
app.post("/webhook", async (req, res) => {
  try {
    const events = req.body.events;

    await Promise.all(events.map(handleEvent));

    res.status(200).end();
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).end();
  }
});

// Event handler
async function handleEvent(event) {
  const userId = event.source.userId;

  switch (event.type) {
    case "follow":
      return handleFollow(event, userId);
    case "message":
      return handleMessage(event, userId);
    case "postback":
      return handlePostback(event, userId);
    default:
      return null;
  }
}

// Handle message events
async function handleMessage(event, userId) {
  const message = event.message;

  switch (message.type) {
    case "image":
      return handleImageMessage(event, userId);
    case "text":
      return handleTextMessage(event, userId);
    default:
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [
          {
            type: "text",
            text: "Please send me an image to analyze! 📸",
          },
        ],
      });
  }
}

// Handle image messages - detect mood
async function handleImageMessage(event, userId) {
  const messageId = event.message.id;
  const replyToken = event.replyToken;

  try {
    // Reply immediately so token doesn't expire
    await client.replyMessage({
      replyToken: replyToken,
      messages: [
        {
          type: "text",
          text: "🎨 Analyzing your image... This will take a moment!",
        },
      ],
    });

    // Get image content from LINE using blob client
    const blobClient = new line.messagingApi.MessagingApiBlobClient({
      channelAccessToken: config.channelAccessToken,
    });

    const imageBuffer = await blobClient.getMessageContent(messageId);

    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of imageBuffer) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Analyze mood using Google Vision API
    const mood = await analyzeMoodFromImage(buffer);

    // Store mood in session
    userSessions.set(userId, { mood, step: "mood_detected" });

    // Send mood result via push (since we already used reply token)
    // Send mood result via push - SIMPLIFIED VERSION FOR TESTING
    await client.pushMessage({
      to: userId,
      messages: [
        {
          type: "text",
          text: `✨ ${
            mood.description
          }\n\nDetected mood: ${mood.moodType.toUpperCase()} ${getMoodEmoji(
            mood.moodType
          )}\n\nDetails: ${
            mood.details
          }\n\n🎵 Reply with "artist" to use your favorite artists, or reply with "surprise" for random recommendations!`,
        },
      ],
    });
  } catch (error) {
    console.error("Image handling error:", error);
    // Send error via push
    await client.pushMessage({
      to: userId,
      messages: [
        {
          type: "text",
          text: "❌ Sorry, I had trouble analyzing your image. Please try again!",
        },
      ],
    });
  }
}

// Handle text messages - artist input
async function handleTextMessage(event, userId) {
  const session = userSessions.get(userId);
  const text = event.message.text.toLowerCase().trim();

  // Check for keywords even without session
  if (text === "artist" || text === "artists") {
    if (!session || !session.mood) {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [
          {
            type: "text",
            text: "Please send me an image first so I can detect the mood! 📸",
          },
        ],
      });
    }

    // Update session to wait for artists
    userSessions.set(userId, { ...session, step: "waiting_for_artists" });

    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: "text",
          text: "🎤 Great! Tell me your favorite artists!\n\nYou can send multiple artists separated by commas.\nExample: Juice WRLD, Joji, Travis Scott",
        },
      ],
    });
  }

  if (text === "surprise") {
    if (!session || !session.mood) {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [
          {
            type: "text",
            text: "Please send me an image first so I can detect the mood! 📸",
          },
        ],
      });
    }

    try {
      await client.replyMessage({
        replyToken: event.replyToken,
        messages: [
          {
            type: "text",
            text: `✨ Let me surprise you with some ${session.mood.moodType} vibes...`,
          },
        ],
      });

      const recommendations = await getSurpriseRecommendations(
        session.mood.moodType
      );
      userSessions.delete(userId);
      await sendRecommendations(userId, recommendations, session.mood.moodType);
    } catch (error) {
      console.error("Surprise recommendation error:", error);
      await client.pushMessage({
        to: userId,
        messages: [
          {
            type: "text",
            text: "❌ Sorry, I had trouble finding music. Please try again!",
          },
        ],
      });
    }
    return;
  }

  if (!session) {
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: "text",
          text: "👋 Hi! Send me an image and I'll recommend music based on its vibe! 📸🎵",
        },
      ],
    });
  }

  if (session.step === "waiting_for_artists") {
    try {
      const artistsText = event.message.text;
      const artists = artistsText
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a);

      if (artists.length === 0) {
        return client.replyMessage({
          replyToken: event.replyToken,
          messages: [
            {
              type: "text",
              text: "❌ Please provide at least one artist name!",
            },
          ],
        });
      }

      await client.replyMessage({
        replyToken: event.replyToken,
        messages: [
          {
            type: "text",
            text: `🔍 Searching for music by ${artists.join(", ")}...`,
          },
        ],
      });

      const recommendations = await getArtistRecommendations(
        artists,
        session.mood.moodType
      );

      userSessions.delete(userId);
      await sendRecommendations(userId, recommendations, session.mood.moodType);
    } catch (error) {
      console.error("Artist recommendation error:", error);
      await client.pushMessage({
        to: userId,
        messages: [
          {
            type: "text",
            text: "❌ Sorry, I had trouble finding music. Please try again!",
          },
        ],
      });
    }
  } else {
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: "text",
          text: "Please send me an image first! 📸",
        },
      ],
    });
  }
}

// Handle postback events - user selected option
async function handlePostback(event, userId) {
  const data = event.postback.data;
  const session = userSessions.get(userId);

  if (!session) {
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: "text",
          text: "Session expired. Please send an image again! 📸",
        },
      ],
    });
  }

  if (data === "action=artist_mode") {
    // Ask for artists
    userSessions.set(userId, { ...session, step: "waiting_for_artists" });

    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: "text",
          text: "🎤 Great! Tell me your favorite artists!\n\nYou can send multiple artists separated by commas.\nExample: Taylor Swift, Ed Sheeran, The Weeknd",
        },
      ],
    });
  } else if (data === "action=surprise_mode") {
    try {
      // Get surprise recommendations based on mood
      await client.replyMessage({
        replyToken: event.replyToken,
        messages: [
          {
            type: "text",
            text: `✨ Let me surprise you with some ${session.mood.moodType} vibes...`,
          },
        ],
      });

      const recommendations = await getSurpriseRecommendations(
        session.mood.moodType
      );

      // Clear session
      userSessions.delete(userId);

      // Send recommendations
      await sendRecommendations(userId, recommendations, session.mood.moodType);
    } catch (error) {
      console.error("Surprise recommendation error:", error);
      await client.pushMessage({
        to: userId,
        messages: [
          {
            type: "text",
            text: "❌ Sorry, I had trouble finding music. Please try again!",
          },
        ],
      });
    }
  }
}

// ==================== MOOD DETECTION ====================

async function analyzeMoodFromImage(imageBuffer) {
  const base64Image = imageBuffer.toString("base64");

  const requestBody = {
    requests: [
      {
        image: { content: base64Image },
        features: [
          { type: "LABEL_DETECTION", maxResults: 10 },
          { type: "FACE_DETECTION", maxResults: 5 },
          { type: "IMAGE_PROPERTIES", maxResults: 10 },
        ],
      },
    ],
  };

  const response = await axios.post(
    `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
    requestBody
  );

  const result = response.data.responses[0];
  return detectMood(result);
}

function detectMood(visionResult) {
  const moodScores = {
    happy: 0,
    sad: 0,
    energetic: 0,
    calm: 0,
  };

  const moodKeywords = {
    happy: [
      "fun",
      "party",
      "celebration",
      "smile",
      "joy",
      "sunshine",
      "bright",
      "colorful",
      "happy",
      "cheerful",
    ],
    sad: [
      "rain",
      "dark",
      "alone",
      "melancholy",
      "cry",
      "lonely",
      "gray",
      "gloomy",
      "sad",
    ],
    energetic: [
      "sport",
      "dance",
      "music",
      "festival",
      "crowd",
      "action",
      "concert",
      "energy",
      "active",
    ],
    calm: [
      "nature",
      "sky",
      "water",
      "peaceful",
      "serene",
      "sunset",
      "beach",
      "forest",
      "calm",
      "quiet",
    ],
  };

  const detectedLabels = [];

  // Analyze labels
  if (visionResult.labelAnnotations) {
    visionResult.labelAnnotations.forEach((label) => {
      const desc = label.description.toLowerCase();
      detectedLabels.push(desc);

      Object.keys(moodKeywords).forEach((mood) => {
        if (moodKeywords[mood].some((keyword) => desc.includes(keyword))) {
          moodScores[mood] += label.score;
        }
      });
    });
  }

  // Analyze faces
  if (visionResult.faceAnnotations && visionResult.faceAnnotations.length > 0) {
    visionResult.faceAnnotations.forEach((face) => {
      if (
        face.joyLikelihood === "VERY_LIKELY" ||
        face.joyLikelihood === "LIKELY"
      ) {
        moodScores.happy += 0.5;
      }
      if (
        face.sorrowLikelihood === "VERY_LIKELY" ||
        face.sorrowLikelihood === "LIKELY"
      ) {
        moodScores.sad += 0.5;
      }
    });
  }

  // Analyze colors
  if (visionResult.imagePropertiesAnnotation) {
    const colors = visionResult.imagePropertiesAnnotation.dominantColors.colors;
    if (colors && colors.length > 0) {
      const dominantColor = colors[0].color;
      const brightness =
        (dominantColor.red + dominantColor.green + dominantColor.blue) / 3;

      if (brightness > 180) {
        moodScores.happy += 0.3;
        moodScores.energetic += 0.2;
      } else if (brightness < 100) {
        moodScores.sad += 0.3;
        moodScores.calm += 0.2;
      }

      // Warm colors = energetic, Cool colors = calm
      if (dominantColor.red > dominantColor.blue) {
        moodScores.energetic += 0.2;
      } else {
        moodScores.calm += 0.2;
      }
    }
  }

  // Determine dominant mood
  let dominantMood = "calm";
  let maxScore = 0;

  Object.keys(moodScores).forEach((mood) => {
    if (moodScores[mood] > maxScore) {
      maxScore = moodScores[mood];
      dominantMood = mood;
    }
  });

  const moodDescriptions = {
    happy: "Your image radiates happiness and positivity!",
    sad: "Your image has a melancholic, introspective feel.",
    energetic: "Your image is full of energy and excitement!",
    calm: "Your image evokes peace and tranquility.",
  };

  return {
    moodType: dominantMood,
    description: moodDescriptions[dominantMood],
    scores: moodScores,
    details: `Detected: ${detectedLabels.slice(0, 5).join(", ")}`,
  };
}

// ==================== MUSIC RECOMMENDATIONS ====================

async function getSpotifyToken() {
  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const response = await axios.post(
    "https://accounts.spotify.com/api/token",
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return response.data.access_token;
}

async function getArtistRecommendations(artists, mood) {
  const token = await getSpotifyToken();
  const recommendations = [];

  for (const artistName of artists.slice(0, 3)) {
    // Limit to 3 artists
    try {
      // Search for artist
      const searchResponse = await axios.get(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(
          artistName
        )}&type=artist&limit=1`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (searchResponse.data.artists.items.length > 0) {
        const artist = searchResponse.data.artists.items[0];

        // Get top tracks
        const tracksResponse = await axios.get(
          `https://api.spotify.com/v1/artists/${artist.id}/top-tracks?market=US`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        tracksResponse.data.tracks.slice(0, 3).forEach((track) => {
          recommendations.push({
            name: track.name,
            artist: track.artists[0].name,
            url: track.external_urls.spotify,
            image: track.album.images[0]?.url,
          });
        });
      }
    } catch (error) {
      console.error(`Error fetching artist ${artistName}:`, error.message);
    }
  }

  return recommendations;
}

async function getSurpriseRecommendations(mood) {
  const token = await getSpotifyToken();

  const moodQueries = {
    happy: "happy upbeat feel good",
    sad: "sad melancholy emotional",
    energetic: "energetic pump up workout",
    calm: "calm peaceful relaxing chill",
  };

  const query = moodQueries[mood] || "popular music";

  // Search for playlists
  const playlistResponse = await axios.get(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(
      query
    )}&type=playlist&limit=3`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const recommendations = [];

  if (playlistResponse.data.playlists.items.length > 0) {
    for (const playlist of playlistResponse.data.playlists.items.slice(0, 2)) {
      try {
        const tracksResponse = await axios.get(
          `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=5`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        tracksResponse.data.items.forEach((item) => {
          if (item.track && recommendations.length < 9) {
            recommendations.push({
              name: item.track.name,
              artist: item.track.artists[0]?.name || "Unknown",
              url: item.track.external_urls.spotify,
              image: item.track.album.images[0]?.url,
            });
          }
        });
      } catch (error) {
        console.error("Error fetching playlist tracks:", error.message);
      }
    }
  }

  return recommendations;
}

async function sendRecommendations(userId, recommendations, mood) {
  if (recommendations.length === 0) {
    return client.pushMessage({
      to: userId,
      messages: [
        {
          type: "text",
          text: "😕 Sorry, I couldn't find any recommendations. Please try again!",
        },
      ],
    });
  }

  // Create message with recommendations
  let messageText = `🎵 Here are your ${mood.toUpperCase()} music recommendations:\n\n`;

  recommendations.forEach((track, index) => {
    messageText += `${index + 1}. ${track.name}\n`;
    messageText += `   by ${track.artist}\n`;
    messageText += `   🎧 ${track.url}\n\n`;
  });

  messageText += "\n✨ Send me another image for more recommendations!";

  await client.pushMessage({
    to: userId,
    messages: [
      {
        type: "text",
        text: messageText,
      },
    ],
  });
}

// ==================== HELPER FUNCTIONS ====================

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

function getMoodEmoji(mood) {
  const emojis = {
    happy: "😊",
    sad: "😔",
    energetic: "⚡",
    calm: "😌",
  };
  return emojis[mood] || "🎵";
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Mood Post LINE Bot server running on port ${PORT}`);
  console.log(`📝 Webhook URL: http://localhost:${PORT}/webhook`);
});
