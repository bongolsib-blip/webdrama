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
  
  // State untuk Animasi
  const [animClass, setAnimClass] = useState({ opacity: 1, transform: "translateY(0)" });

  const videoRef = useRef(null);
  const touchStartY = useRef(0);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    fetch(`https://drama-liart.vercel.app/detail?slug=${slug}`)
      .then((r) => r.json())
      .then((r) => setDetail(r.data));
  }, [slug]);

  const loadEpisode = async (ep, direction = "next") => {
    if (!detail || ep < 1 || ep > detail.total_episode || isChanging) return;
    
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    // Jalankan Animasi Keluar (Slide Out)
    setAnimClass({
      opacity: 0,
      transform: direction === "next" ? "translateY(-100px)" : "translateY(100px)",
    });

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
        
        // Kembalikan Animasi (Slide In) setelah URL siap
        setTimeout(() => {
          setAnimClass({ opacity: 1, transform: "translateY(0)" });
          setIsChanging(false);
        }, 300);
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        setIsChanging(false);
        setAnimClass({ opacity: 1, transform: "translateY(0)" });
      }
    }
  };

  useEffect(() => {
    if (!episode || !detail || episode >= detail.total_episode) return;
    const nextEp = episode + 1;
    fetch(`https://drama-liart.vercel.app/video?slug=${slug}&ep=${nextEp}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.video_url) {
          const streamUrl = new URL("https://drama-liart.vercel.app/stream");
          streamUrl.searchParams.set("url", data.video_url);
          setNextVideo(streamUrl.toString());
        }
      }).catch(() => {});
  }, [episode, detail]);

  useEffect(() => {
    if (detail) loadEpisode(startEp);
  }, [detail]);

  useEffect(() => {
    if (!videoUrl || !videoRef.current) return;
    videoRef.current.src = videoUrl;
    videoRef.current.load();
    videoRef.current.play().catch(() => {});
  }, [videoUrl]);

  useEffect(() => {
    const handleWheel = (e) => {
      if (showList) return;
      if (e.deltaY > 50) loadEpisode(episode + 1, "next");
      else if (e.deltaY < -50) loadEpisode(episode - 1, "prev");
    };

    const handleTouchStart = (e) => (touchStartY.current = e.touches[0].clientY);
    const handleTouchEnd = (e) => {
      if (showList) return;
      const diff = touchStartY.current - e.changedTouches[0].clientY;
      if (diff > 80) loadEpisode(episode + 1, "next");
      else if (diff < -80) loadEpisode(episode - 1, "prev");
    };

    window.addEventListener("wheel", handleWheel);
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [episode, detail, showList, isChanging]);

  if (!detail) return <div style={styles.loading}>Loading...</div>;

  return (
    <div style={styles.page}>
      {/* HEADER Tetap Static */}
      <div style={styles.header}>
        <button onClick={() => router.back()} style={styles.btn}>←</button>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={styles.title}>{detail.title}</div>
          <div style={styles.sub}>EP {episode} / {detail.total_episode}</div>
        </div>
        <button onClick={() => setShowList(true)} style={styles.btn}>☰</button>
      </div>

      {/* CONTAINER VIDEO DENGAN ANIMASI */}
      <div style={{ 
        ...styles.videoContainer, 
        ...animClass, 
        transition: "all 0.4s ease-out" 
      }}>
        <video
          ref={videoRef}
          controls
          autoPlay
          onEnded={() => loadEpisode(episode + 1, "next")}
          style={styles.video}
        />
      </div>

      {/* PRELOADER */}
      {nextVideo && <video key={nextVideo} src={nextVideo} preload="auto" style={{ display: "none" }} />}

      {/* NAVIGATION */}
      <div style={styles.control}>
        <button style={styles.navBtn} onClick={() => loadEpisode(episode - 1, "prev")}>◀</button>
        <button style={styles.navBtn} onClick={() => loadEpisode(episode + 1, "next")}>▶</button>
      </div>

      {/* MODAL EPISODE (Seperti sebelumnya) */}
      {showList && (
        <div style={styles.overlay} onClick={() => setShowList(false)}>
           <div style={styles.sheet} onClick={(e) => e.stopPropagation()}>
              <div style={styles.sheetHeader}>
                <span style={{ color: "white" }}>Pilih Episode</span>
                <button onClick={() => setShowList(false)} style={styles.closeBtn}>✕</button>
              </div>
              <div style={styles.sheetGrid}>
                {Array.from({ length: detail.total_episode }).map((_, i) => (
                  <button
                    key={i+1}
                    onClick={() => { loadEpisode(i+1, i+1 > episode ? "next" : "prev"); setShowList(false); }}
                    style={{ ...styles.epBtn, background: (i+1) === episode ? "red" : "#333" }}
                  >
                    {i+1}
                  </button>
                ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { position: "fixed", inset: 0, background: "black", overflow: "hidden" },
  header: { height: 60, display: "flex", alignItems: "center", padding: "0 15px", color: "white", position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, background: "linear-gradient(to bottom, rgba(0,0,0,0.9), transparent)" },
  videoContainer: { width: "100%", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  video: { width: "100%", height: "100%", objectFit: "contain" },
  btn: { background: "none", border: "none", color: "white", fontSize: 24 },
  title: { fontSize: 14, fontWeight: "bold", color: "white" },
  sub: { fontSize: 11, color: "#ccc" },
  control: { position: "absolute", bottom: 40, width: "100%", display: "flex", justifyContent: "center", gap: 50, zIndex: 10 },
  navBtn: { background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "12px 25px", borderRadius: "30px" },
  loading: { height: "100vh", background: "black", color: "white", display: "flex", justifyContent: "center", alignItems: "center" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  sheet: { width: "85%", maxWidth: "400px", background: "#111", borderRadius: "15px" },
  sheetHeader: { padding: 15, borderBottom: "1px solid #222", display: "flex", justifyContent: "space-between" },
  sheetGrid: { padding: 15, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 },
  epBtn: { padding: 12, color: "white", border: "none", borderRadius: "8px" },
  closeBtn: { background: "none", border: "none", color: "white", fontSize: 20 }
};
