import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Tv, 
  Users, 
  Send, 
  Instagram, 
  Youtube, 
  ArrowUp, 
  Mail, 
  MessageSquare, 
  Filter, 
  X, 
  CheckCircle,
  Video,
  ExternalLink,
  Sparkles
} from 'lucide-react';

// ==========================================
// REUSABLE WATERMARK COMPONENT
// ==========================================
const Watermark = ({ className = "opacity-30", size = "normal" }) => {
  const width = size === "small" ? "120" : size === "large" ? "250" : "180";
  const height = size === "small" ? "36" : size === "large" ? "75" : "54";
  
  return (
    <div className={`select-none pointer-events-none flex items-center gap-2 ${className}`}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width={width} height={height}>
        <defs>
          <linearGradient id="watermarkNeon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#00f2fe" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="#9d4edd" stop-opacity="0.9"/>
          </linearGradient>
        </defs>
        <circle cx="35" cy="30" r="15" fill="url(#watermarkNeon)" opacity="0.25"/>
        <polygon points="30,22 45,30 30,38" fill="#00f2fe"/>
        <text x="65" y="37" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="20" fill="#ffffff" letter-spacing="1">NEXAGEN</text>
        <text x="65" y="48" font-family="'Plus Jakarta Sans', sans-serif" font-weight="600" font-size="8" fill="#00f2fe" letter-spacing="2">STUDIO</text>
      </svg>
    </div>
  );
};

