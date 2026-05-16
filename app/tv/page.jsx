'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

const API_KEY = 'ztatv_8ef9a9b28e724cbbd87f068510228c4fd54e3925';
const BASE = 'https://api.nexoratv.qzz.io/api';

export default function Home() {
  const [channels, setChannels] = useState([]);
  const [selected, setSelected] = useState(null);

  const videoRef = useRef(null);

  useEffect(() => {
    async function loadChannels() {
      const res = await fetch(
        `${BASE}/v1/channels`,
        {
          headers: {
            'x-api-key': API_KEY,
          },
        }
      );

      const data = await res.json();

      setChannels(data.data || []);
    }

    loadChannels();
  }, []);

  useEffect(() => {
    if (!selected) return;

    const video = videoRef.current;

    const hlsStream =
      selected.streams.find(
        s => s.stream_type === 'hls'
      ) || selected.streams[0];

    if (!hlsStream) return;

    const streamUrl =
      BASE + hlsStream.stream_url;

    let hls;

    if (Hls.isSupported()) {
      hls = new Hls({
        xhrSetup: xhr => {
          xhr.setRequestHeader(
            'x-api-key',
            API_KEY
          );
        },
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);
    } else {
      video.src = streamUrl;
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [selected]);

  return (
    <main className="min-h-screen bg-black text-white p-5">
      <h1 className="text-3xl font-bold mb-5">
        Zentara TV
      </h1>

      {selected && (
        <video
          ref={videoRef}
          controls
          autoPlay
          className="w-full rounded-xl mb-6"
        />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {channels.map(channel => (
          <button
            key={channel.id}
            onClick={() => setSelected(channel)}
            className="bg-zinc-900 rounded-xl overflow-hidden"
          >
            <img
              src={channel.logo}
              alt={channel.name}
              className="w-full h-28 object-cover"
            />

            <div className="p-3 text-sm">
              {channel.name}
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}
