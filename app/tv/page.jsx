"use client";

import { useEffect, useState, useRef, useCallback } from "react";

const proxy = (path) => {
  return `/api/tv?path=${encodeURIComponent(path)}`;
};

const CATEGORIES = [
  "Semua",
  "nasional",
  "berita",
  "olahraga",
  "anak",
  "religi",
  "hiburan",
];

const CAT_LABELS = {
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

  const [category, setCategory] =
    useState("Semua");

  const [search, setSearch] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [activeChannel, setActiveChannel] =
    useState(null);

  const [playerError, setPlayerError] =
    useState(false);

  const [playerMsg, setPlayerMsg] =
    useState("");

  const [sidebarOpen, setSidebarOpen] =
    useState(true);

  const videoRef = useRef(null);

  const hlsRef = useRef(null);

  const shakaRef = useRef(null);

  const didAutoPlay = useRef(false);

  // =========================
  // DESTROY PLAYERS
  // =========================
  const destroyPlayers = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (shakaRef.current) {
      shakaRef.current.destroy();
      shakaRef.current = null;
    }

    const video = videoRef.current;

    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
  };

  // =========================
  // LOAD CHANNELS
  // =========================
  useEffect(() => {
    const loadChannels = async () => {
      setLoading(true);

      try {
        const endpoint =
          category === "Semua"
            ? "/v1/channels"
            : `/v1/channels?category=${category}`;

        const res = await fetch(
          proxy(endpoint)
        );

        const json = await res.json();

        setChannels(json.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    loadChannels();
  }, [category]);

  // =========================
  // SEARCH FILTER
  // =========================
  useEffect(() => {
    if (!search.trim()) {
      setFiltered(channels);
    } else {
      setFiltered(
        channels.filter((c) =>
          c.name
            .toLowerCase()
            .includes(search.toLowerCase())
        )
      );
    }
  }, [channels, search]);

  // =========================
  // PLAY DASH
  // =========================
  const playDash = async (
    dashStream,
    video,
    showError
  ) => {
    try {
      // ambil info MPD
      const res = await fetch(
        proxy(dashStream.stream_url)
      );

      const info = await res.json();

      const shaka = (
        await import("shaka-player")
      ).default;

      shaka.polyfill.installAll();

      if (!shaka.Player.isBrowserSupported()) {
        showError(
          "Browser tidak mendukung DASH"
        );

        return;
      }

      const player = new shaka.Player(
        video
      );

      shakaRef.current = player;

      // PROXY semua segment DASH
      player
        .getNetworkingEngine()
        .registerRequestFilter(
          (type, request) => {
            request.uris =
              request.uris.map((uri) => {
                // sudah proxy
                if (
                  uri.includes(
                    "/api/tv?path="
                  )
                ) {
                  return uri;
                }

                // absolute url
                if (
                  uri.startsWith("http")
                ) {
                  const u = new URL(uri);

                  return proxy(
                    u.pathname + u.search
                  );
                }

                // relative
                return proxy(uri);
              });
          }
        );

      // DRM
      if (info.drm_key) {
        const [kid, key] =
          info.drm_key.split(":");

        player.configure({
          drm: {
            clearKeys: {
              [kid]: key,
            },
          },
        });
      }

      player.addEventListener(
        "error",
        (e) => {
          console.error(
            "Shaka Error:",
            e
          );

          showError(
            "Gagal memutar DASH"
          );
        }
      );

      await player.load(
        proxy(info.stream_url)
      );

      await video.play();
    } catch (e) {
      console.error(e);

      showError("DASH gagal");
    }
  };

  // =========================
  // PLAY CHANNEL
  // =========================
  const playChannel = useCallback(
    async (channel) => {
      setActiveChannel(channel);

      setPlayerError(false);

      setPlayerMsg("");

      destroyPlayers();

      const video = videoRef.current;

      if (!video) return;

      const streams =
        channel.streams || [];

      const hlsStream = streams.find(
        (s) => s.stream_type === "hls"
      );

      const dashStream = streams.find(
        (s) => s.stream_type === "dash"
      );

      const embedStream = streams.find(
        (s) => s.stream_type === "embed"
      );

      const showError = (msg) => {
        setPlayerError(true);

        setPlayerMsg(msg || "");
      };

      // =========================
      // HLS
      // =========================
      if (hlsStream) {
        try {
          const Hls = (
            await import("hls.js")
          ).default;

          if (Hls.isSupported()) {
            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
              backBufferLength: 90,
            });

            hlsRef.current = hls;

            hls.loadSource(
              proxy(
                hlsStream.stream_url
              )
            );

            hls.attachMedia(video);

            hls.on(
              Hls.Events.MANIFEST_PARSED,
              async () => {
                try {
                  await video.play();
                } catch {
                  video.muted = true;

                  await video.play();
                }
              }
            );

            hls.on(
              Hls.Events.ERROR,
              (_, data) => {
                console.error(
                  "HLS ERROR:",
                  data
                );

                if (data.fatal) {
                  destroyPlayers();

                  // fallback DASH
                  if (dashStream) {
                    playDash(
                      dashStream,
                      video,
                      showError
                    );
                  } else {
                    showError(
                      data.details ||
                        "HLS Error"
                    );
                  }
                }
              }
            );
          }

          // Safari native
          else if (
            video.canPlayType(
              "application/vnd.apple.mpegurl"
            )
          ) {
            video.src = proxy(
              hlsStream.stream_url
            );

            await video.play();
          } else {
            showError(
              "Browser tidak support HLS"
            );
          }
        } catch (e) {
          console.error(e);

          showError(
            "Gagal memutar HLS"
          );
        }
      }

      // =========================
      // DASH
      // =========================
      else if (dashStream) {
        playDash(
          dashStream,
          video,
          showError
        );
      }

      // =========================
      // EMBED
      // =========================
      else if (embedStream) {
        // handled by iframe
      }

      // =========================
      // NO STREAM
      // =========================
      else {
        showError(
          "Tidak ada stream"
        );
      }
    },
    []
  );

  // =========================
  // AUTOPLAY
  // =========================
  useEffect(() => {
    if (
      filtered.length > 0 &&
      !didAutoPlay.current
    ) {
      didAutoPlay.current = true;

      playChannel(filtered[0]);
    }
  }, [filtered, playChannel]);

  // =========================
  // EMBED
  // =========================
  const embedStream =
    activeChannel?.streams?.find(
      (s) => s.stream_type === "embed"
    );

  const hlsStream =
    activeChannel?.streams?.find(
      (s) => s.stream_type === "hls"
    );

  const isEmbed =
    !!embedStream && !hlsStream;

  return (
    <div style={s.root}>
      {/* NAVBAR */}
      <nav style={s.nav}>
        <div style={s.navLeft}>
          <a href="/" style={s.logo}>
            📺 NONTON TV
          </a>

          <a href="/" style={s.navLink}>
            Drama
          </a>

          <a
            href="/tv"
            style={{
              ...s.navLink,
              color: "#fff",
            }}
          >
            Live TV
          </a>
        </div>

        <input
          style={s.search}
          placeholder="Cari channel..."
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
        />
      </nav>

      {/* CATEGORY */}
      <div style={s.catBar}>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => {
              setCategory(c);

              didAutoPlay.current =
                false;
            }}
            style={{
              ...s.catBtn,
              background:
                category === c
                  ? "#e50914"
                  : "#1a1a1a",
            }}
          >
            {CAT_LABELS[c]}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={s.layout}>
        {/* SIDEBAR */}
        <aside
          style={{
            ...s.sidebar,
            width: sidebarOpen
              ? 260
              : 0,
          }}
        >
          <div style={s.sidebarInner}>
            {loading ? (
              <div style={s.loading}>
                Loading...
              </div>
            ) : (
              filtered.map((ch) => {
                const active =
                  activeChannel?.id ===
                  ch.id;

                return (
                  <div
                    key={
                      ch.id ||
                      ch.slug
                    }
                    style={{
                      ...s.channel,
                      background:
                        active
                          ? "#1e0000"
                          : "transparent",
                    }}
                    onClick={() =>
                      playChannel(ch)
                    }
                  >
                    {ch.logo ? (
                      <img
                        src={ch.logo}
                        alt={ch.name}
                        style={
                          s.channelLogo
                        }
                      />
                    ) : (
                      <div
                        style={
                          s.channelLogoFallback
                        }
                      >
                        📺
                      </div>
                    )}

                    <div
                      style={
                        s.channelInfo
                      }
                    >
                      <div
                        style={
                          s.channelName
                        }
                      >
                        {ch.name}
                      </div>

                      <div
                        style={
                          s.channelCat
                        }
                      >
                        {ch.category}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* PLAYER */}
        <main style={s.player}>
          <button
            style={s.toggle}
            onClick={() =>
              setSidebarOpen(
                (v) => !v
              )
            }
          >
            {sidebarOpen
              ? "◀"
              : "▶"}
          </button>

          {activeChannel ? (
            <>
              {/* HEADER */}
              <div style={s.header}>
                {activeChannel.logo && (
                  <img
                    src={
                      activeChannel.logo
                    }
                    alt={
                      activeChannel.name
                    }
                    style={
                      s.headerLogo
                    }
                  />
                )}

                <div>
                  <h2 style={s.title}>
                    {
                      activeChannel.name
                    }
                  </h2>

                  <span style={s.live}>
                    🔴 LIVE
                  </span>
                </div>
              </div>

              {/* VIDEO */}
              <div style={s.videoWrap}>
                {isEmbed ? (
                  <iframe
                    src={
                      embedStream.embed_url
                    }
                    style={s.iframe}
                    allowFullScreen
                    allow="autoplay; encrypted-media"
                  />
                ) : playerError ? (
                  <div style={s.error}>
                    <div
                      style={{
                        fontSize: 60,
                      }}
                    >
                      📡
                    </div>

                    <p>
                      Stream tidak
                      tersedia
                    </p>

                    <p
                      style={
                        s.errorMsg
                      }
                    >
                      {playerMsg}
                    </p>

                    <button
                      style={
                        s.retry
                      }
                      onClick={() =>
                        playChannel(
                          activeChannel
                        )
                      }
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
                  />
                )}
              </div>
            </>
          ) : (
            <div style={s.empty}>
              <div
                style={{
                  fontSize: 70,
                }}
              >
                📺
              </div>

              <p>
                Pilih channel
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const s = {
  root: {
    background: "#000",
    color: "#fff",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    fontFamily: "sans-serif",
  },

  nav: {
    height: 60,
    background: "#000",
    borderBottom: "1px solid #111",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
  },

  navLeft: {
    display: "flex",
    gap: 20,
    alignItems: "center",
  },

  logo: {
    color: "#fff",
    textDecoration: "none",
    fontWeight: "bold",
    fontSize: 20,
  },

  navLink: {
    color: "#999",
    textDecoration: "none",
  },

  search: {
    background: "#111",
    border: "1px solid #333",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: 8,
    width: 220,
  },

  catBar: {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    padding: 12,
    borderBottom: "1px solid #111",
  },

  catBtn: {
    border: "none",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: 20,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  layout: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },

  sidebar: {
    background: "#050505",
    borderRight: "1px solid #111",
    overflow: "hidden",
    transition: "0.3s",
  },

  sidebarInner: {
    width: 260,
    overflowY: "auto",
    height: "100%",
  },

  loading: {
    padding: 20,
    color: "#666",
  },

  channel: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 12,
    cursor: "pointer",
    borderBottom: "1px solid #111",
  },

  channelLogo: {
    width: 40,
    height: 40,
    objectFit: "contain",
    background: "#111",
    borderRadius: 8,
  },

  channelLogoFallback: {
    width: 40,
    height: 40,
    background: "#111",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  channelInfo: {
    flex: 1,
    minWidth: 0,
  },

  channelName: {
    fontSize: 14,
    fontWeight: 600,
  },

  channelCat: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },

  player: {
    flex: 1,
    overflowY: "auto",
    position: "relative",
  },

  toggle: {
    position: "absolute",
    left: 10,
    top: 10,
    zIndex: 10,
    background: "#111",
    border: "1px solid #333",
    color: "#fff",
    width: 28,
    height: 28,
    borderRadius: 6,
    cursor: "pointer",
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 50px",
    borderBottom: "1px solid #111",
  },

  headerLogo: {
    width: 50,
    height: 50,
    objectFit: "contain",
    background: "#111",
    borderRadius: 8,
  },

  title: {
    fontSize: 20,
    marginBottom: 4,
  },

  live: {
    color: "#e50914",
    fontSize: 13,
    fontWeight: "bold",
  },

  videoWrap: {
    width: "100%",
    aspectRatio: "16/9",
    background: "#000",
  },

  video: {
    width: "100%",
    height: "100%",
    background: "#000",
  },

  iframe: {
    width: "100%",
    height: "100%",
    border: "none",
  },

  error: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  errorMsg: {
    color: "#666",
    fontSize: 13,
  },

  retry: {
    background: "#e50914",
    border: "none",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: 8,
    cursor: "pointer",
  },

  empty: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#555",
    gap: 10,
  },
};
