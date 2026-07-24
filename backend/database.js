const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;

let dbMode = 'file'; // 'mongodb' or 'file'
const jsonDbPath = path.resolve(__dirname, 'database.json');

// MongoDB Schemas
const MongoVideoSchema = new mongoose.Schema({
  title: String,
  description: String,
  category: String,
  videoUrl: String,
  thumbnailUrl: String,
  createdAt: { type: Date, default: Date.now }
});

const MongoSocialLinkSchema = new mongoose.Schema({
  platform: { type: String, unique: true },
  url: String
});

const MongoStatsSchema = new mongoose.Schema({
  totalVideos: { type: Number, default: 0 },
  followersCount: { type: Object, default: {} }
});

let MongoVideo, MongoSocialLink, MongoStats;
try {
  MongoVideo = mongoose.model('Video', MongoVideoSchema);
  MongoSocialLink = mongoose.model('SocialLink', MongoSocialLinkSchema);
  MongoStats = mongoose.model('Stats', MongoStatsSchema);
} catch (e) {
  // Model might already be registered
}

// Initial default seeds
const defaultSocialLinks = {
  youtube: 'https://youtube.com/@creative_mind',
  instagram: 'https://instagram.com/creative_mind',
  telegram_bot: 'https://t.me/nexagen_portfolio_bot',
  tiktok: 'https://tiktok.com/@creative_mind'
};

const defaultStats = {
  totalVideos: 0,
  followersCount: {
    youtube: '15.4K',
    instagram: '42.1K',
    telegram: '8.5K',
    tiktok: '108K'
  }
};

