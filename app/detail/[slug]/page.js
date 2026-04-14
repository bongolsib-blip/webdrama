"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Hls from "hls.js";

export default function DetailPage() {
  const params = useParams();
  const slug = params?.slug;

  const [detail, setDetail] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [episode, setEpisode] = useState(1);
  const [loadingVideo, setLoadingVideo] = useState(false);

  const videoRef = useRef(null);

  // ================= LOAD DETAIL =================
  useEffect(() => {
    if (!slug) return;

    fetch(`https://drama-liart.vercel.app/detail?slug=${slug}`)
      .then((r) => r.json())
      .then((d) => setDetail(d.data));
  }, [slug]);

  // ================= LOAD EPISODE =================
  const loadEpisode = async (ep) => {
    setEpisode(ep);
    setLoadingVideo(true);

    const res = await fetch(
      `https://drama-liart.vercel.app/video?slug=${slug}&ep=${ep}`
    );
    const data = await res.json();

    setVideoUrl(data.video_url);
    setLoadingVideo(false);
  };

  // ================= AUTO LOAD EP1 =================
  useEffect(() => {
    if (detail?.total_episode) {
      loadEpisode(1);
    }
  }, [detail]);

  // ================= HLS PLAYER =================
  useEffect(() => {
    if (!videoUrl || !videoRef.current) return;

    const video = videoRef.current;

    video.pause();
    video.removeAttribute("src");
    video.load();

    if (videoUrl.includes(".m3u8")) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(videoUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });

        return () => hls.destroy();
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = videoUrl;
        video.play().catch(() => {});
      }
    } else {
      video.src = videoUrl;
      video.play().catch(() => {});
    }
  }, [videoUrl]);

  // ================= AUTO NEXT =================
  const handleEnded = () => {
    if (episode < detail.total_episode) {
      loadEpisode(episode + 1);
    }
  };

  if (!detail) return <p style={{ padding: 20 }}>Loading...</p>;

  return (
    <div style={container}>
      
      {/* PLAYER */}
      <div style={playerWrapper}>
        {loadingVideo ? (
          <div style={loadingBox}>Loading video...</div>
        ) : (
          <>
            <video
              ref={videoRef}
              controls
              autoPlay
              onEnded={handleEnded}
              style={videoStyle}
            />

            {/* 🎬 PLAYER CONTROL BAR */}
            <div style={controlBar}>
              <button
                disabled={episode === 1}
                onClick={() => loadEpisode(episode - 1)}
                style={btnControl}
              >
                ⏮ Prev
              </button>

              <span style={episodeInfo}>
                Episode {episode} / {detail.total_episode}
              </span>

              <button
                disabled={episode === detail.total_episode}
                onClick={() => loadEpisode(episode + 1)}
                style={btnControl}
              >
                Next ⏭
              </button>
            </div>
          </>
        )}
      </div>

      {/* INFO */}
      <div style={infoWrapper}>
        <img src={detail.thumbnail} style={posterStyle} />

        <div>
          <h1>{detail.title}</h1>

          <p style={{ color: "#aaa", marginTop: 10 }}>
            {detail.description}
          </p>

          <div style={{ marginTop: 10 }}>
            {detail.tags?.map((tag, i) => (
              <span key={i} style={tagStyle}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* EPISODES */}
      <div style={{ marginTop: 30 }}>
        <h3>Episodes</h3>

        <div style={episodeGrid}>
          {Array.from({ length: detail.total_episode || 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => loadEpisode(i + 1)}
              style={{
                ...episodeBtn,
                background:
                  episode === i + 1 ? "#e50914" : "#1a1a1a",
              }}
            >
              EP {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================= STYLE ================= */

const container = {
  background: "#0f0f0f",
  color: "white",
  minHeight: "100vh",
  padding: 20,
};

const playerWrapper = {
  width: "100%",
  maxWidth: 900,
  margin: "auto",
};

const videoStyle = {
  width: "100%",
  borderRadius: 10,
  background: "black",
};

const loadingBox = {
  height: 300,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "#1a1a1a",
  borderRadius: 10,
};

const controlBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 10,
};

const btnControl = {
  padding: "8px 12px",
  background: "#e50914",
  border: "none",
  color: "white",
  borderRadius: 6,
  cursor: "pointer",
};

const episodeInfo = {
  fontSize: 14,
  color: "#ccc",
};

const infoWrapper = {
  display: "flex",
  gap: 20,
  marginTop: 20,
};

const posterStyle = {
  width: 150,
  borderRadius: 10,
};

const tagStyle = {
  background: "#222",
  padding: "4px 8px",
  borderRadius: 5,
  marginRight: 5,
  fontSize: 12,
};

const episodeGrid = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
};

const episodeBtn = {
  padding: "8px 12px",
  border: "none",
  color: "white",
  borderRadius: 6,
  cursor: "pointer",
};
