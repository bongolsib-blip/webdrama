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

  // LOAD DETAIL
  useEffect(() => {
    if (!slug) return;

    fetch(`https://drama-liart.vercel.app/detail?slug=${slug}`)
      .then((r) => r.json())
      .then((d) => setDetail(d.data));
  }, [slug]);

  // LOAD EPISODE
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

  useEffect(() => {
    if (detail?.total_episode) {
      loadEpisode(1);
    }
  }, [detail]);

  // HLS PLAYER
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

            {/* CONTROL */}
            <div style={controlBar}>
              <button
                disabled={episode === 1}
                onClick={() => loadEpisode(episode - 1)}
                style={btnControl}
              >
                ⏮
              </button>

              <span style={episodeInfo}>
                EP {episode}/{detail.total_episode}
              </span>

              <button
                disabled={episode === detail.total_episode}
                onClick={() => loadEpisode(episode + 1)}
                style={btnControl}
              >
                ⏭
              </button>
            </div>
          </>
        )}
      </div>

      {/* INFO */}
      <div style={infoWrapper}>
        <img src={detail.thumbnail} style={posterStyle} />

        <div>
          <h2>{detail.title}</h2>

          <p style={descStyle}>{detail.description}</p>

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
      <div style={{ marginTop: 25 }}>
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
              {i + 1}
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
  padding: "10px",
};

/* PLAYER */
const playerWrapper = {
  width: "100%",
};

const videoStyle = {
  width: "100%",
  borderRadius: 10,
  background: "black",
};

/* CONTROL */
const controlBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 8,
};

const btnControl = {
  padding: "10px",
  background: "#e50914",
  border: "none",
  color: "white",
  borderRadius: 8,
  fontSize: 16,
};

const episodeInfo = {
  fontSize: 14,
  color: "#ccc",
};

/* INFO */
const infoWrapper = {
  display: "flex",
  flexDirection: "column", // 🔥 mobile default
  gap: 15,
  marginTop: 15,
};

const posterStyle = {
  width: "100%",
  maxWidth: 200,
  borderRadius: 10,
};

const descStyle = {
  fontSize: 14,
  color: "#aaa",
  marginTop: 8,
};

const tagStyle = {
  background: "#222",
  padding: "4px 8px",
  borderRadius: 5,
  marginRight: 5,
  fontSize: 12,
};

/* EPISODE */
const episodeGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(50px, 1fr))",
  gap: 8,
};

const episodeBtn = {
  padding: "10px",
  border: "none",
  color: "white",
  borderRadius: 6,
};
const loadingBox = {
  height: 250,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "#1a1a1a",
  borderRadius: 10,
  color: "#aaa",
};
