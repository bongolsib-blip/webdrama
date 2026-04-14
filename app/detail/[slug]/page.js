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

  const videoRef = useRef(null);

  // FETCH DETAIL
  useEffect(() => {
    fetch(`https://drama-liart.vercel.app/detail?slug=${slug}`)
      .then((r) => r.json())
      .then((r) => setDetail(r.data));
  }, [slug]);

  // AUTO PLAY FIRST EP
  useEffect(() => {
    if (!detail?.total_episode) return;
    loadEpisode(startEp || 1);
  }, [detail]);

  const loadEpisode = async (ep) => {
    if (!detail) return;

    setEpisode(ep);

    const res = await fetch(
      `https://drama-liart.vercel.app/video?slug=${slug}&ep=${ep}`
    );

    const data = await res.json();
    setVideoUrl(data.video_url);
  };

  // VIDEO LOAD
  useEffect(() => {
    if (!videoUrl || !videoRef.current) return;

    const video = videoRef.current;
    video.src = videoUrl;
    video.load();
    video.play().catch(() => {});
  }, [videoUrl]);

  // AUTO NEXT
  const handleEnd = () => {
    if (episode < detail.total_episode) {
      loadEpisode(episode + 1);
    }
  };

  if (!detail) {
    return (
      <div style={styles.loading}>
        Loading...
      </div>
    );
  }

  return (
    <div style={styles.page}>

      {/* HEADER */}
      <div style={styles.header}>
        <button onClick={() => router.back()} style={styles.btn}>
          ←
        </button>

        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={styles.title}>{detail.title}</div>
          <div style={styles.sub}>
            EP {episode} / {detail.total_episode}
          </div>
        </div>

        <button onClick={() => setShowList(true)} style={styles.btn}>
          ☰
        </button>
      </div>

      {/* VIDEO */}
      <video
        ref={videoRef}
        controls
        autoPlay
        onEnded={handleEnd}
        style={styles.video}
      />

      {/* CONTROL */}
      <div style={styles.control}>
        <button onClick={() => loadEpisode(episode - 1)}>◀</button>
        <span style={{ color: "white" }}>
          {episode}/{detail.total_episode}
        </span>
        <button onClick={() => loadEpisode(episode + 1)}>▶</button>
      </div>

      {/* EPISODE LIST */}
      {showList && (
        <div style={styles.overlay} onClick={() => setShowList(false)}>
          <div style={styles.sheet} onClick={(e) => e.stopPropagation()}>
            {Array.from({ length: detail.total_episode }).map((_, i) => {
              const ep = i + 1;

              return (
                <button
                  key={ep}
                  onClick={() => {
                    loadEpisode(ep);
                    setShowList(false);
                  }}
                  style={{
                    ...styles.epBtn,
                    background: ep === episode ? "red" : "#333",
                  }}
                >
                  {ep}
                </button>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

/* ================= STYLE ================= */

const styles = {
  page: {
    position: "fixed",
    inset: 0,
    background: "black",
    display: "flex",
    flexDirection: "column",
  },

  header: {
    height: 60,
    display: "flex",
    alignItems: "center",
    padding: 10,
    color: "white",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    background: "linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)",
  },

  btn: {
    background: "none",
    border: "none",
    color: "white",
    fontSize: 20,
  },

  title: {
    fontSize: 14,
    color: "white",
  },

  sub: {
    fontSize: 12,
    color: "#aaa",
  },

  video: {
    width: "100%",
    height: "100vh",
    objectFit: "contain",
    background: "black",
  },

  control: {
    position: "absolute",
    bottom: 20,
    width: "100%",
    display: "flex",
    justifyContent: "center",
    gap: 20,
    color: "white",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.8)",
    display: "flex",
    alignItems: "flex-end",
  },

  sheet: {
    width: "100%",
    maxHeight: "70vh",
    background: "#111",
    padding: 10,
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 10,
  },

  epBtn: {
    padding: 10,
    color: "white",
    border: "none",
    borderRadius: 6,
  },

  loading: {
    color: "white",
    background: "black",
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
};
