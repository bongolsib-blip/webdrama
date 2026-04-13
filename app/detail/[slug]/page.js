
"use client";

import { useEffect, useState, useRef } from "react";

export default function DetailPage({ params }) {
  const { slug } = params;

  const [detail, setDetail] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [episode, setEpisode] = useState(1);

  const videoRef = useRef(null);

  useEffect(() => {
    fetch(`https://drama-liart.vercel.app/detail?slug=${slug}`)
      .then(r => r.json())
      .then(d => setDetail(d.data));
  }, [slug]);

  const loadEpisode = async (ep) => {
    setEpisode(ep);

    const res = await fetch(`https://drama-liart.vercel.app/video?slug=${slug}&ep=${ep}`);
    const data = await res.json();

    setVideoUrl(data.video_url);
  };

  const handleEnded = () => {
    const next = episode + 1;
    if (detail?.total_episode && next <= detail.total_episode) {
      loadEpisode(next);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      {!detail ? (
        <p>Loading...</p>
      ) : (
        <>
          <h1>{detail.title}</h1>
          <img src={detail.thumbnail} width="200" />

          <p>{detail.description}</p>

          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {Array.from({ length: detail.total_episode || 1 }).map((_, i) => (
              <button key={i} onClick={() => loadEpisode(i + 1)}>
                EP {i + 1}
              </button>
            ))}
          </div>

          {videoUrl && (
            <video
              ref={videoRef}
              controls
              autoPlay
              onEnded={handleEnded}
              style={{ width: "100%", marginTop: 20 }}
            >
              <source src={videoUrl} />
            </video>
          )}
        </>
      )}
    </div>
  );
}
