"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";

export default function DetailPage() {
  const params = useParams();
  const slug = params?.slug;

  const [detail, setDetail] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [episode, setEpisode] = useState(1);

  const videoRef = useRef(null);

  useEffect(() => {
    if (!slug) return;

    fetch(`https://drama-liart.vercel.app/detail?slug=${slug}`)
      .then((r) => r.json())
      .then((d) => {
        console.log("DETAIL:", d); // 🔥 debug
        setDetail(d.data);
      })
      .catch(console.error);
  }, [slug]);

  const loadEpisode = async (ep) => {
    setEpisode(ep);

    const res = await fetch(
      `https://drama-liart.vercel.app/video?slug=${slug}&ep=${ep}`
    );
    const data = await res.json();

    setVideoUrl(data.video_url);
    localStorage.setItem(
      "continue",
      JSON.stringify([
        {
          slug,
          thumbnail: detail.thumbnail,
          title: detail.title,
        },
      ])
    );
  };

  const handleEnded = () => {
    const next = episode + 1;
    if (detail?.total_episode && next <= detail.total_episode) {
      loadEpisode(next);
    }
  };

  if (!detail) return <p className="p-5">Loading...</p>;

  return (
    <div className="p-5">
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
          key={videoUrl}
          ref={videoRef}
          controls
          autoPlay
          onEnded={handleEnded}
          className="w-full"
        >
          <source src={videoUrl} />
        </video>
      )}
    </div>
  );
}
