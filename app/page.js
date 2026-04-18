"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  const [genre, setGenre] = useState("All");

  const genres = [
    "All","Romance","Drama","Comedy","Action","Fantasy", "Family","Business",
    "Crime","Mystery","Sci-Fi",
  ];

  const categoryMap = {
    Romance: [
      "romantis", "romansa", "cinta", "nikah", "pernikahan", "love"
    ],
    Drama: [
      "drama", "konflik", "keluarga", "penyesalan"
    ],
    Action: [
      "aksi", "perang", "balas dendam", "serangan balik", "dewa perang"
    ],
    Fantasy: [
      "fantasi", "sihir", "kultivasi", "dewa", "iblis"
    ],
    Comedy: [
      "komedi", "lucu", "kocak"
    ],
    Crime: [
      "mafia", "kriminal", "penjara"
    ],
    Mystery: [
      "misteri", "rahasia"
    ],
    Sci-Fi: [
      "kiamat", "sistem", "dunia lain"
    ],
    Family: [
      "keluarga", "ayah", "ibu", "anak"
    ],
    Business: [
      "ceo", "miliarder", "bos", "kantoran"
    ],
  };

  // ================= FILTER =================
  const detectCategories = (item) => {
    const text = (
      (item.title || "") + " " + (item.tags || []).join(" ")
    ).toLowerCase();
  
    let result = [];
  
    for (const [genre, keywords] of Object.entries(categoryMap)) {
      if (keywords.some((k) => text.includes(k))) {
        result.push(genre);
      }
    }
  
    return result.length ? result : ["Other"];
  };
  
  const loadData = async (p = 1, g = genre) => {
    if (loading) return;
  
    try {
      setLoading(true);
  
      const url =
        g === "All"
          ? `https://drama-liart.vercel.app/list?page=${p}`
          : `https://drama-liart.vercel.app/list-by-genre?genre=${g}&page=${p}`;
  
      const res = await fetch(url);
      const json = await res.json();
  
      const newItems = json.data?.items || json.data || [];
  
      setItems((prev) => {
        const merged = p === 1 ? newItems : [...prev, ...newItems];
  
        return merged.filter(
          (item, index, self) =>
            index === self.findIndex((t) => t.slug === item.slug)
        );
      });
  
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setItems([]);
    setPage(1);
    loadData(1, genre);
  }, [genre]);
  
  // ================= LOAD DATA =================
  const loadData = async (p = 1) => {
    if (loading) return;

    try {
      setLoading(true);

      const res = await fetch(
        `https://drama-liart.vercel.app/list?page=${p}`
      );

      const json = await res.json();
      const newItems = json.data?.items || [];

      // 🔥 deduplicate by slug
      setItems((prev) => {
        const merged = [...prev, ...newItems];

        return merged.filter(
          (item, index, self) =>
            index === self.findIndex((t) => t.slug === item.slug)
        );
      });

    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(page, genre);
  }, [page]);

  // ================= SEARCH =================
  useEffect(() => {
    if (!query) {
      setSuggestions([]);
      return;
    }

    const delay = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://drama-liart.vercel.app/search?q=${query}`
        );

        const data = await res.json();
        setSuggestions(data.items || []);
      } catch (err) {
        console.error("Search error:", err);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [query]);

  // ================= INFINITE SCROLL =================
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (ticking || loading) return;

      ticking = true;

      setTimeout(() => {
        if (
          window.innerHeight + window.scrollY >=
          document.body.offsetHeight - 200
        ) {
          setPage((p) => p + 1);
        }
        ticking = false;
      }, 200);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading]);

  // ================= MODAL =================
  const openDetail = async (item) => {
    setSelected(item);
    setDetail(null);

    try {
      const res = await fetch(
        `https://drama-liart.vercel.app/detail?slug=${item.slug}`
      );

      const data = await res.json();
      setDetail(data.data);
    } catch (err) {
      console.error("Detail error:", err);
    }
  };

  // lock scroll
  useEffect(() => {
    if (selected) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => (document.body.style.overflow = "auto");
  }, [selected]);

  // ESC close
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") setSelected(null);
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
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

        {/* GENRE */}
        <div style={styles.genreBar}>
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => setGenre(g)}
              style={{
                ...styles.genreBtn,
                background: genre === g ? "red" : "#222",
              }}
            >
              {g}
            </button>
          ))}
        </div>

        {/* SUGGESTION */}
        {query && suggestions.length > 0 && (
          <div style={styles.suggestionBox}>
            {suggestions.map((item) => (
              <div
                key={item.slug}
                style={styles.suggestionItem}
                onClick={() => {
                  openDetail(item);
                  setQuery("");
                  setSuggestions([]);
                }}
              >
                {item.title}
              </div>
            ))}
          </div>
        )}

        {/* GRID */}
        <div style={styles.grid}>

          {/* SKELETON */}
          {loading && items.length === 0 &&
            Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={styles.skeletonCard}>
                <div style={styles.skeletonImage}></div>
                <div style={styles.skeletonTitle}></div>
              </div>
            ))
          }

          {/* DATA */}
          {items.map((item) => (
            <div
              key={item.slug}
              className="card-item"
              style={styles.card}
              onClick={() => openDetail(item)}
            >
              <img
                src={item.thumbnail}
                style={styles.img}
                loading="lazy"
              />

              <div className="overlay" style={styles.overlay}></div>

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

      {/* 🔥 HOVER CSS */}
      <style>{`
        .card-item:hover {
          transform: scale(1.08);
          z-index: 2;
          box-shadow: 0 10px 30px rgba(0,0,0,0.6);
        }

        .card-item:hover .overlay {
          opacity: 1;
        }

        .card-item:hover .info {
          opacity: 1;
        }

        .card-item:hover img {
          filter: brightness(1.2);
        }
      `}</style>
    </div>
  );
}

/* ================= STYLE ================= */

const styles = {
  page: {
    background: "#000",
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    padding: 10,
  },

  searchBox: {
    position: "sticky",
    top: 0,
    background: "#000",
    zIndex: 10,
    padding: 10,
    width: "100%",
    maxWidth: 400,
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
    transition: "filter 0.3s",
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
    zIndex: 9999,
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

  genreBar: {
    display: "flex",
    gap: 10,
    overflowX: "auto",
    padding: "10px 0",
  },

  genreBtn: {
    padding: "6px 12px",
    borderRadius: 20,
    border: "none",
    color: "white",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
};
