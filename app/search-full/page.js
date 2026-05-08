"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const API = "https://drama-liart.vercel.app";

// =========================
// VIDEO PLAYER (HLS)
// =========================
function VideoPlayer({ videoUrl }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    if (!videoUrl || !videoRef.current) return;

    const video = videoRef.current;

    // Bersihkan HLS instance sebelumnya
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Wrap lewat proxy backend agar tidak CORS error
    const proxiedUrl = `${API}/stream?url=${encodeURIComponent(videoUrl)}`;

    const loadHls = async () => {
      const Hls = (await import("hls.js")).default;

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: false,
        });
        hlsRef.current = hls;
        hls.loadSource(proxiedUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error("HLS error:", data);
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari: native HLS support
        video.src = proxiedUrl;
        video.play().catch(() => {});
      } else {
        // Fallback MP4
        video.src = proxiedUrl;
        video.play().catch(() => {});
      }
    };

    loadHls();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoUrl]);

  return (
    <video
      ref={videoRef}
      controls
      style={{
        width: "100%",
        borderRadius: 10,
        background: "#000",
        maxHeight: "60vh",
      }}
    />
  );
}

// =========================
// MAIN PAGE
// =========================
export default function DetailPage() {
  const params = useParams();
  const router = useRouter();

  // slug dari URL — bisa saja masih "import?..."
  const rawSlug = decodeURIComponent(params.slug || "");

  const [detail, setDetail] = useState(null);
  const [finalSlug, setFinalSlug] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentEp, setCurrentEp] = useState(1);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [totalEpisodes, setTotalEpisodes] = useState(0);

  // =========================
  // FETCH DETAIL
  // =========================
  useEffect(() => {
    if (!rawSlug) return;

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `${API}/detail?slug=${encodeURIComponent(rawSlug)}`
        );
        const data = await res.json();

        if (data.data?.error) {
          setError(data.data.error);
          return;
        }

        // 🔥 Simpan final_slug — ini yang dipakai untuk fetch video
        setFinalSlug(data.final_slug);
        setDetail(data.data);
        setTotalEpisodes(data.data.total_episode || 0);

      } catch (err) {
        setError("Gagal memuat detail drama.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [rawSlug]);

  // =========================
  // FETCH VIDEO
  // =========================
  const fetchVideo = async (ep) => {
    if (!finalSlug) return;

    setVideoLoading(true);
    setVideoUrl(null);

    try {
      const res = await fetch(`${API}/video?slug=${finalSlug}&ep=${ep}`);
      const data = await res.json();

      if (data.video_url) {
        setVideoUrl(data.video_url);
      } else {
        alert("Video tidak tersedia untuk episode ini.");
      }
    } catch (err) {
      alert("Gagal memuat video.");
    } finally {
      setVideoLoading(false);
    }
  };

  // Auto-load episode 1 setelah finalSlug tersedia
  useEffect(() => {
    if (finalSlug) {
      fetchVideo(1);
    }
  }, [finalSlug]);

  const handleEpClick = (ep) => {
    setCurrentEp(ep);
    fetchVideo(ep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // =========================
  // RENDER
  // =========================
  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.center}>
          <div style={styles.spinner}></div>
          <p style={{ color: "#aaa", marginTop: 15 }}>Memuat drama...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.center}>
          <p style={{ color: "red" }}>{error}</p>
          <button onClick={() => router.back()} style={styles.backBtn}>
            ← Kembali
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* BACK */}
        <button onClick={() => router.back()} style={styles.backBtn}>
          ← Kembali
        </button>

        {/* VIDEO PLAYER */}
        <div style={styles.playerWrap}>
          {videoLoading ? (
            <div style={styles.playerPlaceholder}>
              <div style={styles.spinner}></div>
              <p style={{ color: "#aaa", marginTop: 10, fontSize: 13 }}>
                Memuat video episode {currentEp}...
              </p>
            </div>
          ) : videoUrl ? (
            <VideoPlayer videoUrl={videoUrl} />
          ) : (
            <div style={styles.playerPlaceholder}>
              <p style={{ color: "#aaa" }}>Pilih episode untuk ditonton</p>
            </div>
          )}
        </div>

        {/* INFO */}
        <div style={styles.infoRow}>
          {detail?.thumbnail && (
            <img src={detail.thumbnail} alt={detail.title} style={styles.thumb} />
          )}
          <div style={styles.infoText}>
            <h1 style={styles.title}>{detail?.title}</h1>
            <p style={styles.epInfo}>
              Episode {currentEp} / {totalEpisodes || "?"}
            </p>
            {detail?.tags?.length > 0 && (
              <div style={styles.tags}>
                {detail.tags.map((tag, i) => (
                  <span key={i} style={styles.tag}>{tag}</span>
                ))}
              </div>
            )}
            <p style={styles.desc}>{detail?.description}</p>
          </div>
        </div>

        {/* EPISODE LIST */}
        {totalEpisodes > 0 && (
          <div style={styles.epSection}>
            <h3 style={styles.epTitle}>Daftar Episode</h3>
            <div style={styles.epGrid}>
              {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map((ep) => (
                <button
                  key={ep}
                  onClick={() => handleEpClick(ep)}
                  style={{
                    ...styles.epBtn,
                    background: ep === currentEp ? "red" : "#222",
                    color: ep === currentEp ? "white" : "#ccc",
                  }}
                >
                  {ep}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// =========================
// STYLES
// =========================
const styles = {
  page: {
    background: "#000",
    minHeight: "100vh",
    color: "white",
    padding: 10,
  },
  container: {
    maxWidth: 800,
    margin: "0 auto",
  },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "80vh",
  },
  spinner: {
    width: 40,
    height: 40,
    border: "4px solid #333",
    borderTop: "4px solid red",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  backBtn: {
    background: "transparent",
    border: "none",
    color: "red",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 15,
    marginBottom: 15,
    padding: 0,
  },
  playerWrap: {
    width: "100%",
    background: "#111",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 20,
  },
  playerPlaceholder: {
    width: "100%",
    height: 220,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#111",
  },
  infoRow: {
    display: "flex",
    gap: 15,
    marginBottom: 25,
  },
  thumb: {
    width: 100,
    borderRadius: 8,
    objectFit: "cover",
    flexShrink: 0,
    alignSelf: "flex-start",
  },
  infoText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    margin: "0 0 6px",
  },
  epInfo: {
    fontSize: 13,
    color: "#aaa",
    margin: "0 0 8px",
  },
  tags: {
    display: "flex",
    flexWrap: "wrap",
    gap: 5,
    marginBottom: 10,
  },
  tag: {
    background: "#222",
    color: "#ccc",
    padding: "3px 8px",
    borderRadius: 4,
    fontSize: 11,
  },
  desc: {
    fontSize: 13,
    color: "#bbb",
    lineHeight: 1.6,
  },
  epSection: {
    marginTop: 10,
  },
  epTitle: {
    fontSize: 15,
    marginBottom: 10,
    color: "#eee",
  },
  epGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(48px, 1fr))",
    gap: 8,
  },
  epBtn: {
    padding: "8px 4px",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: "bold",
    transition: "background 0.2s",
  },
};
