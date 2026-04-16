"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  const [loading, setLoading] = useState(false);

  // 🔥 MODAL STATE
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  // ================= LOAD LIST =================
  const loadData = async (p = 1) => {
    if (loading) return;

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
    }, 300);

    return () => clearTimeout(delay);
  }, [query]);

  // ================= INFINITE SCROLL =================
  useEffect(() => {
    const handleScroll = () => {
      if (loading) return;

      if (
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 200
      ) {
        setPage((p) => p + 1);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading]);

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

  // ================= UI =================
  return (
    <div style={styles.page}>

      {/* SEARCH */}
      <div style={styles.searchBox}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari drama..."
          style={styles.input}
        />
      </div>

      {/* SUGGESTION */}
      {query && suggestions.length > 0 && (
        <div style={styles.suggestionBox}>
          {suggestions.map((item, i) => (
            <div
              key={i}
              style={styles.suggestionItem}
              onClick={() => openDetail(item)}
            >
              {item.title}
            </div>
          ))}
        </div>
      )}

      {/* GRID */}
      <div style={styles.grid}>
        {items.map((item, i) => (
          <div
            key={i}
            style={styles.card}
            onClick={() => openDetail(item)}
          >
            <img src={item.thumbnail} style={styles.img} />
            <div style={styles.title}>{item.title}</div>
          </div>
        ))}
      </div>

      {loading && (
        <div style={{ color: "white", textAlign: "center" }}>
          Loading...
        </div>
      )}

      {/* MODAL */}
      {selected && (
        <div style={styles.modalOverlay} onClick={() => setSelected(null)}>
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>

            {!detail ? (
              <p style={{ color: "white" }}>Loading...</p>
            ) : (
              <>
                <img src={detail.thumbnail} style={styles.modalImg} />

                <h2>{detail.title}</h2>

                <p style={styles.desc}>{detail.description}</p>

                <p>Total Episode: {detail.total_episode}</p>

                <div style={styles.btnGroup}>
                  <Link href={`/detail/${selected.slug}`}>
                    <button style={styles.playBtn}>▶ Tonton</button>
                  </Link>

                  <button
                    onClick={() => setSelected(null)}
                    style={styles.closeBtn}
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

/* ================= STYLE ================= */

const styles = {
  page: {
    background: "#000",
    minHeight: "100vh",
  
    margin: "0 auto",
    maxWidth: 1200,
  
    padding: 10,
  },

  searchBox: {
    position: "sticky",
    top: 0,
    background: "#000",
    zIndex: 10,
    padding: 10,
  },

  input: {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    border: "none",
  },

  suggestionBox: {
    background: "#111",
    borderRadius: 10,
    marginTop: 5,
  },

  suggestionItem: {
    padding: 10,
    color: "white",
    borderBottom: "1px solid #222",
    cursor: "pointer",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: 10,
    marginTop: 10,
  },

  card: {
    cursor: "pointer",
  },

  img: {
    width: "100%",
    borderRadius: 10,
    aspectRatio: "2/3",
    objectFit: "cover",
  },

  title: {
    fontSize: 12,
    color: "white",
    textAlign: "center",
    marginTop: 5,
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  modalBox: {
    background: "#111",
    padding: 20,
    borderRadius: 10,
    maxWidth: 400,
    width: "90%",
    color: "white",
  
    maxHeight: "80vh",
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
  },

  modalImg: {
    width: "100%",
    borderRadius: 10,
  },

  desc: {
    fontSize: 13,
    marginTop: 10,
  },

  btnGroup: {
    marginTop: 15,
    display: "flex",
    gap: 10,
  },

  playBtn: {
    flex: 1,
    background: "red",
    color: "white",
    border: "none",
    padding: 10,
    borderRadius: 6,
  },

  closeBtn: {
    flex: 1,
    background: "#333",
    color: "white",
    border: "none",
    padding: 10,
    borderRadius: 6,
  },
};
