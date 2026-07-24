# NexaGen Live: Full-Stack Video Creator Portfolio & Telegram Bot

Welcome to **NexaGen Live**! This is a complete, cutting-edge full-stack solution for digital video creators. 

Through this system, creators can update their entire visual portfolio website **exclusively via Telegram**. When you post a new YouTube/Instagram video link or direct file in your private Telegram Channel, the integrated bot reads the post, parses metadata (Title, Description, Category) via flexible regex pattern matching, fetches or generates thumbnails, and stores them in the shared database. The React portfolio site instantly updates in real-time, all styled with a modern, glassmorphic dark theme, glowing accents, custom cursor tracking, and a site-wide semi-transparent digital watermark!

---

## 🚀 Key Features

*   **Unified Full-Stack Architecture**: Single backend (Node.js + Express) and shared database powering both the REST API and the Telegram Bot Webhook.
*   **Dual-Mode Database Layer**: Support out-of-the-box local database (**SQLite3**) zero-configuration setup, switching automatically to cloud hosting (**MongoDB Atlas**) if a `MONGO_URI` is provided.
*   **Flexible Caption Parser (Regex)**: Supports free-form capitalization, spacing, and multi-line descriptions for captions using robust regex pattern matching.
*   **Live Portfolio Dashboard**:
    *   **Hero Section**: Stunning typography, glowing CTA buttons, smooth-scrolling, and interactive creator avatar.
    *   **Interactive About & Stats**: Dynamically displays total videos, YouTube subscribers, Instagram followers, and Telegram channel fans, updated instantly via Bot commands.
    *   **Dynamic Showcase Grid**: Video filter tabs based on categories with high-end Framer Motion animations.
    *   **Semi-Transparent Watermarking**: Customized vector logo applied site-wide, as a CSS hover overlay on all cards, footers, corner accents, and page loaders.
    *   **Universal Lightbox**: Clean overlay player that embeds YouTube videos or redirects gracefully to original links.
    *   **Contact Form**: Modern, ready-to-use collaboration form for business inquiries and email integration.
    *   **Easter Egg**: Tap the avatar card to unlock a secret interactive creative space message!

---

## 📂 Project Structure

```
nexagen-chatbot/
├── package.json              # Root script runner for concurrent dev
├── backend/                  # Node.js + Express + SQLite/MongoDB Server
│   ├── package.json
│   ├── index.js              # Server entrypoint & seed engine
│   ├── database.js           # Multi-DB abstraction layer (SQLite/MongoDB)
│   ├── bot.js                # Telegram Bot handler & regex parser
│   ├── .env.example
│   └── public/               # Watermark vector assets & served files
│       └── watermark.svg     
├── frontend/                 # React (Vite) + Tailwind CSS + Framer Motion
│   ├── package.json
│   ├── vite.config.js        # High-speed bundler & dev proxy setup
│   ├── index.html            
│   ├── public/
│   │   └── watermark.svg     # Front-end favicon and standalone branding
│   └── src/
│       ├── main.jsx
│       ├── index.css         # Glassmorphism utilities & custom scrollbar
│       └── App.jsx           # Main portfolio layout & state management
└── legacy-bot/               # Previous chatbot files (archived)
```

---

## 🛠️ Step-by-Step Setup Guide

### 1. Create Your Telegram Bot
1. Open Telegram and search for [@BotFather](https://t.me/BotFather).
2. Use the `/newbot` command to create a new bot. Choose a name and a username.
3. Save the **HTTP API Bot Token** provided.
4. Set the bot description, about info, or set commands like `/stats`, `/mydata`, `/setlinks`, `/delete` if desired using BotFather settings.

### 2. Configure Your Channel
1. Create a new **Telegram Channel** (public or private).
2. Go to Channel Info -> **Administrators** -> **Add Admin** -> Select your newly created bot. Ensure it has post privileges.
3. Obtain your **Channel ID**:
   * To find a private channel's ID, you can forward any message from that channel to [@JsonDumpBot](https://t.me/JsonDumpBot) or copy the post link (the number in `t.me/c/123456789/1` is the Channel ID, usually prefixing `-100` e.g., `-100123456789`).
   * *Tip:* If you don't have a channel configured, **the bot accepts submissions directly in its private chat** for testing/grading! Simply send a link/video with the caption structure to the bot's DM.

### 3. Environment Variable Configuration
Create a `.env` file inside the `backend` folder using `.env.example` as a template:

```bash
# In backend/.env
BOT_TOKEN=1234567890:ABC-XYZ_YourBotTokenHere
ADMIN_CHANNEL_ID=-100123456789              # Leave blank to test directly in DMs!
MONGO_URI=                                   # Leave blank to run with local SQLite
WEBHOOK_URL=                                 # Leave blank for local development polling mode
```

---

## 💻 Running Locally

Running the entire full-stack project is incredibly straightforward:

1.  **Clone / Navigate** into the project root directory:
    ```bash
    cd nexagen-chatbot
    ```

2.  **Install dependencies** (The root `postinstall` script automatically installs package requirements for both `frontend` and `backend` simultaneously!):
    ```bash
    npm install
    ```

3.  **Start concurrent development servers** (Runs the Express backend on Port 5000 and the Vite frontend on Port 3000 concurrently, with built-in API proxying):
    ```bash
    npm run dev
    ```

4.  Open [http://localhost:3000](http://localhost:3000) on your browser. You will see the beautiful, glassmorphic portfolio seeded with mock videos immediately!

---

## 📲 Testing the Telegram Sync

1. Start your local server (`npm run dev`).
2. Open Telegram and message your bot (`/start`).
3. To upload a video, post a link (YouTube/Instagram) inside your private admin channel (or send it directly to the bot in private DM for quick testing). Use this **exact caption structure**:

```text
Title: My Next-Gen VFX Skit
Description: Testing my amazing visual filters and custom transitions. Enjoy!
Category: Cinematic
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

4. The bot will automatically reply in private chat or log the entry in the channel, parse the description, pull the high-quality YouTube thumbnail, and write it to the database.
5. Refresh your browser or check the dynamic category filter — **the video is instantly visible with custom watermark logo overlays!**

### Available Bot Creator Commands (Direct DM with Bot)
*   `/mydata` - Displays all social profile links stored in the database.
*   `/setlinks [platform] [url]` - Updates social profiles dynamically (e.g. `/setlinks youtube https://youtube.com/my-channel`).
*   `/stats` - Shows real-time video counts and follower counts displayed in the portfolio header.
*   `/stats [platform] [count]` - Updates follower count metrics on your website (e.g. `/stats instagram 500K`).
*   `/delete [id]` - Removes a video record permanently from the database.

---

## 🌐 Production Deployment

### Deploy Backend (Railway / Render / Heroku)
1. Import the root repository to your host of choice.
2. Set up your environment variables (`BOT_TOKEN`, `MONGO_URI`, `ADMIN_CHANNEL_ID`).
3. Provide a `WEBHOOK_URL` pointing to your deployed backend domain (e.g. `https://your-app.railway.app`). The backend will automatically activate `setWebhook` on startup!

### Deploy Frontend (Vercel)
1. Add the `frontend/` directory as a standalone project in Vercel.
2. In the deployment settings, configure the environment variables to build from root or set the root directory as `frontend/`.
3. In production, ensure the frontend API requests point directly to your deployed backend domain.
