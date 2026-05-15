"use client";

import { useEffect, useState, useRef, useCallback } from "react";

const API_KEY = "ztatv_8ef9a9b28e724cbbd87f068510228c4fd54e3925";
const BASE = "https://api.nexoratv.qzz.io/api";

const CATEGORIES = ["Semua", "nasional", "berita", "olahraga", "anak", "religi", "hiburan"];

const CATEGORY_LABELS = {
  Semua: "🌐 Semua",
  nasional: "📺 Nasional",
  berita: "📰 Berita",
  olahraga: "⚽ Olahraga",
  anak: "🧒 Anak",
  religi: "🕌 Religi",
  hiburan: "🎬 Hiburan",
};

export default function TVPage() {
  const [channels, setChannels] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [category, setCategory] = useState("Semua");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState(null);
  const [epg, setEpg] = useState(null);
  const [epgLoading, setEpgLoading] = useState(false);
  const [playerError, setPlayerError] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  // ─── Load Channels ───────────────────────────────────────────────
  useEffect(() => {
    const fetchChannels = async () => {
      setLoading(true);
      try {
        const params = category !== "Semua" ? `?category=${category}` : "";
        const res = await fetch(`${BASE}/v1/channels${params}`, {
          headers: { "x-api-key": API_KEY },
        });
        const json = await res.json();
        setChannels(json.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchChannels();
  }, [category]);

  // ─── Filter by search ────────────────────────────────────────────
  useEffect(() => {
    if (!search.trim()) {
      setFiltered(channels);
    } else {
      setFiltered(
        channels.filter((ch) =>
          ch.name.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, channels]);

  // ─── Load EPG ────────────────────────────────────────────────────
  const loadEpg = useCallback(async (channelId) => {
    setEpgLoading(true);
    setEpg(null);
    try {
      const res = await fetch(`${BASE}/v1/epg/${channelId}`, {
        headers: { "x-api-key": API_KEY },
      });
      const json = await res.json();
      setEpg(json.data || json);
    } catch (e) {
      console.error(e);
    } finally {
      setEpgLoading(false);
    }
  }, []);

  // ─── Play Channel ─────────────────────────────────────────────────
  const playChannel = useCallback(
    async (channel) => {
      setActiveChannel(channel);
      setPlayerError(false);
      setEpg(null);
      loadEpg(channel.id || channel.slug);

      // destroy old HLS
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      const streams = channel.streams || [];
      const hlsStream = streams.find((s) => s.stream_type === "hls");
      const dashStream = streams.find((s) => s.stream_type === "dash");
      const embedStream = streams.find((s) => s.stream_type === "embed");

      const video = videoRef.current;
      if (!video) return;

      if (hlsStream) {
        const streamUrl = BASE + hlsStream.stream_url;
        if (typeof window !== "undefined") {
          const Hls = (await import("hls.js")).default;
          if (Hls.isSupported()) {
            const hls = new Hls({
              xhrSetup: (xhr) => {
                xhr.setRequestHeader("x-api-key", API_KEY);
              },
            });
            hls.loadSource(streamUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.ERROR, () => setPlayerError(true));
            hlsRef.current = hls;
          } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = streamUrl;
          }
        }
      } else if (dashStream) {
        try {
          const res = await fetch(BASE + dashStream.stream_url, {
            headers: { "x-api-key": API_KEY },
          });
          const info = await res.json();
          if (typeof window !== "undefined") {
            const shaka = await import("shaka-player");
            const player = new shaka.Player(video);
            await player.load(BASE + info.stream_url);
          }
        } catch {
          setPlayerError(true);
        }
      } else if (embedStream) {
        // handled via iframe in render
      } else {
        setPlayerError(true);
      }
    },
    [loadEpg]
  );

  // auto-select first channel
  useEffect(() => {
    if (filtered.length > 0 && !activeChannel) {
      playChannel(filtered[0]);
    }
  }, [filtered]);

  const embedStream = activeChannel?.streams?.find((s) => s.stream_type === "embed");
  const isEmbed = !!embedStream && !activeChannel?.streams?.find((s) => s.stream_type === "hls");

  // ─── UI ───────────────────────────────────────────────────────────
  return (
    <div style={s.root}>
      {/* ── TOP NAV ── */}
      <nav style={s.nav}>
        <div style={s.navLeft}>
          <a href="/" style={s.navLogo}>
            <span style={{ color: "#e50914" }}>●</span> NONTON
          </a>
          <a href="/" style={s.navLink}>Drama</a>
          <a href="/tv" style={{ ...s.navLink, color: "#fff", borderBottom: "2px solid #e50914", paddingBottom: 2 }}>
            📺 Live TV
          </a>
        </div>
        <div style={s.searchWrap}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari channel..."
            style={s.searchInput}
          />
        </div>
      </nav>

      {/* ── CATEGORY BAR ── */}
      <div style={s.catBar}>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            style={{
              ...s.catBtn,
              background: category === c ? "#e50914" : "#1a1a1a",
              border: category === c ? "none" : "1px solid #333",
            }}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div style={s.layout}>
        {/* SIDEBAR */}
        <aside
          style={{
            ...s.sidebar,
            width: sidebarOpen ? 260 : 0,
            minWidth: sidebarOpen ? 260 : 0,
            overflow: "hidden",
          }}
        >
          <div style={s.sidebarInner}>
            <div style={s.sidebarHeader}>
              <span style={{ fontSize: 13, color: "#888" }}>
                {filtered.length} Channel
              </span>
            </div>

            {loading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} style={s.skeletonItem}>
                    <div style={s.skeletonThumb} />
                    <div style={s.skeletonText} />
                  </div>
                ))
              : filtered.map((ch) => (
                  <div
                    key={ch.id || ch.slug}
                    onClick={() => playChannel(ch)}
                    style={{
                      ...s.channelItem,
                      background:
                        activeChannel?.id === ch.id
                          ? "#1e0000"
                          : "transparent",
                      borderLeft:
                        activeChannel?.id === ch.id
                          ? "3px solid #e50914"
                          : "3px solid transparent",
                    }}
                  >
                    {ch.logo ? (
                      <img
                        src={ch.logo}
                        alt={ch.name}
                        style={s.channelLogo}
                        onError={(e) => (e.target.style.display = "none")}
                      />
                    ) : (
                      <div style={s.channelLogoFallback}>📺</div>
                    )}
                    <div style={s.channelInfo}>
                      <div style={s.channelName}>{ch.name}</div>
                      <div style={s.channelCat}>{ch.category || ""}</div>
                    </div>
                    {activeChannel?.id === ch.id && (
                      <span style={s.liveBadge}>LIVE</span>
                    )}
                  </div>
                ))}
          </div>
        </aside>

        {/* PLAYER AREA */}
        <main style={s.playerArea}>
          {/* toggle sidebar btn */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            style={s.toggleBtn}
            title={sidebarOpen ? "Sembunyikan sidebar" : "Tampilkan sidebar"}
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>

          {activeChannel ? (
            <>
              {/* Channel header */}
              <div style={s.channelHeader}>
                {activeChannel.logo && (
                  <img
                    src={activeChannel.logo}
                    alt={activeChannel.name}
                    style={s.headerLogo}
                    onError={(e) => (e.target.style.display = "none")}
                  />
                )}
                <div>
                  <h2 style={s.channelTitle}>{activeChannel.name}</h2>
                  <span style={s.liveTag}>🔴 LIVE</span>
                  {activeChannel.category && (
                    <span style={s.categoryTag}>{activeChannel.category}</span>
                  )}
                </div>
              </div>

              {/* Video / Embed */}
              <div style={s.videoWrap}>
                {isEmbed ? (
                  <iframe
                    src={embedStream.embed_url}
                    style={s.iframe}
                    allowFullScreen
                    allow="autoplay; encrypted-media"
                  />
                ) : playerError ? (
                  <div style={s.errorBox}>
                    <div style={{ fontSize: 40 }}>📡</div>
                    <p style={{ color: "#fff", marginTop: 10 }}>
                      Stream tidak tersedia saat ini
                    </p>
                    <p style={{ color: "#888", fontSize: 13 }}>
                      Coba channel lain atau refresh halaman
                    </p>
                    <button
                      onClick={() => playChannel(activeChannel)}
                      style={s.retryBtn}
                    >
                      🔄 Coba Lagi
                    </button>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    controls
                    autoPlay
                    playsInline
                    style={s.video}
                    onError={() => setPlayerError(true)}
                  />
                )}
              </div>

              {/* EPG */}
              <div style={s.epgSection}>
                <h3 style={s.epgTitle}>📅 Jadwal Tayang</h3>
                {epgLoading ? (
                  <p style={{ color: "#888", fontSize: 13 }}>
                    Memuat jadwal...
                  </p>
                ) : epg ? (
                  <div style={s.epgList}>
                    {(Array.isArray(epg) ? epg : epg.schedule || []).map(
                      (item, i) => {
                        const isNow = item.is_now || item.status === "now";
                        return (
                          <div
                            key={i}
                            style={{
                              ...s.epgItem,
                              background: isNow ? "#1e0000" : "#111",
                              borderLeft: isNow
                                ? "3px solid #e50914"
                                : "3px solid transparent",
                            }}
                          >
                            <span style={s.epgTime}>
                              {item.start_time || item.time || ""}
                            </span>
                            <span
                              style={{
                                ...s.epgName,
                                color: isNow ? "#fff" : "#aaa",
                                fontWeight: isNow ? 600 : 400,
                              }}
                            >
                              {item.title || item.name || "—"}
                            </span>
                            {isNow && (
                              <span style={s.nowBadge}>Sekarang</span>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <p style={{ color: "#555", fontSize: 13 }}>
                    Jadwal tidak tersedia
                  </p>
                )}
              </div>
            </>
          ) : (
            <div style={s.empty}>
              <div style={{ fontSize: 60 }}>📺</div>
              <p style={{ color: "#888", marginTop: 16 }}>
                Pilih channel untuk mulai menonton
              </p>
            </div>
          )}
        </main>
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #000; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: #e50914; }
        .ch-hover:hover { background: #1a0000 !important; cursor: pointer; }
      `}</style>
    </div>
  );
}

/* ─── STYLES ─────────────────────────────────────────────────────── */
const s = {
  root: {
    background: "#000",
    minHeight: "100vh",
    color: "#fff",
    fontFamily: "'Segoe UI', sans-serif",
    display: "flex",
    flexDirection: "column",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    height: 56,
    background: "#000",
    borderBottom: "1px solid #1a1a1a",
    position: "sticky",
    top: 0,
    zIndex: 200,
  },
  navLeft: { display: "flex", alignItems: "center", gap: 24 },
  navLogo: {
    fontSize: 20,
    fontWeight: 900,
    color: "#fff",
    textDecoration: "none",
    letterSpacing: 2,
  },
  navLink: {
    color: "#aaa",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 500,
  },
  searchWrap: { display: "flex" },
  searchInput: {
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: 8,
    padding: "7px 14px",
    color: "#fff",
    fontSize: 14,
    outline: "none",
    width: 220,
  },
  catBar: {
    display: "flex",
    gap: 8,
    padding: "10px 16px",
    overflowX: "auto",
    background: "#050505",
    borderBottom: "1px solid #111",
  },
  catBtn: {
    padding: "6px 14px",
    borderRadius: 20,
    color: "#fff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    whiteSpace: "nowrap",
    transition: "all 0.2s",
  },
  layout: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
    height: "calc(100vh - 96px)",
  },
  sidebar: {
    background: "#0a0a0a",
    borderRight: "1px solid #1a1a1a",
    transition: "width 0.3s ease, min-width 0.3s ease",
    flexShrink: 0,
  },
  sidebarInner: {
    width: 260,
    height: "100%",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
  },
  sidebarHeader: {
    padding: "12px 16px",
    borderBottom: "1px solid #1a1a1a",
  },
  channelItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    cursor: "pointer",
    transition: "background 0.15s",
    borderBottom: "1px solid #111",
  },
  channelLogo: {
    width: 36,
    height: 36,
    objectFit: "contain",
    borderRadius: 6,
    background: "#1a1a1a",
    flexShrink: 0,
  },
  channelLogoFallback: {
    width: 36,
    height: 36,
    background: "#1a1a1a",
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    flexShrink: 0,
  },
  channelInfo: { flex: 1, minWidth: 0 },
  channelName: {
    fontSize: 13,
    fontWeight: 500,
    color: "#ddd",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  channelCat: { fontSize: 11, color: "#555", marginTop: 2 },
  liveBadge: {
    background: "#e50914",
    color: "#fff",
    fontSize: 9,
    fontWeight: 700,
    padding: "2px 5px",
    borderRadius: 3,
    letterSpacing: 0.5,
  },
  skeletonItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
  },
  skeletonThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    background: "#1a1a1a",
    flexShrink: 0,
    animation: "pulse 1.5s infinite",
  },
  skeletonText: {
    flex: 1,
    height: 12,
    borderRadius: 4,
    background: "#1a1a1a",
  },
  playerArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    position: "relative",
    padding: "0 0 20px",
  },
  toggleBtn: {
    position: "absolute",
    left: 8,
    top: 10,
    zIndex: 10,
    background: "#1a1a1a",
    border: "1px solid #333",
    color: "#fff",
    borderRadius: 6,
    width: 28,
    height: 28,
    cursor: "pointer",
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  channelHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 48px 12px",
    borderBottom: "1px solid #111",
    background: "#050505",
  },
  headerLogo: {
    width: 44,
    height: 44,
    objectFit: "contain",
    borderRadius: 8,
    background: "#111",
  },
  channelTitle: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  liveTag: {
    fontSize: 12,
    color: "#e50914",
    fontWeight: 700,
    marginRight: 8,
  },
  categoryTag: {
    fontSize: 11,
    color: "#888",
    background: "#1a1a1a",
    padding: "2px 8px",
    borderRadius: 10,
  },
  videoWrap: {
    width: "100%",
    background: "#000",
    aspectRatio: "16/9",
    maxHeight: "55vh",
  },
  video: { width: "100%", height: "100%", display: "block", background: "#000" },
  iframe: { width: "100%", height: "100%", border: "none" },
  errorBox: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#0a0a0a",
  },
  retryBtn: {
    marginTop: 14,
    background: "#e50914",
    color: "#fff",
    border: "none",
    padding: "8px 20px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
  epgSection: { padding: "16px 20px" },
  epgTitle: { fontSize: 15, fontWeight: 600, marginBottom: 12 },
  epgList: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    maxHeight: 300,
    overflowY: "auto",
  },
  epgItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "8px 12px",
    borderRadius: 6,
    transition: "background 0.2s",
  },
  epgTime: { fontSize: 12, color: "#e50914", fontWeight: 600, minWidth: 50 },
  epgName: { flex: 1, fontSize: 13 },
  nowBadge: {
    fontSize: 10,
    background: "#e50914",
    color: "#fff",
    padding: "2px 6px",
    borderRadius: 4,
    fontWeight: 700,
  },
  empty: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
};
