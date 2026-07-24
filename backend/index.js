const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./database');
const botService = require('./bot');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static assets (like watermark logo and locally generated files)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Root status endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'NexaGen Video Creator Portfolio API is running!',
    watermark: `${req.protocol}://${req.get('host')}/public/watermark.svg`,
    timestamp: new Date()
  });
});

// API Routes
app.get('/api/videos', async (req, res) => {
  try {
    const { category } = req.query;
    const videos = await db.getVideos(category);
    res.json(videos);
  } catch (err) {
    console.error('Error fetching videos:', err);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

app.get('/api/social-links', async (req, res) => {
  try {
    const links = await db.getSocialLinks();
    res.json(links);
  } catch (err) {
    console.error('Error fetching social links:', err);
    res.status(500).json({ error: 'Failed to fetch social links' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json(stats);
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Telegram Bot Webhook endpoint
app.post('/api/bot', (req, res) => {
  const bot = botService.getBotInstance();
  if (bot) {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } else {
    res.status(500).json({ error: 'Bot not initialized' });
  }
});

// Seed data function to populate portfolio out-of-the-box
async function seedInitialVideosIfNeeded() {
  try {
    const existingVideos = await db.getVideos();
    if (existingVideos.length === 0) {
      console.log('Seeding initial creative videos to database...');
      
      const seedVideos = [
        {
          title: "Next-Gen Cyberpunk Short Film Reel",
          description: "A futuristic visual reel exploring neon cityscape aesthetics, cyberpunk themes, and state-of-the-art grading techniques. Sound design fully custom.",
          category: "Cinematic",
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          thumbnailUrl: "https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?auto=format&fit=crop&w=800&q=80"
        },
        {
          title: "When Code Doesn't Compile on Friday",
          description: "An absolute classic humor skit depicting the five stages of grief when a production hotfix goes wrong right before the weekend. Tag a developer friend!",
          category: "Comedy",
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          thumbnailUrl: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=800&q=80"
        },
        {
          title: "Top 5 Insane Camera Gears for Creators (2026)",
          description: "Unboxing and testing the absolute best tools, stabilizers, and anamorphic lenses that will elevate your mobile videography and visual storytelling this year.",
          category: "Tech",
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          thumbnailUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80"
        },
        {
          title: "Lost in Tokyo: Solo Filmmaker Vlog",
          description: "Roaming around Akihabara and Shinjuku at 2 AM capturing cinematic slow-motion shots of Tokyo's rain-soaked streets. Gear breakdown included in the description.",
          category: "Vlogs",
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          thumbnailUrl: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80"
        }
      ];

      for (const video of seedVideos) {
        await db.addVideo(video);
      }
      console.log('Successfully seeded database with 4 beautiful portfolio items!');
    }
  } catch (err) {
    console.error('Error seeding initial videos:', err);
  }
}

// Start Server
async function startServer() {
  try {
    await db.connectDB();
    await seedInitialVideosIfNeeded();
    botService.initBot();
    
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 NexaGen Full-Stack Server Running on Port ${PORT}`);
      console.log(`📂 Watermark served at: http://localhost:${PORT}/public/watermark.svg`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Fatal: Server failed to start:', err);
    process.exit(1);
  }
}

startServer();
