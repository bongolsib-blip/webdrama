"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [items, setItems] = useState([]);
  const [featured, setFeatured] = useState(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [q, setQ] = useState("");
  const [isSearch, setIsSearch] = useState(false);

  const loadList = async (p = 1) => {
    const res = await fetch(
      `https://drama-liart.vercel.app/list?page=${p}`
    );
    const data = await res.json();

    const list = data?.data?.items || [];

    setItems(list);
    setFeatured(list[0]); // 🔥 hero ambil item pertama
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
    setFeatured(data.items?.[0]);
    setHasNext(false);
  };

  useEffect(() => {
    if (!isSearch) loadList(page);
  }, [page, isSearch]);

  return (
    <div style={{ background: "#0f0f0f", color: "white", minHeight: "100vh" }}>

      {/* HEADER */}
      <div style={headerStyle}>
        <h1 style={{ fontSize: 24 }}>🎬 DramaFlix</h1>

        <div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search..."
            style={searchInput}
          />
          <button onClick={handleSearch} style={btnPrimary}>
            Search
          </button>
        </div>
      </div>

      {/* HERO */}
      {featured && (
        <div style={heroStyle}>
          <img src={featured.thumbnail} style={heroImg} />

          <div style={heroOverlay}>
            <h2 style={{ fontSize: 28 }}>{featured.title}</h2>

            <Link href={`/detail/${featured.slug}`}>
              <button style={btnPlay}>▶ Play</button>
            </Link>
          </div>
        </div>
      )}

      {/* GRID */}
      <div style={{ padding: 20 }}>
        <h2 style={{ marginBottom: 10 }}>Popular Drama</h2>

        <div style={gridStyle}>
          {items.map((item, i) => (
            <Link key={i} href={`/detail/${item.slug}`} style={{ textDecoration: "none" }}>
              <div
                style={cardStyle}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "scale(1.05)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
              >
                <div style={{ position: "relative" }}>
                  <img src={item.thumbnail} style={imgStyle} />

                  {/* PLAY OVERLAY */}
                  <div style={hoverOverlay}>
                    ▶
                  </div>
                </div>

                <div style={{ padding: 10 }}>
                  <p style={titleStyle}>{item.title}</p>

                  {item.episode_badge && (
                    <span style={badgeStyle}>
                      {item.episode_badge}
                    </span>
                  )}
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

const headerStyle = {
  padding: 20,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: "1px solid #222",
};

const searchInput = {
  padding: 8,
  borderRadius: 6,
  border: "none",
  marginRight: 10,
};

const heroStyle = {
  position: "relative",
  height: 300,
};

const heroImg = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const heroOverlay = {
  position: "absolute",
  bottom: 20,
  left: 20,
};

const btnPlay = {
  marginTop: 10,
  padding: "10px 20px",
  background: "#e50914",
  border: "none",
  color: "white",
  borderRadius: 6,
  cursor: "pointer",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
  gap: 15,
};

const cardStyle = {
  borderRadius: 10,
  overflow: "hidden",
  background: "#1a1a1a",
  transition: "0.2s",
};

const imgStyle = {
  width: "100%",
  height: 250,
  objectFit: "cover",
};

const hoverOverlay = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.5)",
  color: "white",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontSize: 30,
  opacity: 0,
  transition: "0.2s",
};

const titleStyle = {
  fontSize: 14,
  color: "#fff",
};

const badgeStyle = {
  fontSize: 12,
  background: "#e50914",
  padding: "2px 6px",
  borderRadius: 4,
};

const btnPrimary = {
  padding: "8px 12px",
  background: "#e50914",
  color: "white",
  border: "none",
  borderRadius: 6,
};

const btnSecondary = {
  padding: "8px 12px",
  background: "#222",
  color: "white",
  border: "none",
  borderRadius: 6,
};