// ==========================================
// LOCAL JSON DATABASE CORE ENGINE (Asynchronous)
// ==========================================
async function loadJsonDb() {
  try {
    const data = await fs.readFile(jsonDbPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    // If file doesn't exist, return empty initial state
    const initialDb = {
      videos: [],
      social_links: { ...defaultSocialLinks },
      stats: { ...defaultStats }
    };
    await saveJsonDb(initialDb);
    return initialDb;
  }
}

async function saveJsonDb(data) {
  await fs.writeFile(jsonDbPath, JSON.stringify(data, null, 2), 'utf8');
}

// ==========================================
// DB CONNECTION ESTABLISHMENT
// ==========================================
async function connectDB() {
  const mongoUri = process.env.MONGO_URI;
  if (mongoUri) {
    console.log('MONGO_URI detected. Attempting to connect to MongoDB Atlas...');
    try {
      await mongoose.connect(mongoUri);
      dbMode = 'mongodb';
      console.log('Successfully connected to MongoDB Atlas!');
      await seedMongoDefaults();
      return;
    } catch (err) {
      console.error('MongoDB Atlas connection failed. Falling back to local file-based DB.', err.message);
    }
  }

  // Pure-JS local file database
  dbMode = 'file';
  console.log(`Using resilient local JSON database at: ${jsonDbPath}`);
  // Initialize file
  await loadJsonDb();
}

async function seedMongoDefaults() {
  try {
    const linkCount = await MongoSocialLink.countDocuments();
    if (linkCount === 0) {
      const formatted = Object.keys(defaultSocialLinks).map(platform => ({
        platform,
        url: defaultSocialLinks[platform]
      }));
      await MongoSocialLink.insertMany(formatted);
      console.log('Seed: MongoDB default social links created.');
    }
    const statsCount = await MongoStats.countDocuments();
    if (statsCount === 0) {
      await MongoStats.create(defaultStats);
      console.log('Seed: MongoDB default stats created.');
    }
  } catch (err) {
    console.error('Error seeding MongoDB defaults:', err);
  }
}

// ==========================================
// DB OPERATIONS LAYER
// ==========================================

async function getVideos(category = null) {
  if (dbMode === 'mongodb') {
    const filter = category ? { category: { $regex: new RegExp(`^${category}$`, 'i') } } : {};
    const videos = await MongoVideo.find(filter).sort({ createdAt: -1 });
    return videos.map(v => ({
      id: v._id.toString(),
      title: v.title,
      description: v.description,
      category: v.category,
      videoUrl: v.videoUrl,
      thumbnailUrl: v.thumbnailUrl,
      createdAt: v.createdAt
    }));
  } else {
    const db = await loadJsonDb();
    let videos = db.videos;
    if (category && category.toLowerCase() !== 'all') {
      videos = videos.filter(v => v.category.toLowerCase() === category.toLowerCase());
    }
    // Return sorted newest first
    return [...videos].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

async function addVideo(videoData) {
  // videoData: { title, description, category, videoUrl, thumbnailUrl }
  if (dbMode === 'mongodb') {
    const newVideo = new MongoVideo(videoData);
    await newVideo.save();
    await updateStatsVideoCount();
    return {
      id: newVideo._id.toString(),
      ...videoData,
      createdAt: newVideo.createdAt
    };
  } else {
    const db = await loadJsonDb();
    const newVideo = {
      id: Date.now().toString(),
      ...videoData,
      createdAt: new Date().toISOString()
    };
    db.videos.push(newVideo);
    await saveJsonDb(db);
    await updateStatsVideoCount();
    return newVideo;
  }
}

async function deleteVideo(id) {
  if (dbMode === 'mongodb') {
    const result = await MongoVideo.findByIdAndDelete(id);
    await updateStatsVideoCount();
    return !!result;
  } else {
    const db = await loadJsonDb();
    const initialLength = db.videos.length;
    db.videos = db.videos.filter(v => v.id !== id);
    if (db.videos.length !== initialLength) {
      await saveJsonDb(db);
      await updateStatsVideoCount();
      return true;
    }
    return false;
  }
}

async function getSocialLinks() {
  if (dbMode === 'mongodb') {
    const links = await MongoSocialLink.find({});
    return links.reduce((acc, curr) => {
      acc[curr.platform] = curr.url;
      return acc;
    }, {});
  } else {
    const db = await loadJsonDb();
    return db.social_links;
  }
}

async function updateSocialLink(platform, url) {
  if (dbMode === 'mongodb') {
    await MongoSocialLink.findOneAndUpdate(
      { platform },
      { url },
      { upsert: true, new: true }
    );
    return { platform, url };
  } else {
    const db = await loadJsonDb();
    db.social_links[platform] = url;
    await saveJsonDb(db);
    return { platform, url };
  }
}

async function getStats() {
  if (dbMode === 'mongodb') {
    let stats = await MongoStats.findOne({});
    if (!stats) {
      stats = await MongoStats.create(defaultStats);
    }
    return {
      totalVideos: stats.totalVideos,
      followersCount: stats.followersCount
    };
  } else {
    const db = await loadJsonDb();
    return db.stats;
  }
}

async function updateStatsVideoCount() {
  if (dbMode === 'mongodb') {
    const videoCount = await MongoVideo.countDocuments();
    await MongoStats.findOneAndUpdate({}, { totalVideos: videoCount }, { upsert: true });
  } else {
    const db = await loadJsonDb();
    db.stats.totalVideos = db.videos.length;
    await saveJsonDb(db);
  }
}

async function updateFollowersCount(followers) {
  // followers: { youtube: '15K', instagram: '40K', ... }
  if (dbMode === 'mongodb') {
    let stats = await MongoStats.findOne({});
    if (!stats) {
      stats = new MongoStats(defaultStats);
    }
    stats.followersCount = { ...stats.followersCount, ...followers };
    await stats.save();
    return stats;
  } else {
    const db = await loadJsonDb();
    db.stats.followersCount = { ...db.stats.followersCount, ...followers };
    await saveJsonDb(db);
    return db.stats;
  }
}

module.exports = {
  connectDB,
  getVideos,
  addVideo,
  deleteVideo,
  getSocialLinks,
  updateSocialLink,
  getStats,
  updateFollowersCount
};
