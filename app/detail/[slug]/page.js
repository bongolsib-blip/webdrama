"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function DetailPage() {
  const params = useParams();
  const slug = params?.slug;

  const [detail, setDetail] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [episode, setEpisode] = useState(1);
  const [loadingVideo, setLoadingVideo] = useState(false);

  // 🔥 LOAD DETAIL
  useEffect(() => {
    if (!slug) return;

    fetch(`https://drama-liart.vercel.app/detail?slug=${slug}`)
      .then((r) => r.json())
      .then((d) => setDetail(d.data));
  }, [slug]);

  // 🔥 LOAD EPISODE
  const loadEpisode = async (ep) => {
    setEpisode(ep);
    setLoadingVideo(true);

    const res = await fetch(
      `https://drama-liart.vercel.app/video?slug=${slug}&ep=${ep}`
    );
    const data = await res.json();

    setVideoUrl(data.video_url);
    setLoadingVideo(false);

    // 🔥 SIMPAN CONTINUE WATCHING
    localStorage.setItem(
      "continue",
      JSON.stringify([
        {
          slug,
          title: detail.title,
          thumbnail: detail.thumbnail,
        },
      ])
    );
  };

  // AUTO LOAD EP 1
  useEffect(() => {
    if (detail?.total_episode) {
      loadEpisode(1);
    }
  }, [detail]);

  // AUTO NEXT
  const handleEnded = () => {
    const next = episode + 1;
    if (detail?.total_episode && next <= detail.total_episode) {
      loadEpisode(next);
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
          videoUrl && (
            <video
              key={videoUrl}
              controls
              autoPlay
              onEnded={handleEnded}
              style={videoStyle}
            >
              <source src={videoUrl} />
            </video>
          )
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

      {/* EPISODE LIST */}
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
};

const loadingBox = {
  height: 300,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "#1a1a1a",
  borderRadius: 10,
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
