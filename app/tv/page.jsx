"use client";

import { useEffect, useState, useRef, useCallback } from "react";

// Semua request ke API lewat proxy /api/tv untuk bypass CORS
// HLS segment juga lewat proxy, dengan xhrSetup menambah header x-api-key
const PROXY    = "/api/tv";
const BASE_EXT = "https://api.nexoratv.qzz.io/api"; // hanya untuk shaka DASH

// Buat URL proxy: /api/tv?path=/v1/channels&category=nasional
const p = (path) => {
  if (!path) return '';
  // Jika path sudah mengandung http, jangan ditambah PROXY lagi
  if (path.startsWith('http')) return path;
  
  // Pastikan path diawali dengan satu garis miring
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Gunakan URLSearchParams agar aman
  return `${PROXY}?path=${encodeURIComponent(cleanPath)}`;
};

const CATEGORIES = ["Semua", "nasional", "berita", "olahraga", "anak", "religi", "hiburan"];
const CAT_LABELS = {
  Semua:"🌐 Semua", nasional:"📺 Nasional", berita:"📰 Berita",
  olahraga:"⚽ Olahraga", anak:"🧒 Anak", religi:"🕌 Religi", hiburan:"🎬 Hiburan",
};

export default function TVPage() {
  const [channels, setChannels]           = useState([]);
  const [filtered, setFiltered]           = useState([]);
  const [category, setCategory]           = useState("Semua");
  const [search, setSearch]               = useState("");
  const [loading, setLoading]             = useState(true);
  const [activeChannel, setActiveChannel] = useState(null);
  const [epg, setEpg]                     = useState(null);
  const [epgLoading, setEpgLoading]       = useState(false);
  const [playerError, setPlayerError]     = useState(false);
  const [playerMsg, setPlayerMsg]         = useState("");
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const videoRef    = useRef(null);
  const hlsRef      = useRef(null);
  const didAutoPlay = useRef(false);

  // ── Load channels ─────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = category !== "Semua" ? { category } : {};
        const res    = await fetch(p("/v1/channels", params));
        const json   = await res.json();
        setChannels(json.data || []);
      } catch (e) { console.error("channels:", e); }
      finally { setLoading(false); }
    };
    load();
  }, [category]);

  // ── Filter search ─────────────────────────────────────────────
  useEffect(() => {
    setFiltered(!search.trim() ? channels
      : channels.filter((ch) => ch.name.toLowerCase().includes(search.toLowerCase()))
    );
  }, [search, channels]);

  // ── Load EPG ──────────────────────────────────────────────────
  const loadEpg = useCallback(async (channel) => {
    setEpgLoading(true); setEpg(null);
    for (const id of [channel.slug, channel.id].filter(Boolean)) {
      try {
        const res  = await fetch(p(`/v1/epg/${id}`));
        if (!res.ok) continue;
        const json = await res.json();
        const rows = json.data || (Array.isArray(json) ? json : null);
        if (rows?.length) { setEpg(rows); setEpgLoading(false); return; }
      } catch {}
    }
    setEpgLoading(false);
  }, []);

  // ── Destroy HLS ───────────────────────────────────────────────
  const destroyHls = () => {
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
  };

  // ── Play channel ──────────────────────────────────────────────
  const playChannel = useCallback(async (channel) => {
    setActiveChannel(channel);
    setPlayerError(false);
    setPlayerMsg("");
    setEpg(null);
    loadEpg(channel);
    destroyHls();

    const streams     = channel.streams || [];
    const hlsStream   = streams.find((s) => s.stream_type === "hls");
    const dashStream  = streams.find((s) => s.stream_type === "dash");
    const embedStream = streams.find((s) => s.stream_type === "embed");
    const video       = videoRef.current;

    const showError = (msg) => { setPlayerError(true); setPlayerMsg(msg || ""); };

    // ── HLS (prioritas utama) ──────────────────────────────────
    if (hlsStream) {
      if (!video) return;
      // URL HLS lewat proxy — proxy forward ke BASE + stream_url dengan API key
      const proxyUrl = p(hlsStream.stream_url);

      if (typeof window === "undefined") return;
      const Hls = (await import("hls.js")).default;

      if (Hls.isSupported()) {
        const hls = new Hls({
          xhrSetup: (xhr, url) => {
            // Jika URL mengandung domain asli Zentara, belokkan ke proxy kita
            if (url.includes("nexoratv.qzz.io")) {
              const u = new URL(url);
              // Ambil path setelah '/api'
              const internalPath = u.pathname.replace("/api", "");
              const proxied = p(internalPath, Object.fromEntries(u.searchParams));
              xhr.open("GET", proxied, true);
            }
            // Kita tidak butuh setRequestHeader 'x-api-key' di sini 
            // karena API Key sudah disuntikkan oleh server (Route Handler) kita.
          },
          maxBufferLength: 30,
          enableWorker: true,
          // Tambahkan ini untuk stabilitas retry
          manifestLoadingMaxRetry: 4,
          levelLoadingMaxRetry: 4,
        });
      
        hls.loadSource(proxyUrl);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {
            // Autoplay blocker biasanya mematikan suara (mute) agar bisa play
            video.muted = true;
            video.play();
          });
        });
      
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            console.error("HLS fatal error:", data.type);
            // Jika error 444 atau 401 tetap terjadi, coba fallback ke DASH
            if (dashStream) {
              destroyHls();
              playDash(dashStream, video, showError);
            } else {
              showError("Gagal memuat stream (Error: " + data.details + ")");
            }
          }
        });
        hlsRef.current = hls;
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari native HLS
        video.src = proxyUrl;
        video.play().catch(() => {});
      } else {
        showError("Browser tidak mendukung HLS");
      }

    // ── DASH ──────────────────────────────────────────────────
    } else if (dashStream) {
      if (!video) return;
      playDash(dashStream, video, showError);

    // ── Embed ─────────────────────────────────────────────────
    } else if (embedStream) {
      // Ditangani iframe di JSX

    } else {
      showError("Tidak ada stream untuk channel ini");
    }
  }, [loadEpg]);

  const playDash = async (dashStream, video, showError) => {
    const API_KEY = 'ztatv_YOUR_KEY'; // Ganti dengan key kamu
    const BASE_URL = 'https://api.nexoratv.qzz.io/api';
  
    try {
      // 1. Fetch info manifest (butuh API KEY)
      const res = await fetch(p(dashStream.stream_url), {
        headers: { 'x-api-key': API_KEY }
      });
      const info = await res.json();
      
      // URL manifest lengkap dari response API
      const fullManifestUrl = BASE_URL + info.stream_url;
      // Base directory untuk segmen (misal: https://.../dash/)
      const baseDir = fullManifestUrl.substring(0, fullManifestUrl.lastIndexOf('/') + 1);
  
      const shaka = (await import("shaka-player")).default;
      shaka.polyfill.installAll();
  
      const player = new shaka.Player();
      await player.attach(video);
  
      // 2. NETWORK FILTER (Paling Krusial)
      player.getNetworkingEngine().registerRequestFilter((type, request) => {
        // Tambahkan API Key ke SEMUA request (Manifest & Segmen)
        request.headers['x-api-key'] = API_KEY;
  
        let uri = request.uris[0];
  
        // Fix URL jika Shaka mencoba akses relatif atau salah domain karena proxy
        if (!uri.startsWith('http')) {
          // Jika relatif (misal: index.mp4), gabungkan dengan baseDir asli
          request.uris[0] = p(baseDir + uri);
        } else if (uri.includes(window.location.hostname) && !uri.includes('path=')) {
          // Jika mengarah ke domain sendiri secara tidak sengaja
          const pathOnly = new URL(uri).pathname; 
          request.uris[0] = p(BASE_URL + pathOnly);
        } else if (uri.startsWith(BASE_URL) && !uri.includes('api/tv?path=')) {
          // Jika mengarah ke API asli tapi belum lewat proxy kamu
          request.uris[0] = p(uri);
        }
      });
  
      // 3. DRM Setup (ClearKey)
      if (info.drm_key) {
        const [kid, key] = info.drm_key.split(':');
        player.configure({
          drm: {
            clearKeys: { [kid]: key }
          }
        });
      }
  
      // 4. Konfigurasi Tambahan
      player.configure({
        streaming: {
          jumpLargeGaps: true,
        }
      });
  
      // 5. Load Manifest
      await player.load(p(fullManifestUrl));
      
      video.play().catch(() => {
        video.muted = true;
        video.play();
      });
  
    } catch (e) {
      console.error("Shaka Error:", e);
      showError("Gagal memutar stream DASH: " + e.message);
    }
  };

  // Auto-play channel pertama
  useEffect(() => {
    if (filtered.length > 0 && !didAutoPlay.current) {
      didAutoPlay.current = true;
      playChannel(filtered[0]);
    }
  }, [filtered, playChannel]);

  const embedStream = activeChannel?.streams?.find((s) => s.stream_type === "embed");
  const hlsStream   = activeChannel?.streams?.find((s) => s.stream_type === "hls");
  const isEmbed     = !!embedStream && !hlsStream;

  return (
    <div style={s.root}>
      {/* NAV */}
      <nav style={s.nav}>
        <div style={s.navLeft}>
          <a href="/" style={s.navLogo}><span style={{ color:"#e50914" }}>●</span> NONTON</a>
          <a href="/" style={s.navLink}>Drama</a>
          <a href="/tv" style={{ ...s.navLink, color:"#fff", borderBottom:"2px solid #e50914", paddingBottom:2 }}>📺 Live TV</a>
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari channel..." style={s.searchInput} />
      </nav>

      {/* CATEGORY BAR */}
      <div style={s.catBar}>
        {CATEGORIES.map((c) => (
          <button key={c}
            onClick={() => { setCategory(c); didAutoPlay.current = false; setActiveChannel(null); }}
            style={{ ...s.catBtn, background: category===c ? "#e50914":"#1a1a1a", border: category===c ? "none":"1px solid #333" }}>
            {CAT_LABELS[c]}
          </button>
        ))}
      </div>

      {/* LAYOUT */}
      <div style={s.layout}>

        {/* SIDEBAR */}
        <aside style={{ ...s.sidebar, width: sidebarOpen?260:0, minWidth: sidebarOpen?260:0 }}>
          <div style={s.sidebarInner}>
            <div style={s.sidebarHeader}>
              <span style={{ fontSize:13, color:"#888" }}>{filtered.length} Channel</span>
            </div>
            {loading
              ? Array.from({length:12}).map((_,i) => (
                  <div key={i} style={s.skeletonItem}>
                    <div style={s.skeletonThumb}/><div style={s.skeletonText}/>
                  </div>
                ))
              : filtered.map((ch) => {
                  const isActive = activeChannel?.id === ch.id;
                  return (
                    <div key={ch.id||ch.slug} onClick={() => playChannel(ch)}
                      style={{ ...s.channelItem, background: isActive?"#1e0000":"transparent", borderLeft: isActive?"3px solid #e50914":"3px solid transparent" }}>
                      {ch.logo
                        ? <img src={ch.logo} alt={ch.name} style={s.channelLogo} onError={(e)=>(e.target.style.display="none")}/>
                        : <div style={s.channelLogoFallback}>📺</div>}
                      <div style={s.channelInfo}>
                        <div style={s.channelName}>{ch.name}</div>
                        <div style={s.channelCat}>{ch.category||""}</div>
                      </div>
                      {isActive && <span style={s.liveBadge}>LIVE</span>}
                    </div>
                  );
                })
            }
          </div>
        </aside>

        {/* PLAYER */}
        <main style={s.playerArea}>
          <button onClick={() => setSidebarOpen(v=>!v)} style={s.toggleBtn}>
            {sidebarOpen?"◀":"▶"}
          </button>

          {activeChannel ? (
            <>
              <div style={s.channelHeader}>
                {activeChannel.logo && (
                  <img src={activeChannel.logo} alt={activeChannel.name} style={s.headerLogo}
                    onError={(e)=>(e.target.style.display="none")}/>
                )}
                <div>
                  <h2 style={s.channelTitle}>{activeChannel.name}</h2>
                  <span style={s.liveTag}>🔴 LIVE</span>
                  {activeChannel.category && <span style={s.categoryTag}>{activeChannel.category}</span>}
                </div>
              </div>

              <div style={s.videoWrap}>
                {isEmbed
                  ? <iframe src={embedStream.embed_url} style={s.iframe} allowFullScreen allow="autoplay;encrypted-media"/>
                  : playerError
                    ? <div style={s.errorBox}>
                        <div style={{fontSize:48}}>📡</div>
                        <p style={{color:"#fff",marginTop:12}}>Stream tidak tersedia</p>
                        {playerMsg && <p style={{color:"#666",fontSize:13,marginTop:6,textAlign:"center",maxWidth:300}}>{playerMsg}</p>}
                        <div style={{display:"flex",gap:10,marginTop:16}}>
                          <button onClick={()=>playChannel(activeChannel)} style={s.retryBtn}>🔄 Coba Lagi</button>
                          <button onClick={()=>{
                            const idx = filtered.findIndex(c=>c.id===activeChannel.id);
                            const next = filtered[idx+1]||filtered[idx-1];
                            if(next) playChannel(next);
                          }} style={s.nextBtn}>⏭ Channel Lain</button>
                        </div>
                      </div>
                    : <video ref={videoRef} controls autoPlay playsInline style={s.video}
                        onError={()=>{setPlayerError(true);setPlayerMsg("Video gagal dimuat");}}/>
                }
              </div>

              {/* EPG */}
              <div style={s.epgSection}>
                <h3 style={s.epgTitle}>📅 Jadwal Tayang Hari Ini</h3>
                {epgLoading
                  ? <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {Array.from({length:5}).map((_,i)=>(
                        <div key={i} style={{display:"flex",gap:12,alignItems:"center"}}>
                          <div style={{width:50,height:14,borderRadius:4,background:"#1a1a1a"}}/>
                          <div style={{flex:1,height:14,borderRadius:4,background:"#1a1a1a"}}/>
                        </div>
                      ))}
                    </div>
                  : epg?.length
                    ? <div style={s.epgList}>
                        {epg.map((item,i)=>{
                          const isNow = item.is_now||item.status==="now";
                          return (
                            <div key={i} style={{...s.epgItem, background:isNow?"#1e0000":"#0f0f0f", borderLeft:isNow?"3px solid #e50914":"3px solid transparent"}}>
                              <span style={s.epgTime}>{item.start_time||item.time||"—"}</span>
                              <span style={{...s.epgName, color:isNow?"#fff":"#888", fontWeight:isNow?600:400}}>
                                {item.title||item.name||"—"}
                              </span>
                              {isNow && <span style={s.nowBadge}>Sekarang</span>}
                            </div>
                          );
                        })}
                      </div>
                    : <p style={{color:"#444",fontSize:13}}>Jadwal tidak tersedia</p>
                }
              </div>
            </>
          ) : (
            <div style={s.empty}>
              <div style={{fontSize:64}}>📺</div>
              <p style={{color:"#555",marginTop:16}}>Pilih channel untuk mulai menonton</p>
            </div>
          )}
        </main>
      </div>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:#0a0a0a;}
        ::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:2px;}
        ::-webkit-scrollbar-thumb:hover{background:#e50914;}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>
    </div>
  );
}

