"use client";

import { useEffect, useState, useRef, useCallback } from "react";

const KEY  = "ztatv_8ef9a9b28e724cbbd87f068510228c4fd54e3925";
const BASE = "https://api.nexoratv.qzz.io/api";

// JSON API lewat proxy (channel list, EPG, DASH info)
const proxyFetch = (path, params = {}) => {
  const qs = new URLSearchParams({ path, ...params }).toString();
  return fetch(`/api/tv?${qs}`);
};

const CATEGORIES = ["Semua", "nasional", "berita", "olahraga", "anak", "religi", "hiburan", "movies"];
const CAT_LABELS = {
  Semua:"🌐 Semua", nasional:"📺 Nasional", berita:"📰 Berita",
  olahraga:"⚽ Olahraga", anak:"🧒 Anak", religi:"🕌 Religi",
  hiburan:"🎬 Hiburan", movies:"🎥 Movies",
};

// Ambil stream terbaik berdasarkan priority (terkecil = terbaik)
const getBestStream = (streams, type) =>
  streams
    .filter(s => s.stream_type === type)
    .sort((a, b) => a.priority - b.priority)[0] || null;

export default function TVPage() {
  const [channels, setChannels]           = useState([]);
  const [filtered, setFiltered]           = useState([]);
  const [category, setCategory]           = useState("Semua");
  const [search, setSearch]               = useState("");
  const [loading, setLoading]             = useState(true);
  const [activeChannel, setActiveChannel] = useState(null);
  const [epg, setEpg]                     = useState(null);
  const [epgLoading, setEpgLoading]       = useState(false);
  const [playerState, setPlayerState]     = useState("idle"); // idle | loading | playing | error
  const [playerMsg, setPlayerMsg]         = useState("");
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const videoRef    = useRef(null);
  const hlsRef      = useRef(null);
  const shakaRef    = useRef(null);
  const didAutoPlay = useRef(false);

  // ── Load channels ─────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = category !== "Semua" ? { category } : {};
        const json   = await proxyFetch("/v1/channels", params).then(r => r.json());
        // Urutkan: channel aktif dulu, lalu berdasarkan nama
        const sorted = (json.data || []).sort((a, b) => b.is_active - a.is_active);
        setChannels(sorted);
      } catch (e) { console.error("channels:", e); }
      finally { setLoading(false); }
    };
    load();
  }, [category]);

  useEffect(() => {
    setFiltered(!search.trim() ? channels
      : channels.filter(ch => ch.name.toLowerCase().includes(search.toLowerCase()))
    );
  }, [search, channels]);

  // ── EPG ───────────────────────────────────────────────────────
  const loadEpg = useCallback(async (channel) => {
    setEpgLoading(true); setEpg(null);
    // Coba dengan slug dulu, lalu id
    for (const id of [channel.slug, channel.id].filter(Boolean)) {
      try {
        const res  = await proxyFetch(`/v1/epg/${id}`);
        if (!res.ok) continue;
        const json = await res.json();
        const rows = json.data || (Array.isArray(json) ? json : null);
        if (rows?.length) { setEpg(rows); setEpgLoading(false); return; }
      } catch {}
    }
    setEpgLoading(false);
  }, []);

  // ── Cleanup player ────────────────────────────────────────────
  const cleanupPlayer = useCallback(() => {
    if (hlsRef.current)   { hlsRef.current.destroy();  hlsRef.current  = null; }
    if (shakaRef.current) { shakaRef.current.destroy(); shakaRef.current = null; }
    if (videoRef.current) videoRef.current.src = "";
  }, []);

  // ── Play DASH stream ──────────────────────────────────────────
  const playDash = useCallback(async (streams, video, onFail) => {
    // Ambil semua DASH streams urut priority, coba satu per satu
    const dashStreams = streams
      .filter(s => s.stream_type === "dash")
      .sort((a, b) => a.priority - b.priority);

    for (const stream of dashStreams) {
      try {
        setPlayerMsg(`Mencoba ${stream.server_name}...`);

        // Fetch info manifest dari proxy (perlu x-api-key)
        const res = await proxyFetch(stream.stream_url);
        if (!res.ok) continue;

        const info = await res.json();
        if (!info?.stream_url) continue;

        const shaka = (await import("shaka-player")).default;
        shaka.polyfill.installAll();
        if (!shaka.Player.isBrowserSupported()) { onFail("Browser tidak mendukung DASH"); return; }

        // Destroy shaka lama jika ada
        if (shakaRef.current) { await shakaRef.current.destroy(); shakaRef.current = null; }

        const player = new shaka.Player(video);
        shakaRef.current = player;

        // DRM ClearKey jika ada
        if (info.drm_key) {
          const [kid, key] = info.drm_key.split(":");
          player.configure({ drm: { clearKeys: { [kid]: key } } });
        }

        let failed = false;
        player.addEventListener("error", () => { failed = true; });

        await player.load(BASE + info.stream_url);

        if (!failed) {
          video.play().catch(() => {});
          setPlayerState("playing");
          setPlayerMsg("");
          return; // sukses!
        }

        // Gagal, coba stream berikutnya
        await player.destroy(); shakaRef.current = null;
      } catch (e) {
        console.warn(`Stream ${stream.server_name} gagal:`, e.message);
      }
    }

    // Semua DASH gagal
    onFail("Semua server DASH tidak tersedia saat ini");
  }, []);

  // ── Play channel ──────────────────────────────────────────────
  const playChannel = useCallback(async (channel) => {
    setActiveChannel(channel);
    setPlayerState("loading");
    setPlayerMsg("Memuat stream...");
    loadEpg(channel);
    cleanupPlayer();

    const streams    = channel.streams || [];
    const hlsStream  = getBestStream(streams, "hls");
    const video      = videoRef.current;

    const onFail = (msg) => { setPlayerState("error"); setPlayerMsg(msg); };

    // ── HLS (jika ada) — langsung dengan xhrSetup ──────────────
    if (hlsStream && video) {
      const streamUrl = BASE + hlsStream.stream_url;

      if (typeof window === "undefined") return;
      const Hls = (await import("hls.js")).default;

      if (Hls.isSupported()) {
        const hls = new Hls({
          xhrSetup: (xhr) => xhr.setRequestHeader("x-api-key", KEY),
          maxBufferLength: 30,
        });
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setPlayerState("playing"); setPlayerMsg("");
          video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            hls.destroy(); hlsRef.current = null;
            // Fallback ke DASH
            playDash(streams, video, onFail);
          }
        });
        hlsRef.current = hls;

      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = streamUrl;
        video.play().catch(() => {});
        setPlayerState("playing"); setPlayerMsg("");
      } else {
        // Tidak support HLS, langsung coba DASH
        playDash(streams, video, onFail);
      }

    // ── DASH (mayoritas channel) ────────────────────────────────
    } else if (streams.some(s => s.stream_type === "dash") && video) {
      await playDash(streams, video, onFail);

    // ── Embed ───────────────────────────────────────────────────
    } else if (streams.some(s => s.stream_type === "embed")) {
      setPlayerState("playing"); setPlayerMsg("");

    } else {
      onFail("Tidak ada stream untuk channel ini");
    }
  }, [loadEpg, cleanupPlayer, playDash]);

  // Auto-play channel pertama
  useEffect(() => {
    if (filtered.length > 0 && !didAutoPlay.current) {
      didAutoPlay.current = true;
      playChannel(filtered[0]);
    }
  }, [filtered, playChannel]);

  const embedStream = activeChannel?.streams?.find(s => s.stream_type === "embed");
  const hlsStream   = activeChannel?.streams?.find(s => s.stream_type === "hls");
  const isEmbed     = !!embedStream && !hlsStream;

  return (
    <div style={s.root}>
      {/* NAV */}
      <nav style={s.nav}>
        <div style={s.navLeft}>
          <a href="/" style={s.navLogo}><span style={{color:"#e50914"}}>●</span> NONTON</a>
          <a href="/" style={s.navLink}>Drama</a>
          <a href="/tv" style={{...s.navLink,color:"#fff",borderBottom:"2px solid #e50914",paddingBottom:2}}>📺 Live TV</a>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Cari channel..." style={s.searchInput}/>
      </nav>

      {/* CATEGORIES */}
      <div style={s.catBar}>
        {CATEGORIES.map(c=>(
          <button key={c}
            onClick={()=>{ setCategory(c); didAutoPlay.current=false; setActiveChannel(null); cleanupPlayer(); setPlayerState("idle"); }}
            style={{...s.catBtn, background:category===c?"#e50914":"#1a1a1a", border:category===c?"none":"1px solid #333"}}>
            {CAT_LABELS[c]}
          </button>
        ))}
      </div>

      {/* LAYOUT */}
      <div style={s.layout}>
        {/* SIDEBAR */}
        <aside style={{...s.sidebar, width:sidebarOpen?260:0, minWidth:sidebarOpen?260:0}}>
          <div style={s.sidebarInner}>
            <div style={s.sidebarHeader}>
              <span style={{fontSize:13,color:"#888"}}>{filtered.length} Channel</span>
            </div>
            {loading
              ? Array.from({length:12}).map((_,i)=>(
                  <div key={i} style={s.skeletonItem}>
                    <div style={s.skeletonThumb}/><div style={s.skeletonText}/>
                  </div>
                ))
              : filtered.map(ch=>{
                  const isActive = activeChannel?.id===ch.id;
                  // Deteksi stream type untuk badge
                  const hasHls  = ch.streams?.some(s=>s.stream_type==="hls");
                  const hasDash = ch.streams?.some(s=>s.stream_type==="dash");
                  return (
                    <div key={ch.id} onClick={()=>playChannel(ch)}
                      style={{...s.channelItem, background:isActive?"#1e0000":"transparent", borderLeft:isActive?"3px solid #e50914":"3px solid transparent", opacity:ch.is_active?1:0.4}}>
                      {ch.logo_url
                        ? <img src={ch.logo_url} alt={ch.name} style={s.channelLogo} onError={e=>(e.target.style.display="none")}/>
                        : <div style={s.channelLogoFallback}>📺</div>}
                      <div style={s.channelInfo}>
                        <div style={s.channelName}>{ch.name}</div>
                        <div style={{display:"flex",gap:4,marginTop:3}}>
                          {hasHls  && <span style={{...s.typeBadge, background:"#1a6b1a"}}>HLS</span>}
                          {hasDash && <span style={{...s.typeBadge, background:"#1a3a6b"}}>DASH</span>}
                        </div>
                      </div>
                      {isActive && <span style={s.liveBadge}>LIVE</span>}
                    </div>
                  );
                })
            }
          </div>
        </aside>

        {/* PLAYER AREA */}
        <main style={s.playerArea}>
          <button onClick={()=>setSidebarOpen(v=>!v)} style={s.toggleBtn}>
            {sidebarOpen?"◀":"▶"}
          </button>

          {activeChannel ? (
            <>
              {/* Channel header */}
              <div style={s.channelHeader}>
                {activeChannel.logo_url && (
                  <img src={activeChannel.logo_url} alt={activeChannel.name} style={s.headerLogo}
                    onError={e=>(e.target.style.display="none")}/>
                )}
                <div>
                  <h2 style={s.channelTitle}>{activeChannel.name}</h2>
                  <span style={s.liveTag}>🔴 LIVE</span>
                  {activeChannel.category && <span style={s.categoryTag}>{activeChannel.category}</span>}
                </div>
              </div>

              {/* Player */}
              <div style={s.videoWrap}>
                {isEmbed && playerState !== "error"
                  ? <iframe src={embedStream.embed_url} style={s.iframe} allowFullScreen allow="autoplay;encrypted-media"/>
                  : playerState === "error"
                    ? <div style={s.errorBox}>
                        <div style={{fontSize:48}}>📡</div>
                        <p style={{color:"#fff",marginTop:12,fontWeight:600}}>Stream tidak tersedia</p>
                        {playerMsg && <p style={{color:"#888",fontSize:13,marginTop:6,textAlign:"center",maxWidth:320}}>{playerMsg}</p>}
                        <div style={{display:"flex",gap:10,marginTop:16}}>
                          <button onClick={()=>playChannel(activeChannel)} style={s.retryBtn}>🔄 Coba Lagi</button>
                          <button onClick={()=>{
                            const idx=filtered.findIndex(c=>c.id===activeChannel.id);
                            const next=filtered[idx+1]||filtered[idx-1];
                            if(next) playChannel(next);
                          }} style={s.nextBtn}>⏭ Channel Lain</button>
                        </div>
                      </div>
                    : <div style={{position:"relative",width:"100%",height:"100%"}}>
                        {playerState === "loading" && (
                          <div style={s.loadingOverlay}>
                            <div style={s.spinner}/>
                            <p style={{color:"#aaa",marginTop:12,fontSize:13}}>{playerMsg}</p>
                          </div>
                        )}
                        <video ref={videoRef} controls autoPlay playsInline style={s.video}
                          onError={()=>{setPlayerState("error");setPlayerMsg("Video gagal dimuat");}}
                          onPlaying={()=>setPlayerState("playing")}/>
                      </div>
                }
              </div>

              {/* EPG */}
              <div style={s.epgSection}>
                <h3 style={s.epgTitle}>📅 Jadwal Tayang Hari Ini</h3>
                {epgLoading
                  ? <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {Array.from({length:4}).map((_,i)=>(
                        <div key={i} style={{display:"flex",gap:12,alignItems:"center"}}>
                          <div style={{width:50,height:14,borderRadius:4,background:"#1a1a1a"}}/>
                          <div style={{flex:1,height:14,borderRadius:4,background:"#1a1a1a"}}/>
                        </div>
                      ))}
                    </div>
                  : epg?.length
                    ? <div style={s.epgList}>
                        {epg.map((item,i)=>{
                          const isNow=item.is_now||item.status==="now";
                          return (
                            <div key={i} style={{...s.epgItem,background:isNow?"#1e0000":"#0f0f0f",borderLeft:isNow?"3px solid #e50914":"3px solid transparent"}}>
                              <span style={s.epgTime}>{item.start_time||item.time||"—"}</span>
                              <span style={{...s.epgName,color:isNow?"#fff":"#888",fontWeight:isNow?600:400}}>
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
        @keyframes spin{to{transform:rotate(360deg)}}
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
  typeBadge:{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,color:"#fff"},
  liveBadge:{background:"#e50914",color:"#fff",fontSize:9,fontWeight:700,padding:"2px 5px",borderRadius:3,letterSpacing:0.5,flexShrink:0},
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
  videoWrap:{width:"100%",background:"#000",aspectRatio:"16/9",maxHeight:"55vh",position:"relative"},
  video:{width:"100%",height:"100%",display:"block",background:"#000"},
  iframe:{width:"100%",height:"100%",border:"none"},
  loadingOverlay:{position:"absolute",inset:0,background:"#000",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:5},
  spinner:{width:40,height:40,border:"3px solid #333",borderTop:"3px solid #e50914",borderRadius:"50%",animation:"spin 0.8s linear infinite"},
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
