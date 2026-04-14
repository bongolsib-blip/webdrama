"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  // ================= LOAD DATA =================
  const fetchData = async (p = 1) => {
    setLoading(true);

    const res = await fetch(
      `https://drama-liart.vercel.app/list?page=${p}`
    );
    const data = await res.json();

    const newItems = data.data?.items || [];

    if (p === 1) setItems(newItems);
    else setItems((prev) => [...prev, ...newItems]);

    setLoading(false);
  };

  useEffect(() => {
    fetchData(1);
  }, []);

  // ================= INFINITE SCROLL FIX =================
  useEffect(() => {
    const handleScroll = () => {
      if (loading || selected) return; // 🔥 disable saat modal buka

      if (
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 200
      ) {
        const next = page + 1;
        setPage(next);
        fetchData(next);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [page, loading, selected]);

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

      {loading && <p style={{ textAlign: "center" }}>Loading...</p>}

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

                <p style={desc}>{detail.description}</p>

                <p>Total Episode: {detail.total_episode}</p>

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

/* MODAL FIX 🔥 */

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.85)",
  overflowY: "auto", // 🔥 scroll fix
  zIndex: 1000,
  padding: 20,
};

const modalBox = {
  background: "#111",
  padding: 20,
  borderRadius: 12,
  maxWidth: 500,
  margin: "40px auto", // 🔥 center + scroll friendly
};

const modalImg = {
  width: "100%",
  borderRadius: 10,
  marginBottom: 10,
};

const desc = {
  opacity: 0.8,
  maxHeight: 150,
  overflowY: "auto", // 🔥 scroll description
};

const btnGroup = {
  display: "flex",
  gap: 10,
  marginTop: 15,
  position: "sticky",
  bottom: 0,
  background: "#111",
  paddingTop: 10,
};

const playBtn = {
  flex: 1,
  padding: 12,
  background: "#e50914",
  color: "white",
  border: "none",
  borderRadius: 8,
};

const closeBtn = {
  flex: 1,
  padding: 12,
  background: "#333",
  color: "white",
  border: "none",
  borderRadius: 8,
};