const s = {
  root:{background:"#000",minHeight:"100vh",color:"#fff",fontFamily:"'Segoe UI',sans-serif",display:"flex",flexDirection:"column"},
  nav:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",height:56,background:"#000",borderBottom:"1px solid #1a1a1a",position:"sticky",top:0,zIndex:200},
  navLeft:{display:"flex",alignItems:"center",gap:24},
  navLogo:{fontSize:20,fontWeight:900,color:"#fff",textDecoration:"none",letterSpacing:2},
  navLink:{color:"#aaa",textDecoration:"none",fontSize:14,fontWeight:500},
  searchInput:{background:"#1a1a1a",border:"1px solid #333",borderRadius:8,padding:"7px 14px",color:"#fff",fontSize:14,outline:"none",width:220},
  catBar:{display:"flex",gap:8,padding:"10px 16px",overflowX:"auto",background:"#050505",borderBottom:"1px solid #111"},
  catBtn:{padding:"6px 14px",borderRadius:20,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:500,whiteSpace:"nowrap",transition:"all 0.2s"},
  layout:{display:"flex",flex:1,overflow:"hidden",height:"calc(100vh - 96px)"},
  sidebar:{background:"#0a0a0a",borderRight:"1px solid #1a1a1a",transition:"width 0.3s ease,min-width 0.3s ease",flexShrink:0,overflow:"hidden"},
  sidebarInner:{width:260,height:"100%",overflowY:"auto",display:"flex",flexDirection:"column"},
  sidebarHeader:{padding:"12px 16px",borderBottom:"1px solid #1a1a1a"},
  channelItem:{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",cursor:"pointer",transition:"background 0.15s",borderBottom:"1px solid #0f0f0f"},
  channelLogo:{width:36,height:36,objectFit:"contain",borderRadius:6,background:"#1a1a1a",flexShrink:0},
  channelLogoFallback:{width:36,height:36,background:"#1a1a1a",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0},
  channelInfo:{flex:1,minWidth:0},
  channelName:{fontSize:13,fontWeight:500,color:"#ddd",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},
  channelCat:{fontSize:11,color:"#555",marginTop:2},
  liveBadge:{background:"#e50914",color:"#fff",fontSize:9,fontWeight:700,padding:"2px 5px",borderRadius:3,letterSpacing:0.5},
  skeletonItem:{display:"flex",alignItems:"center",gap:10,padding:"10px 12px"},
  skeletonThumb:{width:36,height:36,borderRadius:6,background:"linear-gradient(90deg,#1a1a1a 25%,#2a2a2a 50%,#1a1a1a 75%)",backgroundSize:"200% 100%",animation:"shimmer 1.5s infinite",flexShrink:0},
  skeletonText:{flex:1,height:12,borderRadius:4,background:"#1a1a1a"},
  playerArea:{flex:1,display:"flex",flexDirection:"column",overflowY:"auto",position:"relative"},
  toggleBtn:{position:"absolute",left:8,top:10,zIndex:10,background:"#1a1a1a",border:"1px solid #333",color:"#fff",borderRadius:6,width:28,height:28,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"},
  channelHeader:{display:"flex",alignItems:"center",gap:12,padding:"14px 48px 12px",borderBottom:"1px solid #111",background:"#050505"},
  headerLogo:{width:44,height:44,objectFit:"contain",borderRadius:8,background:"#111"},
  channelTitle:{fontSize:18,fontWeight:700,marginBottom:4},
  liveTag:{fontSize:12,color:"#e50914",fontWeight:700,marginRight:8},
  categoryTag:{fontSize:11,color:"#888",background:"#1a1a1a",padding:"2px 8px",borderRadius:10},
  videoWrap:{width:"100%",background:"#000",aspectRatio:"16/9",maxHeight:"55vh"},
  video:{width:"100%",height:"100%",display:"block",background:"#000"},
  iframe:{width:"100%",height:"100%",border:"none"},
  errorBox:{width:"100%",height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#0a0a0a"},
  retryBtn:{background:"#e50914",color:"#fff",border:"none",padding:"8px 18px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600},
  nextBtn:{background:"#222",color:"#fff",border:"1px solid #444",padding:"8px 18px",borderRadius:8,cursor:"pointer",fontSize:13},
  epgSection:{padding:"16px 20px"},
  epgTitle:{fontSize:15,fontWeight:600,marginBottom:12},
  epgList:{display:"flex",flexDirection:"column",gap:3,maxHeight:280,overflowY:"auto"},
  epgItem:{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",borderRadius:6},
  epgTime:{fontSize:12,color:"#e50914",fontWeight:600,minWidth:50},
  epgName:{flex:1,fontSize:13},
  nowBadge:{fontSize:10,background:"#e50914",color:"#fff",padding:"2px 6px",borderRadius:4,fontWeight:700},
  empty:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"},
};
