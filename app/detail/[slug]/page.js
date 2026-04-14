"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";

let Hls;
if (typeof window !== "undefined") {
  Hls = require("hls.js");
}

export default function DetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const slug = params?.slug;
  const startEp = parseInt(searchParams.get("ep") || "1");

  const [detail, setDetail] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [episode, setEpisode] = useState(startEp);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [showControl, setShowControl] = useState(true);

  const videoRef = useRef(null);
  const hideTimeout = useRef(null);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const lastTap = useRef(0);

  // ================= LOAD DETAIL =================
  useEffect(() => {
    if (!slug) return;

    fetch(`https://drama-liart.vercel.app/detail?slug=${slug}`)
      .then((r) => r.json())
      .then((d) => setDetail(d?.data || null));
  }, [slug]);

  // ================= LOAD EPISODE =================
  const loadEpisode = async (ep) => {
    setEpisode(ep);
    setLoadingVideo(true);

    const res = await fetch(
      `https://drama-liart.vercel.app/video?slug=${slug}&ep=${ep}`
    );
    const data = await res.json();

    setVideoUrl(data?.video_url || "");
    setLoadingVideo(false);
  };

  useEffect(() => {
    if (detail?.total_episode) {
      loadEpisode(startEp);
    }
  }, [detail]);

  // ================= AUTO HIDE =================
  const triggerAutoHide = () => {
    setShowControl(true);

    if (hideTimeout.current) clearTimeout(hideTimeout.current);

    hideTimeout.current = setTimeout(() => {
      setShowControl(false);
    }, 3000);
  };

  // ================= PLAYER =================
  useEffect(() => {
    if (!videoUrl || !videoRef.current) return;

    const video = videoRef.current;

    video.pause();
    video.removeAttribute("src");
    video.load();

    if (videoUrl.includes(".m3u8") && Hls && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(videoUrl);
      hls.attachMedia(video);

      return () => hls.destroy();
    } else {
      video.src = videoUrl;
    }

    // 🔥 LOAD RESUME
    setTimeout(() => {
      const key = `progress_${slug}_${episode}`;
      const saved = localStorage.getItem(key);

      if (saved) {
        video.currentTime = parseFloat(saved);
      }
    }, 1000);

    triggerAutoHide();
  }, [videoUrl]);

  // ================= AUTO NEXT =================
  const handleEnded = () => {
    if (episode < detail.total_episode) {
      loadEpisode(episode + 1);
    }
  };

  // ================= SAVE HISTORY =================
  const saveHistory = () => {
    if (!slug) return;

    const key = "history_watch";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");

    const newItem = {
      slug,
      episode,
      time: videoRef.current?.currentTime || 0,
      updatedAt: Date.now(),
    };

    const filtered = existing.filter((i) => i.slug !== slug);
    filtered.unshift(newItem);

    localStorage.setItem(key, JSON.stringify(filtered.slice(0, 20)));
  };

  // ================= SAVE PROGRESS =================
  const saveProgress = () => {
    const video = videoRef.current;
    if (!video) return;

    const key = `progress_${slug}_${episode}`;
    localStorage.setItem(key, video.currentTime);

    saveHistory(); // 🔥 WAJIB
  };

  // auto save tiap 5 detik
  useEffect(() => {
    const interval = setInterval(saveProgress, 5000);
    return () => clearInterval(interval);
  }, [episode, videoUrl]);

  // save saat keluar
  useEffect(() => {
    const handleBeforeUnload = () => saveProgress();
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () =>
      window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [episode, videoUrl]);

  // ================= DOUBLE TAP =================
  const handleDoubleTap = (e) => {
    const now = Date.now();
    const diff = now - lastTap.current;

    if (diff < 300) {
      const video = videoRef.current;
      if (!video) return;

      const x = e.nativeEvent.offsetX;
      const width = video.clientWidth;

      if (x > width / 2) {
        video.currentTime += 10;
      } else {
        video.currentTime -= 10;
      }
    }

    lastTap.current = now;
  };

  // ================= SWIPE =================
  const handleTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].screenX;
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) < 50) return;

    if (diff > 0 && episode < detail.total_episode) {
      loadEpisode(episode + 1);
    } else if (diff < 0 && episode > 1) {
      loadEpisode(episode - 1);
    }
  };

  if (!detail) return <p style={{ padding: 20 }}>Loading...</p>;

  return (
    <div style={container}>
      <div style={playerWrapper}>
        {loadingVideo ? (
          <div style={loadingBox}>Loading...</div>
        ) : (
          <>
            <video
              ref={videoRef}
              controls
              autoPlay
              muted
              playsInline
              onEnded={handleEnded}
              onClick={(e) => {
                setShowControl((v) => !v);
                handleDoubleTap(e);
              }}
              onPlay={triggerAutoHide}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              style={videoStyle}
            />

            {/* OVERLAY CONTROL */}
            {showControl && (
              <div style={overlayControl}>
                <div style={controlInner}>
                  <button
                    disabled={episode === 1}
                    onClick={() => loadEpisode(episode - 1)}
                    style={navBtn}
                  >
                    ◀
                  </button>

                  <span style={episodeText}>
                    Ep {episode} / {detail.total_episode}
                  </span>

                  <button
                    disabled={episode === detail.total_episode}
                    onClick={() => loadEpisode(episode + 1)}
                    style={navBtn}
                  >
                    ▶
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <h2 style={{ marginTop: 20 }}>{detail.title}</h2>
    </div>
  );
}

/* STYLE */

const container = {
  background: "#0f0f0f",
  minHeight: "100vh",
  padding: 10,
  color: "white",
};

const playerWrapper = {
  position: "relative",
  maxWidth: 900,
  margin: "0 auto",
};

const videoStyle = {
  width: "100%",
  maxHeight: "80vh",
  objectFit: "contain",
  background: "black",
  borderRadius: 10,
};

const overlayControl = {
  position: "absolute",
  bottom: 60,
  left: 0,
  right: 0,
  display: "flex",
  justifyContent: "center",
};

const controlInner = {
  display: "flex",
  gap: 10,
  background: "rgba(0,0,0,0.6)",
  padding: "6px 12px",
  borderRadius: 999,
};

const navBtn = {
  background: "none",
  border: "none",
  color: "white",
  fontSize: 18,
};

const episodeText = {
  fontSize: 14,
};

const loadingBox = {
  height: 250,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};
