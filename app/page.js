"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [q, setQ] = useState("");
  const [isSearch, setIsSearch] = useState(false);

  const loadList = async (p = 1) => {
    const res = await fetch(
      `https://drama-liart.vercel.app/list?page=${p}`
    );
    const data = await res.json();

    setItems(data?.data?.items || []);
    setHasNext(data?.data?.has_next || false);
  };

  const handleSearch = async () => {
    if (!q) {
      setIsSearch(false);
      setPage(1);
      return loadList(1);
    }

    setIsSearch(true);

    const res = await fetch(
      `https://drama-liart.vercel.app/search?q=${q}`
    );
    const data = await res.json();

    setItems(data.items || []);
    setHasNext(false);
  };

  useEffect(() => {
    if (!isSearch) loadList(page);
  }, [page, isSearch]);

  return (
    <div style={{ background: "#0f0f0f", minHeight: "100vh", color: "white" }}>
      
      {/* HEADER */}
      <div style={{
        padding: "20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #222"
      }}>
        <h1 style={{ fontSize: 24, fontWeight: "bold" }}>
          🎬 DramaFlix
        </h1>

        {/* SEARCH */}
        <div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search drama..."
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: "none",
              outline: "none",
              marginRight: 10
            }}
          />
          <button onClick={handleSearch} style={btnPrimary}>
            Search
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ padding: 20 }}>

        {/* GRID */}
        <div style={gridStyle}>
          {items.map((item, i) => (
            <Link key={i} href={`/detail/${item.slug}`}>
              <div style={cardStyle}>
                <img
                  src={item.thumbnail}
                  style={imgStyle}
                />

                <div style={overlayStyle}>
                  <p style={{ fontSize: 14 }}>{item.title}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* PAGINATION */}
        {!isSearch && (
          <div style={{ marginTop: 30, textAlign: "center" }}>
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              style={btnSecondary}
            >
              ⬅ Prev
            </button>

            <span style={{ margin: "0 15px" }}>Page {page}</span>

            <button
              disabled={!hasNext}
              onClick={() => setPage((p) => p + 1)}
              style={btnSecondary}
            >
              Next ➡
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= STYLE ================= */

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
  gap: 15,
};

const cardStyle = {
  position: "relative",
  borderRadius: 10,
  overflow: "hidden",
  cursor: "pointer",
  transition: "transform 0.2s",
};

const imgStyle = {
  width: "100%",
  height: "260px",
  objectFit: "cover",
};

const overlayStyle = {
  position: "absolute",
  bottom: 0,
  width: "100%",
  background: "linear-gradient(to top, rgba(0,0,0,0.9), transparent)",
  padding: 10,
};

const btnPrimary = {
  padding: "8px 12px",
  background: "#e50914",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

const btnSecondary = {
  padding: "8px 12px",
  background: "#222",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};
