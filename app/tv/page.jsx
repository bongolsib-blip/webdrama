"use client";

import { useEffect, useState, useRef, useCallback } from "react";

const KEY  = "ztatv_8ef9a9b28e724cbbd87f068510228c4fd54e3925";
const BASE = "https://api.nexoratv.qzz.io/api";

const proxyFetch = (path, params = {}) => {
  const qs = new URLSearchParams({ path, ...params }).toString();
  return fetch(`/api/tv?${qs}`);
};

const CATEGORIES = ["Semua","nasional","berita","olahraga","anak","religi","hiburan","movies"];
const CAT_LABELS = {
  Semua:"🌐 Semua", nasional:"📺 Nasional", berita:"📰 Berita",
  olahraga:"⚽ Olahraga", anak:"🧒 Anak", religi:"🕌 Religi",
  hiburan:"🎬 Hiburan", movies:"🎥 Movies",
};

export default function TVPage() {
  const [channels, setChannels]           = useState([]);
  const [filtered, setFiltered]           = useState([]);
  const [category, setCategory]           = useState("Semua");
  const [search, setSearch]               = useState("");
  const [loading, setLoading]             = useState(true);
  const [activeChannel, setActiveChannel] = useState(null);
  const [playerState, setPlayerState]     = useState("idle");
  const [playerMsg, setPlayerMsg]         = useState("");
  const [currentServer, setCurrentServer] = useState("");
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
        setChannels((json.data || []).sort((a,b) => b.is_active - a.is_active));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [category]);

  useEffect(() => {
    setFiltered(!search.trim() ? channels
      : channels.filter(ch => ch.name.toLowerCase().includes(search.toLowerCase()))
    );
  }, [search, channels]);

  // ── Cleanup ───────────────────────────────────────────────────
  const cleanupPlayer = useCallback(() => {
    if (hlsRef.current)   { hlsRef.current.destroy();  hlsRef.current  = null; }
    if (shakaRef.current) { shakaRef.current.destroy(); shakaRef.current = null; }
    if (videoRef.current) videoRef.current.src = "";
  }, []);

  // ── Play DASH — coba semua server by priority ─────────────────
  const playDash = useCallback(async (streams, video, onFail) => {
    const dashList = [...streams]
      .filter(s => s.stream_type === "dash")
      .sort((a,b) => a.priority - b.priority);

    for (const stream of dashList) {
      try {
        setCurrentServer(stream.server_name);
        setPlayerMsg(`Mencoba ${stream.server_name}...`);

        const res = await proxyFetch(stream.stream_url);
        if (!res.ok) continue;
        const info = await res.json();
        if (!info?.stream_url) continue;

        if (shakaRef.current) { await shakaRef.current.destroy(); shakaRef.current = null; }

        const shaka = (await import("shaka-player")).default;
        shaka.polyfill.installAll();
        if (!shaka.Player.isBrowserSupported()) { onFail("Browser tidak mendukung DASH"); return; }

        const player = new shaka.Player(video);
        shakaRef.current = player;

        if (info.drm_key) {
          const [kid, key] = info.drm_key.split(":");
          player.configure({ drm: { clearKeys: { [kid]: key } } });
        }

        let errored = false;
        await new Promise((resolve) => {
          player.addEventListener("error", () => { errored = true; resolve(); });
          player.load(BASE + info.stream_url).then(resolve).catch(() => { errored = true; resolve(); });
        });

        if (!errored) {
          video.play().catch(()=>{});
          setPlayerState("playing");
          setPlayerMsg("");
          return;
        }
        await player.destroy(); shakaRef.current = null;
      } catch (e) {
        console.warn(`[DASH] ${stream.server_name} gagal:`, e.message);
      }
    }
    onFail("Semua server tidak tersedia saat ini");
  }, []);

  // ── Play channel ──────────────────────────────────────────────
  const playChannel = useCallback(async (channel) => {
    setActiveChannel(channel);
    setPlayerState("loading");
    setPlayerMsg("Memuat stream...");
    setCurrentServer("");
    cleanupPlayer();

    const streams   = channel.streams || [];
    const hlsList   = [...streams].filter(s=>s.stream_type==="hls").sort((a,b)=>a.priority-b.priority);
    const dashList  = streams.filter(s=>s.stream_type==="dash");
    const embedItem = streams.find(s=>s.stream_type==="embed");
    const video     = videoRef.current;
    const onFail    = (msg) => { setPlayerState("error"); setPlayerMsg(msg); setCurrentServer(""); };

    if (hlsList.length > 0 && video) {
      // HLS — langsung dengan xhrSetup (sesuai panduan resmi)
      const best = hlsList[0];
      const url  = BASE + best.stream_url;
      setCurrentServer(best.server_name);

      const Hls = (await import("hls.js")).default;
      if (Hls.isSupported()) {
        const hls = new Hls({ xhrSetup: xhr => xhr.setRequestHeader("x-api-key", KEY) });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setPlayerState("playing"); setPlayerMsg(""); video.play().catch(()=>{});
        });
        hls.on(Hls.Events.ERROR, (_, d) => {
          if (d.fatal) { hls.destroy(); hlsRef.current = null; playDash(streams, video, onFail); }
        });
        hlsRef.current = hls;
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url; video.play().catch(()=>{});
        setPlayerState("playing"); setPlayerMsg("");
      } else {
        await playDash(streams, video, onFail);
      }

    } else if (dashList.length > 0 && video) {
      await playDash(streams, video, onFail);

    } else if (embedItem) {
      setPlayerState("playing"); setPlayerMsg("");

    } else {
      onFail("Tidak ada stream untuk channel ini");
    }
  }, [cleanupPlayer, playDash]);

  useEffect(() => {
    if (filtered.length > 0 && !didAutoPlay.current) {
      didAutoPlay.current = true;
      playChannel(filtered[0]);
    }
  }, [filtered, playChannel]);

  const activeEmbed = activeChannel?.streams?.find(s=>s.stream_type==="embed");
  const activeHls   = activeChannel?.streams?.find(s=>s.stream_type==="hls");
  const isEmbed     = !!activeEmbed && !activeHls && playerState !== "error";

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
            style={{...s.catBtn,background:category===c?"#e50914":"#1a1a1a",border:category===c?"none":"1px solid #333"}}>
            {CAT_LABELS[c]}
          </button>
        ))}
      </div>

      <div style={s.layout}>
        {/* SIDEBAR */}
        <aside style={{...s.sidebar,width:sidebarOpen?260:0,minWidth:sidebarOpen?260:0}}>
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
                  const hasHls   = ch.streams?.some(s=>s.stream_type==="hls");
                  return (
                    <div key={ch.id} onClick={()=>playChannel(ch)}
                      style={{...s.channelItem,background:isActive?"#1e0000":"transparent",borderLeft:isActive?"3px solid #e50914":"3px solid transparent",opacity:ch.is_active?1:0.45}}>
                      {ch.logo_url
                        ? <img src={ch.logo_url} alt={ch.name} style={s.channelLogo} onError={e=>(e.target.style.display="none")}/>
                        : <div style={s.channelLogoFallback}>📺</div>}
                      <div style={s.channelInfo}>
                        <div style={s.channelName}>{ch.name}</div>
                        <div style={{display:"flex",gap:4,marginTop:3,alignItems:"center"}}>
                          <span style={{fontSize:10,color:"#555"}}>{ch.category}</span>
                          {hasHls && <span style={{...s.badge,background:"#1a5c1a"}}>HLS</span>}
                        </div>
                      </div>
                      {isActive && playerState==="playing" && <span style={s.liveDot}/>}
                    </div>
                  );
                })
            }
          </div>
        </aside>

        {/* PLAYER */}
        <main style={s.playerArea}>
          <button onClick={()=>setSidebarOpen(v=>!v)} style={s.toggleBtn}>
            {sidebarOpen?"◀":"▶"}
          </button>

          {activeChannel ? (
            <>
              {/* Header */}
              <div style={s.channelHeader}>
                {activeChannel.logo_url && (
                  <img src={activeChannel.logo_url} alt={activeChannel.name} style={s.headerLogo}
                    onError={e=>(e.target.style.display="none")}/>
                )}
                <div style={{flex:1}}>
                  <h2 style={s.channelTitle}>{activeChannel.name}</h2>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    {playerState==="playing" && <span style={s.liveTag}>🔴 LIVE</span>}
                    {activeChannel.category && <span style={s.categoryTag}>{activeChannel.category}</span>}
                    {currentServer && playerState!=="error" && (
                      <span style={{fontSize:11,color:"#666"}}>{currentServer}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Video */}
              <div style={s.videoWrap}>
                {isEmbed
                  ? <iframe src={activeEmbed.embed_url} style={s.iframe} allowFullScreen allow="autoplay;encrypted-media"/>
                  : <>
                      {/* Loading overlay */}
                      {playerState==="loading" && (
                        <div style={s.overlay}>
                          <div style={s.spinner}/>
                          <p style={{color:"#888",marginTop:14,fontSize:13,textAlign:"center",maxWidth:260}}>
                            {playerMsg}
                          </p>
                        </div>
                      )}
                      {/* Error overlay */}
                      {playerState==="error" && (
                        <div style={s.overlay}>
                          <div style={{fontSize:48}}>📡</div>
                          <p style={{color:"#fff",marginTop:12,fontWeight:600}}>Stream tidak tersedia</p>
                          <p style={{color:"#666",fontSize:13,marginTop:6,textAlign:"center",maxWidth:300}}>{playerMsg}</p>
                          <div style={{display:"flex",gap:10,marginTop:16}}>
                            <button onClick={()=>playChannel(activeChannel)} style={s.retryBtn}>🔄 Coba Lagi</button>
                            <button onClick={()=>{
                              const idx=filtered.findIndex(c=>c.id===activeChannel.id);
                              const next=filtered[idx+1]||filtered[idx-1];
                              if(next) playChannel(next);
                            }} style={s.nextBtn}>⏭ Channel Lain</button>
                          </div>
                        </div>
                      )}
                      <video ref={videoRef} controls autoPlay playsInline style={{...s.video,opacity:playerState==="loading"?0:1}}
                        onError={()=>{setPlayerState("error");setPlayerMsg("Video gagal dimuat");}}
                        onPlaying={()=>{setPlayerState("playing");setPlayerMsg("");}}/>
                    </>
                }
              </div>

              {/* Stream info */}
              <div style={s.infoSection}>
                <h3 style={s.infoTitle}>📡 Server Tersedia</h3>
                <div style={s.serverList}>
                  {[...( activeChannel.streams||[])].sort((a,b)=>a.priority-b.priority).map((st,i)=>(
                    <div key={i} style={{
                      ...s.serverItem,
                      border: currentServer===st.server_name ? "1px solid #e50914" : "1px solid #222",
                      background: currentServer===st.server_name ? "#1e0000" : "#0f0f0f",
                    }}>
                      <span style={{
                        ...s.typePill,
                        background: st.stream_type==="hls"?"#1a5c1a":st.stream_type==="dash"?"#1a3a6b":"#4a3a00"
                      }}>{st.stream_type.toUpperCase()}</span>
                      <span style={{flex:1,fontSize:12,color:"#aaa"}}>{st.server_name}</span>
                      <span style={{fontSize:11,color:"#555"}}>P{st.priority}</span>
                    </div>
                  ))}
                </div>
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
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
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
  badge:{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,color:"#fff"},
  liveDot:{width:8,height:8,borderRadius:"50%",background:"#e50914",flexShrink:0,animation:"pulse 1.5s infinite"},
  skeletonItem:{display:"flex",alignItems:"center",gap:10,padding:"10px 12px"},
  skeletonThumb:{width:36,height:36,borderRadius:6,background:"linear-gradient(90deg,#1a1a1a 25%,#2a2a2a 50%,#1a1a1a 75%)",backgroundSize:"200% 100%",animation:"shimmer 1.5s infinite",flexShrink:0},
  skeletonText:{flex:1,height:12,borderRadius:4,background:"#1a1a1a"},
  playerArea:{flex:1,display:"flex",flexDirection:"column",overflowY:"auto",position:"relative"},
  toggleBtn:{position:"absolute",left:8,top:10,zIndex:10,background:"#1a1a1a",border:"1px solid #333",color:"#fff",borderRadius:6,width:28,height:28,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"},
  channelHeader:{display:"flex",alignItems:"center",gap:12,padding:"14px 48px 12px",borderBottom:"1px solid #111",background:"#050505"},
  headerLogo:{width:44,height:44,objectFit:"contain",borderRadius:8,background:"#111"},
  channelTitle:{fontSize:18,fontWeight:700,marginBottom:6},
  liveTag:{fontSize:12,color:"#e50914",fontWeight:700},
  categoryTag:{fontSize:11,color:"#888",background:"#1a1a1a",padding:"2px 8px",borderRadius:10},
  videoWrap:{width:"100%",background:"#000",aspectRatio:"16/9",maxHeight:"55vh",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"},
  video:{position:"absolute",inset:0,width:"100%",height:"100%",display:"block",background:"#000",transition:"opacity 0.3s"},
  iframe:{position:"absolute",inset:0,width:"100%",height:"100%",border:"none"},
  overlay:{position:"absolute",inset:0,background:"#000",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:5},
  spinner:{width:40,height:40,border:"3px solid #222",borderTop:"3px solid #e50914",borderRadius:"50%",animation:"spin 0.8s linear infinite"},
  retryBtn:{background:"#e50914",color:"#fff",border:"none",padding:"8px 18px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600},
  nextBtn:{background:"#1a1a1a",color:"#fff",border:"1px solid #333",padding:"8px 18px",borderRadius:8,cursor:"pointer",fontSize:13},
  infoSection:{padding:"16px 20px"},
  infoTitle:{fontSize:14,fontWeight:600,marginBottom:10,color:"#888"},
  serverList:{display:"flex",flexDirection:"column",gap:6,maxHeight:220,overflowY:"auto"},
  serverItem:{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:6,transition:"all 0.2s"},
  typePill:{fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:4,color:"#fff",flexShrink:0},
  empty:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"},
};