// ==========================================
// CUSTOM CURSOR COMPONENT
// ==========================================
const CustomCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseOver = (e) => {
      const target = e.target;
      if (
        target.tagName === 'A' || 
        target.tagName === 'BUTTON' || 
        target.closest('button') || 
        target.closest('a') ||
        target.getAttribute('role') === 'button'
      ) {
        setHovered(true);
      } else {
        setHovered(false);
      }
    };

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseover', handleMouseOver);
    window.addEventListener('resize', checkMobile);
    
    checkMobile();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  if (isMobile) return null;

  return (
    <>
      {/* Glow dot */}
      <motion.div
        className="fixed top-0 left-0 w-3 h-3 bg-neonCyan rounded-full pointer-events-none z-50 mix-blend-difference"
        animate={{
          x: position.x - 6,
          y: position.y - 6,
          scale: hovered ? 1.8 : 1,
        }}
        transition={{ type: 'spring', stiffness: 800, damping: 35, mass: 0.2 }}
      />
      {/* Outer trailing ring */}
      <motion.div
        className="fixed top-0 left-0 w-8 h-8 border border-neonCyan rounded-full pointer-events-none z-50 opacity-65"
        animate={{
          x: position.x - 16,
          y: position.y - 16,
          scale: hovered ? 1.8 : 1,
          borderColor: hovered ? '#9d4edd' : '#00f2fe',
        }}
        transition={{ type: 'spring', stiffness: 450, damping: 30, mass: 0.5 }}
      />
    </>
  );
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState([]);
  const [socialLinks, setSocialLinks] = useState({
    youtube: 'https://youtube.com',
    instagram: 'https://instagram.com',
    telegram_bot: 'https://t.me',
    tiktok: 'https://tiktok.com'
  });
  const [stats, setStats] = useState({
    totalVideos: 0,
    followersCount: {
      youtube: '15.4K',
      instagram: '42.1K',
      telegram: '8.5K',
      tiktok: '108K'
    }
  });

  const [activeCategory, setActiveCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const showcaseRef = useRef(null);

  // Fetch initial portfolio details from the Express backend API
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch videos
        const vRes = await fetch('/api/videos');
        if (vRes.ok) {
          const vData = await vRes.json();
          setVideos(vData);
          
          // Extract unique categories dynamically
          const cats = ['All', ...new Set(vData.map(v => v.category))];
          setCategories(cats);
        }

        // Fetch social links
        const sRes = await fetch('/api/social-links');
        if (sRes.ok) {
          const sData = await sRes.json();
          setSocialLinks(prev => ({ ...prev, ...sData }));
        }

        // Fetch stats
        const statRes = await fetch('/api/stats');
        if (statRes.ok) {
          const statData = await statRes.json();
          setStats(statData);
        }
      } catch (err) {
        console.error('Error fetching data from server API:', err);
      } finally {
        // Keep loader visible briefly for amazing UX transition
        setTimeout(() => {
          setLoading(false);
        }, 1500);
      }
    };

    fetchData();

    // Scroll listener for "Back to top" button
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (elementRef) => {
    elementRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Filtered videos
  const filteredVideos = activeCategory === 'All' 
    ? videos 
    : videos.filter(v => v.category.toLowerCase() === activeCategory.toLowerCase());

  return (
    <div className="relative min-h-screen bg-darkBg text-white overflow-hidden pb-10">
      <CustomCursor />

      {/* BACKGROUND GRAPHICS & BLURS */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-neonCyan opacity-[0.04] blur-[150px]" />
        <div className="absolute top-[40%] right-[-10%] w-[60%] h-[60%] rounded-full bg-neonPurple opacity-[0.05] blur-[180px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[45%] h-[45%] rounded-full bg-neonPink opacity-[0.03] blur-[160px]" />
      </div>

      {/* CORNER WATERMARKS */}
      <div className="absolute top-6 left-6 z-40 hidden md:block">
        <Watermark size="small" className="opacity-40 hover:opacity-100 transition-opacity duration-300" />
      </div>
      <div className="absolute top-6 right-6 z-40 hidden md:flex items-center gap-4">
        <span className="text-xs tracking-wider text-slate-400 font-medium">MANAGED VIA TELEGRAM</span>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      {/* ==========================================
          1. PAGE LOADER WITH WATERMARK
          ========================================== */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            className="fixed inset-0 bg-[#06070a] z-50 flex flex-col justify-center items-center"
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-6"
            >
              <Watermark size="large" className="opacity-100 mb-2" />
              <div className="relative w-48 h-[2px] bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-neonCyan to-neonPurple"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                />
              </div>
              <p className="text-xs text-slate-400 uppercase tracking-[0.25em] font-medium animate-pulse">
                Rendering Creative Space
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==========================================
          2. HERO SECTION
          ========================================== */}
      <header className="relative w-full min-h-[90vh] flex flex-col justify-center items-center px-6 md:px-12 pt-20 z-10">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Hero text */}
          <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass border-white/10 text-xs font-semibold text-neonCyan tracking-wide"
            >
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              AUTOMATICALLY SYNCED TELEGRAM PORTFOLIO
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl md:text-7xl font-black tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400"
            >
              ALEXANDER <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-neonCyan via-neonPurple to-neonPink">
                CROSS
              </span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-lg md:text-xl text-slate-300 max-w-xl font-medium leading-relaxed"
            >
              Video Creator | Comic Skits & Tech Reviews. Creating high-energy cinema, tech analysis, and hilarious skits. Supported completely via a real-time Telegram workflow.
            </motion.p>

            {/* CTAs */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
            >
              <button 
                onClick={() => scrollToSection(showcaseRef)}
                className="group relative px-8 py-4 rounded-xl font-bold text-black bg-white hover:bg-neonCyan shadow-lg hover:shadow-neon-cyan transition-all duration-300 flex items-center justify-center gap-2.5 overflow-hidden"
              >
                <Play className="w-5 h-5 fill-current" />
                Watch My Content
              </button>
              
              <a 
                href={socialLinks.telegram_bot}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 rounded-xl font-bold bg-darkCard border border-white/10 hover:border-neonPurple hover:shadow-neon-purple transition-all duration-300 flex items-center justify-center gap-2.5 glass"
              >
                <Send className="w-5 h-5 text-neonCyan animate-pulse" />
                Join My Telegram
              </a>
            </motion.div>
          </div>

          {/* Hero Avatar with Easter Egg */}
          <div className="lg:col-span-5 flex justify-center items-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="relative group cursor-pointer"
              onClick={() => {
                setShowEasterEgg(true);
                // Auto hide easter egg after 4s
                setTimeout(() => setShowEasterEgg(false), 5000);
              }}
            >
              {/* Spinning Neon Aura */}
              <div className="absolute -inset-2 bg-gradient-to-r from-neonCyan via-neonPurple to-neonPink rounded-3xl blur opacity-40 group-hover:opacity-100 transition duration-700 group-hover:duration-200 animate-pulse" />
              
              {/* Photo Box */}
              <div className="relative w-72 h-96 md:w-80 md:h-[420px] rounded-2xl overflow-hidden glass border-2 border-white/15">
                <img 
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80" 
                  alt="Alexander Cross" 
                  className="w-full h-full object-cover grayscale contrast-110 hover:grayscale-0 transition-all duration-700 ease-out scale-105 group-hover:scale-100"
                />
                
                {/* Floating Micro-Badge */}
                <div className="absolute bottom-4 left-4 right-4 glass py-3 px-4 rounded-xl flex items-center justify-between border border-white/10">
                  <div>
                    <h4 className="text-sm font-bold tracking-wide">Alexander Cross</h4>
                    <p className="text-[10px] text-neonCyan uppercase font-semibold tracking-widest">TAP FOR SECRET PORTAL</p>
                  </div>
                  <Sparkles className="w-5 h-5 text-neonPurple animate-bounce" />
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </header>

      {/* ==========================================
          EASTER EGG FLOATING NOTIFICATION
          ========================================== */}
      <AnimatePresence>
        {showEasterEgg && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            className="fixed bottom-8 right-8 z-50 max-w-sm w-full p-6 rounded-2xl glass border-2 border-neonCyan shadow-neon-cyan flex flex-col gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neonCyan/20 rounded-lg text-neonCyan">
                <Sparkles className="w-6 h-6 animate-spin" />
              </div>
              <h3 className="text-lg font-extrabold text-white tracking-wide">✨ SECRETS UNLOCKED!</h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed font-medium">
              "🎉 You found the Secret Portal! Thank you for reviewing NexaGen Studio. This entire portal updates live from a single Telegram channel with custom watermarks. Keep creating, the future is yours! 🚀"
            </p>
            <button 
              onClick={() => setShowEasterEgg(false)}
              className="text-xs text-neonCyan hover:text-white font-bold tracking-wider self-end mt-1 uppercase"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==========================================
          3. ABOUT ME & STATS SECTION
          ========================================== */}
      <section className="relative py-24 px-6 md:px-12 z-10 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <h2 className="text-xs font-bold text-neonPurple tracking-widest uppercase">THE CREATOR</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Crafting Digital Cinema <br/>
              <span className="text-slate-400">That Demands Attention.</span>
            </h3>
            <p className="text-slate-300 leading-relaxed font-medium">
              I am a digital native crafting highly engaging social skits, vlogs, and cinematic reels. With an immersive visual style and sharp comedic timing, my content reaches millions of feeds daily.
            </p>
            <p className="text-slate-400 text-sm leading-relaxed">
              Every piece of content you see here is uploaded instantly via a private Telegram channel. I shoot, edit, publish inside Telegram, and let NexaGen Bot handle the web hosting, optimization, and real-time custom watermarking!
            </p>
          </div>

          {/* REALTIME STATS CARD */}
          <div className="lg:col-span-7 bg-darkCard glass rounded-3xl p-8 border border-white/10 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-neonPurple opacity-[0.05] rounded-full blur-2xl" />
            
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Tv className="w-5 h-5 text-neonCyan" />
                <h4 className="font-bold tracking-wider uppercase text-sm">Real-time Creators Stats</h4>
              </div>
              <span className="text-[10px] text-neonCyan font-bold tracking-widest bg-neonCyan/10 px-2.5 py-1 rounded-full uppercase">
                Synced via Bot
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              
              {/* STAT ITEM 1 */}
              <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                <Video className="w-6 h-6 text-neonCyan mb-2" />
                <span className="text-3xl font-black tracking-tight">{stats.totalVideos || videos.length}</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">Videos</span>
              </div>

              {/* STAT ITEM 2 */}
              <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                <Youtube className="w-6 h-6 text-red-500 mb-2" />
                <span className="text-3xl font-black tracking-tight">{stats.followersCount?.youtube || '15.4K'}</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">Subscribers</span>
              </div>

              {/* STAT ITEM 3 */}
              <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                <Instagram className="w-6 h-6 text-neonPink mb-2" />
                <span className="text-3xl font-black tracking-tight">{stats.followersCount?.instagram || '42.1K'}</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">Followers</span>
              </div>

              {/* STAT ITEM 4 */}
              <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                <Send className="w-6 h-6 text-blue-400 mb-2" />
                <span className="text-3xl font-black tracking-tight">{stats.followersCount?.telegram || '8.5K'}</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">Channel Fans</span>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ==========================================
          4. CONTENT SHOWCASE (DYNAMIC GRID)
          ========================================== */}
      <section 
        ref={showcaseRef}
        className="relative py-20 px-6 md:px-12 z-10 max-w-6xl mx-auto scroll-mt-24"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-neonCyan animate-ping" />
              <h2 className="text-xs font-bold text-neonCyan tracking-widest uppercase">DYNAMIC FEED</h2>
            </div>
            <h3 className="text-3xl md:text-5xl font-black tracking-tight">PORTFOLIO REELS</h3>
          </div>

          {/* FILTER TABS */}
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-300 ${
                  activeCategory.toLowerCase() === cat.toLowerCase()
                    ? 'bg-neonCyan text-black shadow-neon-cyan'
                    : 'bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* VIDEOS DYNAMIC GRID */}
        {filteredVideos.length === 0 ? (
          <div className="w-full text-center py-20 bg-darkCard glass rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-4">
            <Video className="w-12 h-12 text-slate-500 animate-pulse" />
            <p className="text-lg text-slate-400 font-medium">No videos found under this category.</p>
            <p className="text-sm text-slate-500 max-w-sm">Post a video in your Telegram channel with the correct Category caption to see it appear here instantly!</p>
          </div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            <AnimatePresence mode="popLayout">
              {filteredVideos.map((video) => (
                <motion.div
                  key={video.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  className="group bg-darkCard rounded-2xl overflow-hidden border border-white/10 hover:border-neonCyan transition-all duration-300 shadow-lg relative flex flex-col"
                >
                  {/* Thumbnail Wrapper */}
                  <div className="relative aspect-video w-full overflow-hidden bg-black cursor-pointer" onClick={() => setSelectedVideo(video)}>
                    <img 
                      src={video.thumbnailUrl} 
                      alt={video.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Dark gradient mask on thumbnail */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

                    {/* CORE WATERMARK OVERLAY (SEMI-TRANSPARENT CSS) */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40">
                      <div className="glass px-6 py-4 rounded-2xl flex flex-col items-center gap-2 border border-white/10 scale-90 group-hover:scale-100 transition-transform duration-300">
                        <Watermark size="small" className="opacity-95" />
                        <div className="flex items-center gap-1.5 text-xs text-neonCyan font-bold tracking-widest uppercase mt-1">
                          <Play className="w-3 h-3 fill-current" />
                          CLICK TO PLAY
                        </div>
                      </div>
                    </div>

                    {/* CORNER FLOATING WATERMARK (ALWAYS VISIBLE, SEMI-TRANSPARENT CSS) */}
                    <div className="absolute bottom-3 right-3 glass py-1.5 px-3 rounded-lg border border-white/10 opacity-70 group-hover:opacity-100 transition-opacity">
                      <Watermark size="small" className="opacity-80" />
                    </div>

                    {/* CATEGORY BADGE */}
                    <span className="absolute top-3 left-3 bg-neonPurple text-white text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-md">
                      {video.category}
                    </span>
                  </div>

                  {/* Video Meta Info */}
                  <div className="p-6 flex-grow flex flex-col justify-between">
                    <div>
                      <h4 className="text-xl font-bold tracking-tight text-white mb-2 group-hover:text-neonCyan transition-colors line-clamp-1">
                        {video.title}
                      </h4>
                      <p className="text-slate-300 text-sm font-medium leading-relaxed mb-4 line-clamp-2">
                        {video.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto">
                      <span className="text-xs text-slate-500 font-semibold uppercase">
                        {new Date(video.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <button 
                        onClick={() => setSelectedVideo(video)}
                        className="text-xs text-neonCyan hover:text-white font-bold flex items-center gap-1.5 transition-colors uppercase tracking-wider"
                      >
                        Launch Player
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      {/* ==========================================
          5. DYNAMIC VIDEO MODAL / LIGHTBOX
          ========================================== */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md"
            onClick={() => setSelectedVideo(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0e0f14] border border-white/10 w-full max-w-4xl rounded-2xl overflow-hidden relative shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={() => setSelectedVideo(null)}
                className="absolute top-4 right-4 bg-black/60 hover:bg-neonPink border border-white/10 text-white rounded-xl p-2.5 z-10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Video Player Shell */}
              <div className="relative aspect-video bg-black flex items-center justify-center">
                
                {/* Embed video or fallback to watermarked screen with dynamic mock player */}
                {selectedVideo.videoUrl.includes('youtube.com') || selectedVideo.videoUrl.includes('youtu.be') ? (
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${
                      selectedVideo.videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^"&?\s]{11})/)?.[1] || ''
                    }?autoplay=1`}
                    title={selectedVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="text-center p-8 flex flex-col items-center justify-center gap-4 w-full h-full relative">
                    <img 
                      src={selectedVideo.thumbnailUrl} 
                      alt="Thumbnail fallback" 
                      className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm pointer-events-none"
                    />
                    
                    {/* Semi-transparent center watermark */}
                    <div className="relative z-10 p-6 glass rounded-2xl border border-white/10 mb-2">
                      <Watermark size="large" className="opacity-95" />
                    </div>

                    <div className="relative z-10 max-w-md">
                      <p className="text-sm text-slate-300 font-semibold uppercase tracking-wider mb-2">Redirection Player</p>
                      <h4 className="text-xl font-bold mb-4">{selectedVideo.title}</h4>
                      <a 
                        href={selectedVideo.videoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2.5 px-6 py-3 bg-neonCyan hover:bg-white text-black font-extrabold rounded-xl transition-all shadow-neon-cyan hover:shadow-none"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        Watch on Original Platform
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Metadata */}
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-neonPurple/20 text-neonPurple text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-md">
                    {selectedVideo.category}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    Posted on {new Date(selectedVideo.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <h3 className="text-2xl font-extrabold tracking-tight text-white mb-3">
                  {selectedVideo.title}
                </h3>
                <p className="text-slate-300 leading-relaxed text-sm font-medium">
                  {selectedVideo.description || 'No description provided.'}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==========================================
          6. SOCIAL LINKS & TELEGRAM BOT CALL-TO-ACTION
          ========================================== */}
      <section className="relative py-20 px-6 md:px-12 z-10 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Telegram Prominent Card */}
          <div className="lg:col-span-7 bg-gradient-to-br from-[#10192e] to-[#070b13] glass-premium rounded-3xl p-8 md:p-10 border border-neonCyan/30 hover:border-neonCyan transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-48 h-48 bg-neonCyan opacity-[0.06] rounded-full blur-3xl pointer-events-none" />
            
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neonCyan/10 text-xs font-bold text-neonCyan tracking-wider uppercase mb-6">
                <MessageSquare className="w-3.5 h-3.5 text-neonCyan" />
                Interact & Suggest Ideas
              </div>

              <h3 className="text-3xl md:text-4xl font-black tracking-tight leading-none mb-4">
                THE NEXAGEN <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neonCyan to-neonPurple">TELEGRAM BOT</span>
              </h3>

              <p className="text-slate-300 text-sm md:text-base leading-relaxed font-medium max-w-lg mb-8">
                Join our integrated Telegram Community. Fans can check current statistics, request business collaborations, receive automatic alerts for newly released videos, and talk directly with Alexander!
              </p>
            </div>

            <a 
              href={socialLinks.telegram_bot} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 bg-neonCyan hover:bg-white text-black font-extrabold rounded-xl transition-all shadow-neon-cyan hover:shadow-none uppercase tracking-wider text-sm mt-auto"
            >
              <Send className="w-5 h-5 fill-current" />
              Launch Portfolio Bot
            </a>
          </div>

          {/* Other social cards */}
          <div className="lg:col-span-5 grid grid-rows-3 gap-6">
            
            {/* YouTube Social Link Card */}
            <a 
              href={socialLinks.youtube} 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-darkCard glass hover:bg-red-950/10 hover:border-red-500 rounded-2xl p-6 border border-white/5 flex items-center justify-between transition-all duration-300 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                  <Youtube className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base">YouTube Channel</h4>
                  <p className="text-xs text-slate-400">Subscribe for long-form cinematics</p>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
            </a>

            {/* Instagram Social Link Card */}
            <a 
              href={socialLinks.instagram} 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-darkCard glass hover:bg-pink-950/10 hover:border-neonPink rounded-2xl p-6 border border-white/5 flex items-center justify-between transition-all duration-300 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-neonPink/10 flex items-center justify-center text-neonPink group-hover:scale-110 transition-transform">
                  <Instagram className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base">Instagram Reels</h4>
                  <p className="text-xs text-slate-400">Daily micro-skits and content vlogs</p>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
            </a>

            {/* TikTok Social Link Card */}
            <a 
              href={socialLinks.tiktok} 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-darkCard glass hover:bg-slate-900/40 hover:border-teal-400 rounded-2xl p-6 border border-white/5 flex items-center justify-between transition-all duration-300 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-teal-400/10 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
                  <Video className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base">TikTok Profile</h4>
                  <p className="text-xs text-slate-400">Trending challenges and high-energy hooks</p>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
            </a>

          </div>

        </div>
      </section>

      {/* ==========================================
          7. BRAND COLLABS & CONTACT FORM
          ========================================== */}
      <section className="relative py-20 px-6 md:px-12 z-10 max-w-4xl mx-auto">
        <div className="bg-darkCard glass rounded-3xl p-8 md:p-12 border border-white/10 shadow-2xl">
          
          <div className="text-center max-w-xl mx-auto mb-10">
            <h3 className="text-xs font-bold text-neonPurple tracking-widest uppercase mb-2">LET'S BUILD SOMETHING</h3>
            <h4 className="text-3xl font-black tracking-tight mb-4">BRAND COLLABORATIONS</h4>
            <p className="text-slate-300 text-sm font-medium">
              Want to sponsor a video or request commercial editing? Fill in the secure form below. Our response team will reach out within 24 hours.
            </p>
          </div>

          {contactSuccess ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10 flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 mb-2 border border-emerald-500/25">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h4 className="text-2xl font-bold">Inquiry Sent Successfully!</h4>
              <p className="text-sm text-slate-400 max-w-sm">Thank you for reaching out. We have received your sponsorship details and will connect via email shortly.</p>
              <button 
                onClick={() => setContactSuccess(false)}
                className="text-xs text-neonCyan hover:underline font-bold mt-2 uppercase tracking-widest"
              >
                Send another message
              </button>
            </motion.div>
          ) : (
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                setContactSuccess(true);
              }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Your Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Enter your name"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-neonCyan transition-all"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Business Email</label>
                  <input 
                    type="email" 
                    required 
                    placeholder="name@company.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-neonCyan transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Subject</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Sponsorship / Editing Service / Direct Hire"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-neonCyan transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Sponsorship Details</label>
                <textarea 
                  required 
                  rows="4" 
                  placeholder="Describe your brand goals, target timeline, and budget overview..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-neonCyan transition-all resize-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-4 rounded-xl bg-gradient-to-r from-neonCyan to-neonPurple text-black font-extrabold text-sm uppercase tracking-wider hover:opacity-90 shadow-lg hover:shadow-neon-cyan transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4 fill-current" />
                Submit Collaboration Details
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center">
            <span className="text-xs text-slate-400 font-medium">Prefer direct email?</span>
            <a 
              href="mailto:collabs@alexandercross.com"
              className="text-sm text-neonCyan font-bold flex items-center gap-1.5 hover:underline"
            >
              collabs@alexandercross.com
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

        </div>
      </section>

      {/* ==========================================
          8. FOOTER
          ========================================== */}
      <footer className="relative pt-16 pb-8 px-6 md:px-12 border-t border-white/5 z-10 max-w-6xl mx-auto flex flex-col gap-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Footer Logo */}
          <div className="flex flex-col items-center md:items-start gap-1">
            <Watermark size="normal" className="opacity-100" />
            <span className="text-[10px] text-slate-500 tracking-wider uppercase pl-2 font-bold">Video Creator Ecosystem</span>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-4">
            <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 border border-white/5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all">
              <Youtube className="w-5 h-5" />
            </a>
            <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 border border-white/5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all">
              <Instagram className="w-5 h-5" />
            </a>
            <a href={socialLinks.telegram_bot} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 border border-white/5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all">
              <Send className="w-5 h-5" />
            </a>
          </div>

        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 pt-8 text-center sm:text-left">
          <p className="text-xs text-slate-500 font-semibold tracking-wide">
            &copy; {new Date().getFullYear()} NexaGen Studio. All rights reserved. Live synced with Telegram Bot.
          </p>

          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 text-xs font-black text-neonCyan uppercase tracking-widest hover:text-white transition-colors"
          >
            Back to top
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* Quick floating scroll indicator */}
      {showScrollTop && (
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 bg-darkCard border border-white/10 text-white rounded-xl p-3.5 shadow-xl glass hover:border-neonCyan transition-all hover:scale-105 active:scale-95"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
