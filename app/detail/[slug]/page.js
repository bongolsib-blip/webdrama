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
  const [showEpisodeList, setShowEpisodeList] = useState(false);

  const videoRef = useRef(null);

  // ================= FETCH DETAIL =================
  useEffect(() => {
    fetch(`https://drama-liart.vercel.app/detail?slug=${slug}`)
      .then((res) => res.json())
      .then((res) => setDetail(res.data));
  }, [slug]);

  // ================= AUTO PLAY FIRST EP =================
  useEffect(() => {
    if (!detail?.total_episode) return;
    loadEpisode(startEp || 1);
  }, [detail]);

  // ================= LOAD EPISODE =================
  const loadEpisode = async (ep) => {
    if (!detail) return;
    if (ep < 1 || ep > detail.total_episode) return;

    setEpisode(ep);

    const res = await fetch(
      `https://drama-liart.vercel.app/video?slug=${slug}&ep=${ep}`
    );

    const data = await res.json();
    setVideoUrl(data.video_url);
  };

  // ================= VIDEO HANDLER =================
  useEffect(() => {
    if (!videoUrl || !videoRef.current) return;

    const video = videoRef.current;

    video.pause();
    video.src = videoUrl;
    video.load();

    video.play().catch(() => {});
  }, [videoUrl]);

  // ================= AUTO NEXT EPISODE =================
  const handleEnded = () => {
    if (!detail) return;

    if (episode < detail.total_episode) {
      loadEpisode(episode + 1);
    }
  };

  if (!detail) {
    return (
      <div className="fixed inset-0 bg-black text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <main className="fixed inset-0 bg-black flex flex-col">

      {/* ================= HEADER ================= */}
      <div className="absolute top-0 left-0 right-0 z-40 h-16 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/50 to-transparent" />

        <div className="relative z-10 flex items-center justify-between h-full px-4 pointer-events-auto">

          <button onClick={() => router.back()} className="text-white text-xl">
            ←
          </button>

          <div className="text-center flex-1">
            <h1 className="text-white text-sm truncate">
              {detail.title}
            </h1>
            <p className="text-white/70 text-xs">
              EP {episode} / {detail.total_episode}
            </p>
          </div>

          <button
            onClick={() => setShowEpisodeList(true)}
            className="text-white text-xl"
          >
            ☰
          </button>

        </div>
      </div>

      {/* ================= VIDEO ================= */}
      <div className="flex-1 flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          controls
          autoPlay
          playsInline
          onEnded={handleEnded}   // 🔥 AUTO NEXT HERE
          className="w-full h-full object-contain"
        />
      </div>

      {/* ================= CONTROL ================= */}
      <div className="absolute bottom-10 left-0 right-0 z-40 flex justify-center pointer-events-none">
        <div className="flex items-center gap-4 bg-black/60 px-4 py-2 rounded-full pointer-events-auto">

          <button
            onClick={() => loadEpisode(episode - 1)}
            disabled={episode === 1}
            className="text-white disabled:opacity-30"
          >
            ◀
          </button>

          <span className="text-white text-sm">
            Ep {episode} / {detail.total_episode}
          </span>

          <button
            onClick={() => loadEpisode(episode + 1)}
            disabled={episode === detail.total_episode}
            className="text-white disabled:opacity-30"
          >
            ▶
          </button>

        </div>
      </div>

      {/* ================= EPISODE LIST ================= */}
      {showEpisodeList && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-end"
          onClick={() => setShowEpisodeList(false)}
        >
          <div
            className="w-full max-h-[75vh] bg-[#141414] rounded-t-2xl p-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >

            <h2 className="text-white mb-3 text-lg">
              Pilih Episode
            </h2>

            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: detail.total_episode }).map((_, i) => {
                const ep = i + 1;

                return (
                  <button
                    key={ep}
                    onClick={() => {
                      loadEpisode(ep);
                      setShowEpisodeList(false);
                    }}
                    className={`p-2 rounded text-white text-sm ${
                      ep === episode
                        ? "bg-red-600"
                        : "bg-gray-800 hover:bg-gray-700"
                    }`}
                  >
                    {ep}
                  </button>
                );
              })}
            </div>

          </div>
        </div>
      )}

    </main>
  );
}
