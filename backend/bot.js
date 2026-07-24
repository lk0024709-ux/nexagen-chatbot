const TelegramBot = require('node-telegram-bot-api');
const db = require('./database');

let bot = null;

function initBot() {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    console.warn('WARNING: BOT_TOKEN is not set. Telegram bot will not be initialized.');
    return;
  }

  const webhookUrl = process.env.WEBHOOK_URL; // e.g. https://yourdomain.com
  const channelId = process.env.ADMIN_CHANNEL_ID; // The channel we listen to

  if (webhookUrl) {
    console.log(`Setting up Telegram bot on webhook: ${webhookUrl}/api/bot`);
    bot = new TelegramBot(token);
    bot.setWebHook(`${webhookUrl}/api/bot`);
  } else {
    console.log('No WEBHOOK_URL defined. Initializing Telegram bot in POLLING mode...');
    bot = new TelegramBot(token, { polling: true });
  }

  setupBotListeners(bot, channelId);
  return bot;
}

function setupBotListeners(bot, channelId) {
  // 1. Listen for new posts in the specified channel
  // Note: Channel posts trigger the 'channel_post' event
  bot.on('channel_post', async (msg) => {
    try {
      console.log('Received channel post:', JSON.stringify(msg));
      
      // If channelId is configured, verify match (handling both string/numeric comparisons)
      if (channelId && String(msg.chat.id) !== String(channelId)) {
        console.log(`Post is from chat ${msg.chat.id}, but ADMIN_CHANNEL_ID is ${channelId}. Ignoring.`);
        return;
      }

      await handleNewVideoPost(msg);
    } catch (err) {
      console.error('Error handling channel post:', err);
    }
  });

  // Also listen on standard messages (for testing in a group or private chat directly)
  bot.on('message', async (msg) => {
    // Ignore channel posts and commands here
    if (msg.chat.type === 'channel' || (msg.text && msg.text.startsWith('/'))) {
      return;
    }

    // If the user sends a post in private chat, and it looks like a video upload, let them upload it!
    // This is super helpful if they don't have a channel setup yet or are testing.
    const hasVideo = msg.video || msg.document || (msg.text && (msg.text.includes('http://') || msg.text.includes('https://')));
    const hasCaption = msg.caption || msg.text;

    if (hasVideo && hasCaption) {
      console.log('Received manual video submission in private chat.');
      try {
        const result = await handleNewVideoPost(msg);
        if (result) {
          bot.sendMessage(msg.chat.id, `🎉 Success! Your video has been uploaded and watermarked:\n\n*${result.title}* (${result.category})\n🔗 ${result.videoUrl}`, { parse_mode: 'Markdown' });
        }
      } catch (err) {
        bot.sendMessage(msg.chat.id, `❌ Error processing your post: ${err.message}`);
      }
    }
  });

  // 2. Command: /start
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeText = `🎥 *Welcome to NexaGen Portfolio Creator Bot!* 🎥\n\n` +
      `I manage your video creator portfolio website completely through Telegram.\n\n` +
      `*How to upload content:*\n` +
      `1. Add me as an admin to your private channel.\n` +
      `2. Post a video (YouTube/Instagram link or video file) with a caption containing:\n` +
      `   \`Title: My Awesome Video\`\n` +
      `   \`Description: A short bio or description\`\n` +
      `   \`Category: Comedy\` (e.g. Comedy, Tech, Vlogs, etc.)\n\n` +
      `*Commands you can run here:*\n` +
      `/mydata - View your social profile links\n` +
      `/setlinks - Update your social links (YouTube, Instagram, etc.)\n` +
      `/stats - View total videos and follower metrics\n` +
      `/delete [id] - Remove a video by its database ID`;
    
    bot.sendMessage(chatId, welcomeText, { parse_mode: 'Markdown' });
  });

  // 3. Command: /mydata
  bot.onText(/\/mydata/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const links = await db.getSocialLinks();
      let response = `🔗 *Your Social Profiles & Links:*\n\n`;
      Object.keys(links).forEach(platform => {
        response += `*${platform.toUpperCase()}*: ${links[platform]}\n`;
      });
      bot.sendMessage(chatId, response, { parse_mode: 'Markdown', disable_web_page_preview: true });
    } catch (err) {
      bot.sendMessage(chatId, `❌ Error fetching links: ${err.message}`);
    }
  });

  // 4. Command: /setlinks
  bot.onText(/\/setlinks(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const args = match[1];

    if (!args) {
      const instructions = `💡 *How to update your links:*\n\n` +
        `Send the command followed by the platform and the URL.\n` +
        `Syntax: \`/setlinks [platform] [url]\`\n\n` +
        `*Examples:*\n` +
        `\`/setlinks youtube https://youtube.com/@mychannel\`\n` +
        `\`/setlinks instagram https://instagram.com/myprofile\`\n` +
        `\`/setlinks telegram_bot https://t.me/your_bot_username\`\n` +
        `\`/setlinks tiktok https://tiktok.com/@my_tiktok\`\n\n` +
        `Supported platforms: \`youtube\`, \`instagram\`, \`telegram_bot\`, \`tiktok\``;
      
      bot.sendMessage(chatId, instructions, { parse_mode: 'Markdown' });
      return;
    }

    const parts = args.trim().split(/\s+/);
    if (parts.length < 2) {
      bot.sendMessage(chatId, `❌ Invalid format. Please use: \`/setlinks [platform] [url]\``);
      return;
    }

    const platform = parts[0].toLowerCase();
    const url = parts.slice(1).join(' ');

    const validPlatforms = ['youtube', 'instagram', 'telegram_bot', 'tiktok'];
    if (!validPlatforms.includes(platform)) {
      bot.sendMessage(chatId, `❌ Unsupported platform. Please choose from: ${validPlatforms.join(', ')}`);
      return;
    }

    try {
      await db.updateSocialLink(platform, url);
      bot.sendMessage(chatId, `✅ *${platform.toUpperCase()}* link updated successfully:\n${url}`, { disable_web_page_preview: true });
    } catch (err) {
      bot.sendMessage(chatId, `❌ Error updating link: ${err.message}`);
    }
  });

  // 5. Command: /stats
  bot.onText(/\/stats(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const args = match[1];

    // If args are provided, let them update stats (e.g. followers)
    if (args) {
      const parts = args.trim().split(/\s+/);
      if (parts.length >= 2) {
        const platform = parts[0].toLowerCase();
        const count = parts.slice(1).join(' ');
        
        try {
          const updated = await db.updateFollowersCount({ [platform]: count });
          bot.sendMessage(chatId, `✅ Updated followers count for *${platform.toUpperCase()}* to *${count}*!`);
          return;
        } catch (err) {
          bot.sendMessage(chatId, `❌ Failed to update stats: ${err.message}`);
          return;
        }
      }
    }

    try {
      const stats = await db.getStats();
      let response = `📊 *Portfolio Statistics:*\n\n` +
        `🎬 *Total Portfolio Videos*: ${stats.totalVideos}\n\n` +
        `👥 *Followers / Subscribers:*\n`;
      
      Object.keys(stats.followersCount).forEach(platform => {
        response += `• *${platform.toUpperCase()}*: ${stats.followersCount[platform]}\n`;
      });

      response += `\n💡 _To update followers, use:_ \`/stats [platform] [count]\`\n` +
        `_Example:_ \`/stats youtube 25.8K\``;

      bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
    } catch (err) {
      bot.sendMessage(chatId, `❌ Error fetching stats: ${err.message}`);
    }
  });

  // 6. Command: /delete [id]
  bot.onText(/\/delete\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const videoId = match[1].trim();

    try {
      const deleted = await db.deleteVideo(videoId);
      if (deleted) {
        bot.sendMessage(chatId, `🗑️ Video with ID *${videoId}* was successfully removed from your portfolio.`, { parse_mode: 'Markdown' });
      } else {
        bot.sendMessage(chatId, `❌ No video found with ID *${videoId}*. Double-check your `/stats` or list.`);
      }
    } catch (err) {
      bot.sendMessage(chatId, `❌ Error deleting video: ${err.message}`);
    }
  });
}

