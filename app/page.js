"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  // ================= LOAD DATA =================
  const fetchData = async (p = 1, q = "") => {
    setLoading(true);

    let url = "";

    if (q) {
      url = `https://drama-liart.vercel.app/search?q=${q}`;
    } else {
      url = `https://drama-liart.vercel.app/list?page=${p}`;
    }

    try {
      const res = await fetch(url);
      const data = await res.json();

      const newItems = q ? data.items : data.data?.items;

      if (p === 1) {
        setItems(newItems || []);
      } else {
        setItems((prev) => [...prev, ...(newItems || [])]);
      }
    } catch (err) {
      console.log(err);
    }

    setLoading(false);
  };

  // ================= FIRST LOAD =================
  useEffect(() => {
    fetchData(1);
  }, []);

  // ================= INFINITE SCROLL =================
  useEffect(() => {
    const handleScroll = () => {
      if (loading || query) return;

      if (
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 200
      ) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchData(nextPage);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [page, loading, query]);

  // ================= SEARCH =================
  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData(1, query);
  };

  return (
    <div style={container}>
      
      {/* HEADER */}
      <h1 style={title}>🎬 Drama Streaming</h1>

      {/* SEARCH */}
      <form onSubmit={handleSearch} style={searchBox}>
        <input
          placeholder="Cari drama..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={inputStyle}
        />
        <button type="submit" style={searchBtn}>
          Cari
        </button>
      </form>

      {/* GRID */}
      <div style={gridStyle}>
        {items.map((item, i) => (
          <Link key={i} href={`/detail/${item.slug}`}>
            <div
              style={cardStyle}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "scale(1.05)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }
            >
              <img src={item.thumbnail} style={imageStyle} />
              <p style={titleStyle}>{item.title}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* LOADING */}
      {loading && <p style={{ textAlign: "center" }}>Loading...</p>}
    </div>
  );
}

/* ================= STYLE ================= */

const container = {
  padding: "15px",
  background: "#0f0f0f",
  minHeight: "100vh",
  color: "white",
};

const title = {
  fontSize: 24,
  marginBottom: 10,
};

/* SEARCH */
const searchBox = {
  display: "flex",
  gap: 10,
  marginBottom: 15,
};

const inputStyle = {
  flex: 1,
  padding: "10px",
  borderRadius: 8,
  border: "none",
};

const searchBtn = {
  padding: "10px 15px",
  background: "#e50914",
  border: "none",
  color: "white",
  borderRadius: 8,
  cursor: "pointer",
};

/* GRID FIX 🔥 */
const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
  gap: 12,
};

/* CARD */
const cardStyle = {
  cursor: "pointer",
  transition: "0.2s",
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
