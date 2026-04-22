"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

export default function PlayerPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const slug = params.slug;
  const startEp = parseInt(searchParams.get("ep") || "1");

  const [detail, setDetail] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [episode, setEpisode] = useState(startEp);
  const [showList, setShowList] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [nextVideo, setNextVideo] = useState(null);

  const videoRef = useRef(null);
  const touchStartY = useRef(0);
  const abortControllerRef = useRef(null);

  // 1. FETCH DETAIL DRAMA
  useEffect(() => {
    fetch(`https://drama-liart.vercel.app/detail?slug=${slug}`)
      .then((r) => r.json())
      .then((r) => setDetail(r.data));
  }, [slug]);

  // 2. FUNGSI UTAMA LOAD VIDEO
  const loadEpisode = async (ep) => {
    if (!detail || ep < 1 || ep > detail.total_episode) return;
    
    // Batalkan request sebelumnya jika user scroll terlalu cepat
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setIsChanging(true);
    setEpisode(ep);

    try {
      const res = await fetch(
        `https://drama-liart.vercel.app/video?slug=${slug}&ep=${ep}`,
        { signal: abortControllerRef.current.signal }
      );
      const data = await res.json();
      
      if (data.video_url) {
        const streamUrl = new URL("https://drama-liart.vercel.app/stream");
        streamUrl.searchParams.set("url", data.video_url); 
        setVideoUrl(streamUrl.toString());
      }
    } catch (e) {
      if (e.name !== "AbortError") console.error("Load Error:", e);
    } finally {
      setTimeout(() => setIsChanging(false), 500);
    }
  };

  // 3. AUTO PRE-FETCH EPISODE BERIKUTNYA (Agar Cepat)
  useEffect(() => {
    if (!episode || !detail || episode >= detail.total_episode) {
      setNextVideo(null);
      return;
    }

    const nextEp = episode + 1;
    fetch(`https://drama-liart.vercel.app/video?slug=${slug}&ep=${nextEp}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.video_url) {
          const streamUrl = new URL("https://drama-liart.vercel.app/stream");
          streamUrl.searchParams.set("url", data.video_url);
          setNextVideo(streamUrl.toString());
        }
      })
      .catch(() => {});
  }, [episode, detail]);

  // 4. INITIAL LOAD
  useEffect(() => {
    if (detail) loadEpisode(startEp);
  }, [detail]);

  // 5. UPDATE VIDEO SRC
  useEffect(() => {
    if (!videoUrl || !videoRef.current) return;
    const video = videoRef.current;
    video.src = videoUrl;
    video.load();
    video.play().catch(() => {});
  }, [videoUrl]);

  // 6. SCROLL & SWIPE DETECTOR
  useEffect(() => {
    const handleWheel = (e) => {
      if (isChanging || showList) return;
      if (e.deltaY > 50) loadEpisode(episode + 1);
      else if (e.deltaY < -50) loadEpisode(episode - 1);
    };

    const handleTouchStart = (e) => (touchStartY.current = e.touches[0].clientY);
    const handleTouchEnd = (e) => {
      if (isChanging || showList) return;
      const diff = touchStartY.current - e.changedTouches[0].clientY;
      if (diff > 80) loadEpisode(episode + 1);
      else if (diff < -80) loadEpisode(episode - 1);
    };

    window.addEventListener("wheel", handleWheel);
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [episode, isChanging, detail, showList]);

  if (!detail) return <div style={styles.loading}>Loading...</div>;

  return (
    <div style={styles.page}>
      {/* LOADING OVERLAY SAAT GANTI EPISODE */}
      {isChanging && (
        <div style={styles.loaderOverlay}>
          <div style={styles.loaderTitle}>EPISODE {episode}</div>
          <div style={styles.spinner}></div>
        </div>
      )}

      {/* HEADER */}
      <div style={styles.header}>
        <button onClick={() => router.back()} style={styles.btn}>←</button>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={styles.title}>{detail.title}</div>
          <div style={styles.sub}>EP {episode} / {detail.total_episode}</div>
        </div>
        <button onClick={() => setShowList(true)} style={styles.btn}>☰</button>
      </div>

      {/* VIDEO UTAMA */}
      <video
        ref={videoRef}
        controls
        autoPlay
        onEnded={() => loadEpisode(episode + 1)}
        style={styles.video}
      />

      {/* HIDDEN VIDEO UNTUK PRELOAD (RAHASIA KECEPATAN) */}
      {nextVideo && (
        <video key={nextVideo} src={nextVideo} preload="auto" style={{ display: "none" }} />
      )}

      {/* MANUAL NAVIGATION */}
      <div style={styles.control}>
        <button style={styles.navBtn} onClick={() => loadEpisode(episode - 1)}>◀</button>
        <button style={styles.navBtn} onClick={() => loadEpisode(episode + 1)}>▶</button>
      </div>

      {/* MODAL EPISODE LIST */}
      {showList && (
        <div style={styles.overlay} onClick={() => setShowList(false)}>
          <div style={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div style={styles.sheetHeader}>
              <span style={{ color: "white" }}>Pilih Episode</span>
              <button onClick={() => setShowList(false)} style={styles.closeBtn}>✕</button>
            </div>
            <div style={styles.sheetGrid}>
              {Array.from({ length: detail.total_episode }).map((_, i) => {
                const ep = i + 1;
                return (
                  <button
                    key={ep}
                    onClick={() => { loadEpisode(ep); setShowList(false); }}
                    style={{ ...styles.epBtn, background: ep === episode ? "red" : "#333" }}
                  >
                    {ep}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { position: "fixed", inset: 0, background: "black", display: "flex", flexDirection: "column", overflow: "hidden" },
  header: { height: 60, display: "flex", alignItems: "center", padding: "0 15px", color: "white", position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, background: "linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)" },
  btn: { background: "none", border: "none", color: "white", fontSize: 24, cursor: "pointer" },
  title: { fontSize: 14, fontWeight: "bold" },
  sub: { fontSize: 11, color: "#ccc" },
  video: { width: "100%", height: "100vh", objectFit: "contain" },
  loaderOverlay: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 50 },
  loaderTitle: { color: "white", fontSize: 20, fontWeight: "bold", marginBottom: 15 },
  spinner: { width: 40, height: 40, border: "4px solid #333", borderTop: "4px solid red", borderRadius: "50%", animation: "spin 1s linear infinite" },
  control: { position: "absolute", bottom: 40, width: "100%", display: "flex", justifyContent: "center", gap: 50, zIndex: 5 },
  navBtn: { background: "rgba(255,255,255,0.2)", border: "none", color: "white", padding: "12px 25px", borderRadius: "30px", fontSize: 18 },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  sheet: { width: "85%", maxWidth: "400px", background: "#111", borderRadius: "15px", display: "flex", flexDirection: "column" },
  sheetHeader: { padding: 15, borderBottom: "1px solid #222", display: "flex", justifyContent: "space-between" },
  sheetGrid: { padding: 15, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, maxHeight: "50vh", overflowY: "auto" },
  epBtn: { padding: 12, color: "white", border: "none", borderRadius: "8px" },
  closeBtn: { background: "none", border: "none", color: "white", fontSize: 20 },
  loading: { height: "100vh", background: "black", color: "white", display: "flex", justifyContent: "center", alignItems: "center" }
};
