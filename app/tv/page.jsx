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
  const [category, setCategory] = useState("Semua");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] =
    useState(null);

  const [playerError, setPlayerError] =
    useState(false);

  const [playerMsg, setPlayerMsg] =
    useState("");

  const [sidebarOpen, setSidebarOpen] =
    useState(true);

  const videoRef = useRef(null);

  const playerRef = useRef(null);

  const didAutoPlay = useRef(false);

  // =========================
  // DESTROY PLAYER
  // =========================
  const destroyPlayer = async () => {
    try {
      if (playerRef.current) {
        await playerRef.current.destroy();
        playerRef.current = null;
      }

      const video = videoRef.current;

      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
    } catch (e) {
      console.error(e);
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
  // SEARCH
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
  // PLAY STREAM
  // =========================
  const playChannel = useCallback(
    async (channel) => {
      setActiveChannel(channel);

      setPlayerError(false);

      setPlayerMsg("");

      await destroyPlayer();

      const video = videoRef.current;

      if (!video) return;

      const streams =
        channel.streams || [];

      const stream =
        streams.find(
          (s) =>
            s.stream_type === "hls"
        ) ||
        streams.find(
          (s) =>
            s.stream_type === "dash"
        );

      const embedStream = streams.find(
        (s) => s.stream_type === "embed"
      );

      // EMBED
      if (!stream && embedStream) {
        return;
      }

      if (!stream) {
        setPlayerError(true);

        setPlayerMsg(
          "Tidak ada stream tersedia"
        );

        return;
      }

      try {
        const shaka = (
          await import("shaka-player")
        ).default;

        shaka.polyfill.installAll();

        if (
          !shaka.Player.isBrowserSupported()
        ) {
          setPlayerError(true);

          setPlayerMsg(
            "Browser tidak support Shaka"
          );

          return;
        }

        const player = new shaka.Player(
          video
        );

        playerRef.current = player;

        // PROXY semua request
        player
          .getNetworkingEngine()
          .registerRequestFilter(
            (type, request) => {
              request.uris =
                request.uris.map((uri) => {
                  if (
                    uri.includes(
                      "/api/tv?path="
                    )
                  ) {
                    return uri;
                  }

                  if (
                    uri.startsWith("http")
                  ) {
                    const u =
                      new URL(uri);

                    return proxy(
                      u.pathname +
                        u.search
                    );
                  }

                  return proxy(uri);
                });
            }
          );

        // DASH INFO
        let finalUrl =
          stream.stream_url;

        if (
          stream.stream_type ===
          "dash"
        ) {
          const res = await fetch(
            proxy(stream.stream_url)
          );

          const info =
            await res.json();

          finalUrl =
            info.stream_url;

          // DRM
          if (info.drm_key) {
            const [kid, key] =
              info.drm_key.split(
                ":"
              );

            player.configure({
              drm: {
                clearKeys: {
                  [kid]: key,
                },
              },
            });
          }
        }

        player.addEventListener(
          "error",
          (e) => {
            console.error(
              "PLAYER ERROR",
              e
            );

            setPlayerError(true);

            setPlayerMsg(
              "Stream gagal diputar"
            );
          }
        );

        await player.load(
          proxy(finalUrl)
        );

        try {
          await video.play();
        } catch {
          video.muted = true;

          await video.play();
        }
      } catch (e) {
        console.error(e);

        setPlayerError(true);

        setPlayerMsg(
          "Gagal memutar stream"
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
  // EMBED CHECK
  // =========================
  const embedStream =
    activeChannel?.streams?.find(
      (s) => s.stream_type === "embed"
    );

  const hasPlayable =
    activeChannel?.streams?.find(
      (s) =>
        s.stream_type === "hls" ||
        s.stream_type === "dash"
    );

  const isEmbed =
    !!embedStream && !hasPlayable;

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
            setSearch(e.target.value)
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
                      ch.id || ch.slug
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
                      style={s.retry}
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

              <p>Pilih channel</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// styles tetap sama
const s = {
  // BIARKAN STYLE LAMA ANDA
};