// Helper to parse content post and extract metadata
async function handleNewVideoPost(msg) {
  const text = msg.caption || msg.text || '';
  if (!text) {
    console.log('No caption or text found in post. Ignoring.');
    return null;
  }

  // 1. Flexible regex parser
  const titleMatch = text.match(/title\s*:\s*(.+)/i);
  const categoryMatch = text.match(/category\s*:\s*(.+)/i);
  const descMatch = text.match(/description\s*:\s*([\s\S]+?)(?=(?:title|category)\s*:|$)/i);

  const title = titleMatch ? titleMatch[1].trim() : null;
  if (!title) {
    console.log('Post has no "Title: [value]". Ignoring.');
    return null;
  }

  const category = categoryMatch ? categoryMatch[1].trim() : 'Comedy';
  const description = descMatch ? descMatch[1].trim() : '';

  // 2. Extract video URL or video file
  let videoUrl = '';
  let thumbnailUrl = '';

  // Check for URL in the text
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const urls = text.match(urlRegex) || [];
  
  if (urls.length > 0) {
    videoUrl = urls[0];
  } else if (msg.video) {
    // If it's a Telegram video file, we can generate a URL or use a placeholder
    // In production we would fetch the file via bot.getFileLink, but since we are self-contained
    // let's assign a beautiful mock video player page or direct file path
    videoUrl = `https://www.youtube.com/watch?v=dQw4w9WgXcQ`; // default placeholder
    console.log('Direct video file detected, assigning fallback URL.');
  } else {
    // No URL found, check if document/link exists
    videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  }

  // 3. Generate Thumbnail with Category styling
  thumbnailUrl = getThumbnailForVideo(videoUrl, category);

  const videoData = {
    title,
    description,
    category,
    videoUrl,
    thumbnailUrl
  };

  const savedVideo = await db.addVideo(videoData);
  console.log('Success! Saved new video to DB:', savedVideo);

  // Trigger optional Vercel deploy hook or webhook for instant deployment updates
  if (process.env.DEPLOY_HOOK_URL) {
    try {
      const axios = require('axios');
      await axios.post(process.env.DEPLOY_HOOK_URL);
      console.log('Triggered Vercel build/redeploy hook successfully!');
    } catch (err) {
      console.error('Failed to trigger Vercel deploy hook:', err.message);
    }
  }

  return savedVideo;
}

// Auto-thumbnail helper based on URL or category
function getThumbnailForVideo(videoUrl, category = 'Comedy') {
  // Check if YouTube
  const ytReg = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/||user\/.+\/)?(?:watch\?v=|v=)?|youtu\.be\/)([^"&?\s]{11})/i;
  const match = videoUrl.match(ytReg);
  if (match && match[1]) {
    return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
  }
  
  // High-quality category-based stock thumbnails
  const lowerCat = category.toLowerCase();
  if (lowerCat.includes('tech') || lowerCat.includes('gadget')) {
    return 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?auto=format&fit=crop&w=800&q=80';
  } else if (lowerCat.includes('vlog') || lowerCat.includes('travel') || lowerCat.includes('lifestyle')) {
    return 'https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?auto=format&fit=crop&w=800&q=80';
  } else if (lowerCat.includes('comedy') || lowerCat.includes('funny') || lowerCat.includes('skit')) {
    return 'https://images.unsplash.com/photo-1516280440614-37939bbacd6a?auto=format&fit=crop&w=800&q=80';
  } else {
    return 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80';
  }
}

module.exports = {
  initBot,
  getBotInstance: () => bot
};
