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

  // close hover
  const resetHover = () => {
    const cards = document.querySelectorAll(".card-item");
  
    cards.forEach((el) => {
      el.style.transform = "scale(1)";
      el.style.zIndex = 1;
      el.style.boxShadow = "none";
  
      const overlay = el.querySelector(".overlay");
      const info = el.querySelector(".info");
      const img = el.querySelector("img");
  
      if (overlay) overlay.style.opacity = 0;
      if (info) info.style.opacity = 0;
      if (img) img.style.filter = "brightness(1)";
    });
  };

  // ================= OPEN MODAL =================
  const openDetail = async (item) => {
    resetHover(); // 🔥 penting
    setSelected(item);
    setDetail(null);
    

    const res = await fetch(
      `https://drama-liart.vercel.app/detail?slug=${item.slug}`
    );

    const data = await res.json();
    setDetail(data.data);
  };
  // ========= Sceleton ===========
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `;
    document.head.appendChild(style);
  
    return () => document.head.removeChild(style);
  }, []);

  // ================= UI =================
  return (
    <div style={styles.page}>
      <div style={{ width: "100%", maxWidth: 1200 }}>
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

          {/* 🔥 SKELETON (saat loading & belum ada data) */}
          {loading && items.length === 0 &&
            Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={styles.skeletonCard}>
                <div style={styles.skeletonImage}></div>
                <div style={styles.skeletonTitle}></div>
              </div>
            ))
          }
        
          {/* 🔥 DATA */}
          {items.map((item, i) => (
            <div
              key={i}
              className="card-item"
              style={styles.card}
              onClick={() => openDetail(item)}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.transform = "scale(1.08)";
                el.style.zIndex = 2;
                el.style.boxShadow = "0 10px 30px rgba(0,0,0,0.6)";
          
                const overlay = el.querySelector(".overlay");
                const info = el.querySelector(".info");
          
                if (overlay) overlay.style.opacity = 1;
                if (info) info.style.opacity = 1;
          
                const img = el.querySelector("img");
                if (img) img.style.filter = "brightness(1.2)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.transform = "scale(1)";
                el.style.zIndex = 1;
                el.style.boxShadow = "none";
          
                const overlay = el.querySelector(".overlay");
                const info = el.querySelector(".info");
          
                if (overlay) overlay.style.opacity = 0;
                if (info) info.style.opacity = 0;
          
                const img = el.querySelector("img");
                if (img) img.style.filter = "brightness(1)";
              }}
              onTouchStart={(e) => {
                e.currentTarget.style.transform = "scale(0.95)";
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <img src={item.thumbnail} style={styles.img} />
          
              {/* OVERLAY */}
              <div className="overlay" style={styles.overlay}></div>
          
              {/* INFO */}
              <div className="info" style={styles.info}>
                {item.tags?.join(", ")}
              </div>
          
              <div style={styles.title}>{item.title}</div>
            </div>
          ))}
        
        </div>
  
          
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
    </div>
  );
}

/* ================= STYLE ================= */

const styles = {
  page: {
    background: "#000",
    minHeight: "100vh",
  
    display: "flex",
    justifyContent: "center", // center horizontal
  
    padding: 10,
  },

  searchBox: {
    position: "sticky",
    top: 0,
    background: "#000",
    zIndex: 10,
    padding: 10,
    width: "30%",
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
    position: "relative",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
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
    transition: "opacity 0.3s",
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

  skeletonCard: {
    borderRadius: 10,
  },
  
  skeletonImage: {
    width: "100%",
    aspectRatio: "2/3",
    borderRadius: 10,
    background: "linear-gradient(90deg, #222 25%, #333 50%, #222 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
  },
  
  skeletonTitle: {
    height: 10,
    marginTop: 6,
    borderRadius: 4,
    background: "#222",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    borderRadius: 10,
    background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
    opacity: 0,
    transition: "opacity 0.3s",
  },
  
  info: {
    position: "absolute",
    bottom: 25,
    left: 8,
    right: 8,
    fontSize: 10,
    color: "#ccc",
    opacity: 0,
    transition: "opacity 0.3s",
    zIndex: 2,
  },
  img: {
    width: "100%",
    borderRadius: 10,
    aspectRatio: "2/3",
    objectFit: "cover",
    transition: "filter 0.3s",
  },
};
