"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const proxiedUrl = `${API}/stream?url=${encodeURIComponent(videoUrl)}`;

    const loadHls = async () => {
      const Hls = (await import("hls.js")).default;

      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: false });
        hlsRef.current = hls;
        hls.loadSource(proxiedUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          console.error("HLS error:", data);
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = proxiedUrl;
        video.play().catch(() => {});
      } else {
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
      style={{ width: "100%", borderRadius: 10, background: "#000", maxHeight: "60vh" }}
    />
  );
}

// =========================
// MAIN PAGE
// =========================
export default function DetailPage() {
  const params = useParams();
  const router = useRouter();

  // 🔥 decode URI agar slug import tidak rusak
  const rawSlug = decodeURIComponent(params.slug || "");

  const [detail, setDetail]               = useState(null);
  const [finalSlug, setFinalSlug]         = useState(null);
  const [loading, setLoading]             = useState(true);
  const [loadingText, setLoadingText]     = useState("Memuat drama...");
  const [importAttempt, setImportAttempt] = useState(0);
  const [error, setError]                 = useState(null);
  const [currentEp, setCurrentEp]         = useState(1);
  const [videoUrl, setVideoUrl]           = useState(null);
  const [videoLoading, setVideoLoading]   = useState(false);
  const [totalEpisodes, setTotalEpisodes] = useState(0);

  // =========================
  // FETCH DETAIL
  // =========================
  useEffect(() => {
    if (!rawSlug) return;

    const isActive = { value: true };

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      setImportAttempt(0);

      try {
        let slugToUse = rawSlug;

        // ==============================
        // Import slug → polling /check-import
        // ==============================
        if (rawSlug.startsWith("import")) {
          setLoadingText("Mengimpor drama...");

          let resolved = false;
          const maxAttempts = 15;

          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            if (!isActive.value) return;

            setImportAttempt(attempt);
            setLoadingText(`Mengimpor drama... (${attempt}/${maxAttempts})`);

            try {
              // 🔥 encodeURIComponent agar & tidak terpotong
              const res = await fetch(
                `${API}/check-import?slug=${encodeURIComponent(rawSlug)}`
              );
              const data = await res.json();

              if (data.status === "success" && data.final_slug) {
                slugToUse = data.final_slug;
                resolved = true;
                break;
              }

              if (data.status === "error") {
                setError("Gagal import: " + (data.message || "unknown error"));
                return;
              }

              // pending → tunggu 3 detik lalu coba lagi
              await new Promise(r => setTimeout(r, 3000));

            } catch (e) {
              console.error(`check-import attempt ${attempt} error:`, e);
              await new Promise(r => setTimeout(r, 3000));
            }
          }

          if (!resolved) {
            setError("Drama gagal diimport setelah beberapa percobaan. Coba refresh halaman.");
            return;
          }
        }

        // ==============================
        // Fetch detail dengan slug bersih
        // ==============================
        if (!isActive.value) return;
        setLoadingText("Memuat detail drama...");

        const res = await fetch(`${API}/detail?slug=${slugToUse}`);
        const data = await res.json();

        if (data.data?.error) {
          setError(data.data.error);
          return;
        }

        setFinalSlug(data.final_slug || slugToUse);
        setDetail(data.data);
        setTotalEpisodes(data.data.total_episode || 0);

      } catch (err) {
        console.error("fetchDetail error:", err);
        setError("Gagal memuat. Periksa koneksi internet.");
      } finally {
        if (isActive.value) setLoading(false);
      }
    };

    fetchDetail();
    return () => { isActive.value = false; };
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

  // Auto-load episode 1
  useEffect(() => {
    if (finalSlug) fetchVideo(1);
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
    const isImporting = rawSlug.startsWith("import");
    return (
      <div style={styles.page}>
        <div style={styles.center}>
          <div style={styles.spinner}></div>
          <p style={{ color: "#aaa", marginTop: 15, fontSize: 14 }}>{loadingText}</p>

          {/* Progress bar saat import */}
          {isImporting && importAttempt > 0 && (
            <>
              <div style={styles.progressWrap}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${(importAttempt / 15) * 100}%`
                  }}
                />
              </div>
              <p style={{ color: "#444", fontSize: 11, marginTop: 5 }}>
                Proses import bisa memakan waktu 30–60 detik
              </p>
            </>
          )}
        </div>
        <style>{spinStyle}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.center}>
          <p style={{ color: "red", marginBottom: 15, textAlign: "center" }}>{error}</p>
          <button onClick={() => router.back()} style={styles.backBtn}>
            ← Kembali
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{ ...styles.backBtn, color: "#aaa", marginTop: 10 }}
          >
            ↺ Coba Lagi
          </button>
        </div>
        <style>{spinStyle}</style>
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
              <p style={{ color: "#555" }}>Pilih episode untuk ditonton</p>
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
                    background: ep === currentEp ? "red" : "#1a1a1a",
                    color: ep === currentEp ? "white" : "#888",
                    border: ep === currentEp ? "none" : "1px solid #2a2a2a",
                  }}
                >
                  {ep}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
      <style>{spinStyle}</style>
    </div>
  );
}

const spinStyle = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

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
    width: 36,
    height: 36,
    border: "3px solid #222",
    borderTop: "3px solid red",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  progressWrap: {
    width: 200,
    height: 3,
    background: "#222",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 12,
  },
  progressFill: {
    height: "100%",
    background: "red",
    borderRadius: 2,
    transition: "width 0.5s ease",
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
    display: "block",
  },
  playerWrap: {
    width: "100%",
    background: "#0a0a0a",
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
  },
  infoRow: {
    display: "flex",
    gap: 15,
    marginBottom: 25,
  },
  thumb: {
    width: 90,
    borderRadius: 8,
    objectFit: "cover",
    flexShrink: 0,
    alignSelf: "flex-start",
  },
  infoText: { flex: 1 },
  title: {
    fontSize: 17,
    fontWeight: "bold",
    margin: "0 0 6px",
    lineHeight: 1.3,
  },
  epInfo: {
    fontSize: 12,
    color: "#666",
    margin: "0 0 8px",
  },
  tags: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 8,
  },
  tag: {
    background: "#1a1a1a",
    color: "#888",
    padding: "2px 7px",
    borderRadius: 4,
    fontSize: 10,
    border: "1px solid #2a2a2a",
  },
  desc: {
    fontSize: 12,
    color: "#777",
    lineHeight: 1.6,
  },
  epSection: { marginTop: 5 },
  epTitle: {
    fontSize: 14,
    marginBottom: 10,
    color: "#aaa",
    fontWeight: "normal",
  },
  epGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(44px, 1fr))",
    gap: 6,
  },
  epBtn: {
    padding: "7px 4px",
    borderRadius: 5,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: "bold",
    transition: "all 0.15s",
  },
};
