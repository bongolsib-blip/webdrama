"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

let Hls;
if (typeof window !== "undefined") {
  Hls = require("hls.js");
}

export default function DetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const slug = params?.slug;
  const startEp = parseInt(searchParams.get("ep") || "1");

  const [detail, setDetail] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [episode, setEpisode] = useState(startEp);

  const [loadingVideo, setLoadingVideo] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [showControl, setShowControl] = useState(true);
  const [showEpisodeList, setShowEpisodeList] = useState(false);

  const videoRef = useRef(null);
  const hideTimeout = useRef(null);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // ================= LOAD DETAIL =================
  useEffect(() => {
    fetch(`https://drama-liart.vercel.app/detail?slug=${slug}`)
      .then((r) => r.json())
      .then((d) => setDetail(d?.data));
  }, [slug]);

  // ================= AUTO PLAY FIRST EP =================
  useEffect(() => {
    if (!detail?.total_episode) return;

    const ep = startEp || 1;
    loadEpisode(ep);
  }, [detail]);

  // ================= LOAD EPISODE =================
  const loadEpisode = async (ep) => {
    if (!detail?.total_episode) return;
    if (ep < 1 || ep > detail.total_episode) return;

    setEpisode(ep);
    setLoadingVideo(true);
    setShowEpisodeList(false);

    const res = await fetch(
      `https://drama-liart.vercel.app/video?slug=${slug}&ep=${ep}`
    );
    const data = await res.json();

    setVideoUrl(data.video_url);
    setLoadingVideo(false);
  };

  // ================= PLAYER =================
  useEffect(() => {
    if (!videoUrl || !videoRef.current) return;

    const video = videoRef.current;

    video.pause();
    video.removeAttribute("src");
    video.load();

    if (videoUrl.includes(".m3u8") && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(videoUrl);
      hls.attachMedia(video);
      return () => hls.destroy();
    } else {
      video.src = videoUrl;
    }

    video.play().catch(() => {});
    triggerAutoHide();
  }, [videoUrl]);

  // ================= AUTO HIDE UI =================
  const triggerAutoHide = () => {
    if (showEpisodeList) return;

    setShowHeader(true);
    setShowControl(true);

    if (hideTimeout.current) clearTimeout(hideTimeout.current);

    hideTimeout.current = setTimeout(() => {
      setShowHeader(false);
      setShowControl(false);
    }, 3000);
  };

  // ================= SWIPE =================
  const handleTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].screenX;
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) < 50) return;

    if (diff > 0) {
      loadEpisode(episode + 1);
    } else {
      loadEpisode(episode - 1);
    }
  };

  if (!detail) return <p style={{ padding: 20 }}>Loading...</p>;

  return (
    <div style={container}>
      <div style={playerWrapper}>

        {/* HEADER */}
        <div
          style={{
            ...topBar,
            opacity: showHeader ? 1 : 0,
            transform: showHeader ? "translateY(0)" : "translateY(-20px)",
            transition: "all 0.3s",
            pointerEvents: showHeader ? "auto" : "none",
          }}
        >
          <div style={topGradient}></div>

          <div style={topContent}>
            <button onClick={() => router.back()} style={btn}>
              ◀
            </button>

            <div style={titleBox}>
              <p style={title}>{detail.title}</p>
              <span style={episodeText}>EP {episode}</span>
            </div>

            <button
              onClick={() => setShowEpisodeList(true)}
              style={btn}
            >
              ☰
            </button>
          </div>
        </div>

        {/* VIDEO */}
        {loadingVideo ? (
          <div style={loading}>Loading...</div>
        ) : (
          <video
            ref={videoRef}
            controls
            autoPlay
            playsInline
            onClick={() => {
              setShowHeader((v) => !v);
              setShowControl((v) => !v);
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={video}
          />
        )}

        {/* CONTROL */}
        {showControl && (
          <div style={bottomControl}>
            <button onClick={() => loadEpisode(episode - 1)}>
              ◀
            </button>

            <span>
              {episode}/{detail.total_episode}
            </span>

            <button onClick={() => loadEpisode(episode + 1)}>
              ▶
            </button>
          </div>
        )}
      </div>

      {/* ================= EPISODE NETFLIX SHEET ================= */}
      {showEpisodeList && (
        <div
          style={episodeOverlay}
          onClick={() => setShowEpisodeList(false)}
        >
          <div
            style={episodeBox}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: "white" }}>Pilih Episode</h3>

            <div style={episodeGrid}>
              {Array.from({ length: detail.total_episode }).map((_, i) => {
                const ep = i + 1;

                return (
                  <button
                    key={ep}
                    onClick={(e) => {
                      e.stopPropagation();
                      loadEpisode(ep);
                      setShowEpisodeList(false);
                    }}
                    style={{
                      ...episodeBtn,
                      background:
                        ep === episode ? "#e50914" : "#2a2a2a",
                      transform:
                        ep === episode ? "scale(1.05)" : "scale(1)",
                    }}
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

/* ================= STYLE ================= */

const container = {
  background: "#000",
  minHeight: "100vh",
};

const playerWrapper = {
  position: "relative",
  maxWidth: 900,
  margin: "0 auto",
};

const video = {
  width: "100%",
  height: "calc(100vh - 10px)", // 🔥 almost fullscreen
  objectFit: "contain", // 🔥 fix portrait
  background: "black",
};

const loading = {
  height: "80vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  color: "white",
};

/* HEADER */

const topBar = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: 60,
  zIndex: 50,
};

const topGradient = {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(to bottom, black, transparent)",
};

const topContent = {
  display: "flex",
  alignItems: "center",
  padding: 10,
  color: "white",
};

const btn = {
  background: "none",
  border: "none",
  color: "white",
  fontSize: 18,
};

const titleBox = {
  flex: 1,
  textAlign: "center",
};

const title = {
  fontSize: 14,
};

const episodeText = {
  fontSize: 11,
};

/* CONTROL */

const bottomControl = {
  position: "absolute",
  bottom: 20,
  width: "100%",
  display: "flex",
  justifyContent: "center",
  gap: 10,
  color: "white",
  zIndex: 50,
};

/* EPISODE NETFLIX SHEET */

const episodeOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  zIndex: 999999,
  display: "flex",
  alignItems: "flex-end",
};

const episodeBox = {
  width: "100%",
  maxHeight: "75vh",
  background: "#141414",
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  padding: 16,
  overflowY: "auto",
};

const episodeGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: 10,
  marginTop: 10,
};

const episodeBtn = {
  padding: 12,
  borderRadius: 8,
  border: "none",
  color: "white",
  cursor: "pointer",
  transition: "0.2s",
};
