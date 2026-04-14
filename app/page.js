"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  // ================= LOAD LIST =================
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const res = await fetch(
      "https://drama-liart.vercel.app/list?page=1"
    );
    const data = await res.json();

    setItems(data.data?.items || []);
    setLoading(false);
  };

  // ================= OPEN MODAL =================
  const openDetail = async (item) => {
    setSelected(item);
    setDetail(null);

    const res = await fetch(
      `https://drama-liart.vercel.app/detail?slug=${item.slug}`
    );
    const data = await res.json();

    setDetail(data.data);
  };

  return (
    <div style={container}>
      <h1 style={title}>🎬 Drama Streaming</h1>

      {/* GRID */}
      <div style={gridStyle}>
        {items.map((item, i) => (
          <div key={i} onClick={() => openDetail(item)} style={cardStyle}>
            <img src={item.thumbnail} style={imageStyle} />
            <p style={titleStyle}>{item.title}</p>
          </div>
        ))}
      </div>

      {loading && <p>Loading...</p>}

      {/* MODAL */}
      {selected && (
        <div style={modalOverlay} onClick={() => setSelected(null)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            
            {!detail ? (
              <p>Loading detail...</p>
            ) : (
              <>
                <img src={detail.thumbnail} style={modalImg} />

                <h2>{detail.title}</h2>

                <p style={{ opacity: 0.8 }}>
                  {detail.description}
                </p>

                <p style={{ marginTop: 10 }}>
                  Total Episode: {detail.total_episode}
                </p>

                <div style={btnGroup}>
                  <Link href={`/detail/${selected.slug}`}>
                    <button style={playBtn}>▶ Tonton</button>
                  </Link>

                  <button
                    onClick={() => setSelected(null)}
                    style={closeBtn}
                  >
                    Tutup
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* STYLE */

const container = {
  padding: 15,
  background: "#0f0f0f",
  minHeight: "100vh",
  color: "white",
};

const title = {
  fontSize: 24,
  marginBottom: 15,
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
  gap: 12,
};

const cardStyle = {
  cursor: "pointer",
};

const imageStyle = {
  width: "100%",
  borderRadius: 10,
  aspectRatio: "2/3",
  objectFit: "cover",
};

const titleStyle = {
  marginTop: 6,
  fontSize: 13,
  color: "#ddd",
};

/* MODAL */

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.8)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalBox = {
  background: "#111",
  padding: 20,
  borderRadius: 12,
  maxWidth: 400,
  width: "90%",
};

const modalImg = {
  width: "100%",
  borderRadius: 10,
  marginBottom: 10,
};

const btnGroup = {
  display: "flex",
  gap: 10,
  marginTop: 15,
};

const playBtn = {
  flex: 1,
  padding: 10,
  background: "#e50914",
  color: "white",
  border: "none",
  borderRadius: 8,
};

const closeBtn = {
  flex: 1,
  padding: 10,
  background: "#333",
  color: "white",
  border: "none",
  borderRadius: 8,
};
