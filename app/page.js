"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  // ================= LOAD LIST =================
  const loadData = async (p = 1) => {
    setLoading(true);

    const res = await fetch(
      `https://drama-liart.vercel.app/list?page=${p}`
    );

    const json = await res.json();

    setItems((prev) => [...prev, ...(json.data?.items || [])]);
    setLoading(false);
  };

  useEffect(() => {
    loadData(page);
  }, [page]);

  // ================= SEARCH =================
  useEffect(() => {
    if (!query) {
      setSuggestions([]);
      return;
    }

    const delay = setTimeout(async () => {
      const res = await fetch(
        `https://drama-liart.vercel.app/search?q=${query}`
      );

      const data = await res.json();
      setSuggestions(data.items || []);
    }, 300); // debounce

    return () => clearTimeout(delay);
  }, [query]);

  // ================= INFINITE SCROLL =================
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 200
      ) {
        setPage((p) => p + 1);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
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

  // ----------------------------------------------------
  return (
    <div style={styles.page}>

      {/* ================= SEARCH BAR ================= */}
      <div style={styles.searchBox}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari drama..."
          style={styles.input}
        />
      </div>

      {/* ================= SUGGESTION ================= */}
      {query && suggestions.length > 0 && (
        <div style={styles.suggestionBox}>
          {suggestions.map((item, i) => (
            <Link
              key={i}
              href={`/detail/${item.slug}`}
              style={styles.suggestionItem}
              onClick={() => setQuery("")}
            >
              {item.title}
            </Link>
          ))}
        </div>
      )}

      {/* ================= GRID ================= */}
      <div style={styles.grid}>
        {items.map((item, i) => (
          <Link
            key={i}
            href={`/detail/${item.slug}`}
            style={styles.card}
          >
            <img
              src={item.thumbnail}
              style={styles.img}
              alt=""
            />
            <div style={styles.title}>{item.title}</div>
          </Link>
        ))}
      </div>

      {loading && (
        <div style={{ color: "white", textAlign: "center" }}>
          Loading...
        </div>
      )}
    </div>
  );
}

/* ================= STYLE ================= */

const styles = {
  page: {
    background: "#000",
    minHeight: "100vh",
    padding: 10,
  },

  searchBox: {
    position: "sticky",
    top: 0,
    zIndex: 10,
    background: "#000",
    padding: 10,
  },

  input: {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    border: "none",
    outline: "none",
    fontSize: 14,
  },

  suggestionBox: {
    background: "#111",
    marginTop: 5,
    borderRadius: 10,
    overflow: "hidden",
  },

  suggestionItem: {
    display: "block",
    padding: 10,
    color: "white",
    borderBottom: "1px solid #222",
    textDecoration: "none",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: 10,
    marginTop: 10,
  },

  card: {
    textDecoration: "none",
    color: "white",
  },

  img: {
    width: "100%",
    borderRadius: 10,
    aspectRatio: "2/3",
    objectFit: "cover",
  },

  title: {
    fontSize: 12,
    marginTop: 5,
    textAlign: "center",
  },
};
