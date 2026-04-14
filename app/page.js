"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";

export default function Home() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [isSearch, setIsSearch] = useState(false);

  const observer = useRef();

  // 🔥 LOAD DATA
  const loadList = async (p = 1) => {
    if (loading || !hasNext) return;

    setLoading(true);

    const res = await fetch(
      `https://drama-liart.vercel.app/list?page=${p}`
    );
    const data = await res.json();

    const newItems = data?.data?.items || [];

    setItems((prev) => [...prev, ...newItems]);
    setHasNext(data?.data?.has_next || false);
    setLoading(false);
  };

  // 🔥 SEARCH
  const handleSearch = async () => {
    if (!q) {
      setIsSearch(false);
      setItems([]);
      setPage(1);
      setHasNext(true);
      return loadList(1);
    }

    setIsSearch(true);
    setLoading(true);

    const res = await fetch(
      `https://drama-liart.vercel.app/search?q=${q}`
    );
    const data = await res.json();

    setItems(data.items || []);
    setHasNext(false);
    setLoading(false);
  };

  // 🔥 OBSERVER (AUTO LOAD)
  const lastItemRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNext && !isSearch) {
          setPage((prev) => prev + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasNext, isSearch]
  );

  useEffect(() => {
    if (!isSearch) {
      loadList(page);
    }
  }, [page, isSearch]);

  return (
    <div style={{ background: "#0f0f0f", minHeight: "100vh", color: "white" }}>
      
      {/* HEADER */}
      <div style={headerStyle}>
        <h1>🎬 DramaFlix</h1>

        <div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search drama..."
            style={searchInput}
          />
          <button onClick={handleSearch} style={btnPrimary}>
            Search
          </button>
          <button
            onClick={() => {
              setQ("");
              setIsSearch(false);
              setItems([]);
              setPage(1);
              setHasNext(true);
              loadList(1);
            }}
            style={btnSecondary}
          >
            Reset
          </button>
        </div>
      </div>

      {/* GRID */}
      <div style={{ padding: 20 }}>
        <div style={gridStyle}>
          {items.map((item, i) => {
            if (items.length === i + 1) {
              return (
                <Link
                  ref={lastItemRef}
                  key={i}
                  href={`/detail/${item.slug}`}
                  style={{ textDecoration: "none" }}
                >
                  <Card item={item} />
                </Link>
              );
            }

            return (
              <Link
                key={i}
                href={`/detail/${item.slug}`}
                style={{ textDecoration: "none" }}
              >
                <Card item={item} />
              </Link>
            );
          })}
        </div>

        {/* LOADING */}
        {loading && (
          <p style={{ textAlign: "center", marginTop: 20 }}>
            Loading...
          </p>
        )}

        {!hasNext && !isSearch && (
          <p style={{ textAlign: "center", marginTop: 20 }}>
            🎉 Semua data sudah ditampilkan
          </p>
        )}
      </div>
    </div>
  );
}

/* ================= CARD ================= */

function Card({ item }) {
  return (
    <div
      style={cardStyle}
      onMouseEnter={(e) =>
        (e.currentTarget.style.transform = "scale(1.05)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.transform = "scale(1)")
      }
    >
      <img src={item.thumbnail} style={imgStyle} />

      <div style={{ padding: 10 }}>
        <p style={titleStyle}>{item.title}</p>

        {item.episode_badge && (
          <span style={badgeStyle}>{item.episode_badge}</span>
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
  borderBottom: "1px solid #222",
};

const searchInput = {
  padding: 8,
  borderRadius: 6,
  border: "none",
  marginRight: 10,
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
