"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  // MODAL
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  // ================= SEARCH =================
  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);

      try {
        const res = await fetch(
          `https://drama-liart.vercel.app/search-full?q=${encodeURIComponent(
            query
          )}`
        );

        const data = await res.json();

        setResults(data.items || []);
      } catch (err) {
        console.error("Fetch error:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  // ================= OPEN DETAIL =================
  const openDetail = async (item) => {
  setSelected(item);
  setDetail(null);

  try {
    const res = await fetch(
      `https://drama-liart.vercel.app/detail?slug=${encodeURIComponent(item.slug)}`
    );

    const data = await res.json();

    // 🔥 FIX: simpan final_slug ke dalam detail
    setDetail({
      ...data.data,
      final_slug: data.final_slug  // ← ambil dari root response
    });

  } catch (err) {
    console.error("Detail error:", err);
  }
};

  // ================= LOCK SCROLL =================
  useEffect(() => {
    if (selected) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [selected]);

  // ================= ESC CLOSE =================
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setSelected(null);
      }
    };

    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <>
      {/* TITLE */}
      <h1 style={styles.heading}>
        {loading
          ? `Mencari "${query}"...`
          : `Ditemukan ${results.length} hasil untuk "${query}"`}
      </h1>

      {/* GRID */}
      <div style={styles.grid}>

        {/* SKELETON */}
        {loading &&
          Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={styles.skeletonCard}>
              <div style={styles.skeletonImage}></div>
              <div style={styles.skeletonTitle}></div>
            </div>
          ))}

        {/* DATA */}
        {!loading &&
          results.map((item) => (
            <div
              key={item.slug}
              className="card-item"
              style={styles.card}
              onClick={() => openDetail(item)}
            >
              <img
                src={item.thumbnail}
                alt={item.title}
                loading="lazy"
                style={styles.img}
              />

              <div className="overlay" style={styles.overlay}></div>

              <div className="info" style={styles.info}>
                {item.tags?.join(", ")}
              </div>

              <div style={styles.title}>
                {item.title}
              </div>
            </div>
          ))}

      </div>

      {/* EMPTY */}
      {!loading && results.length === 0 && (
        <p style={styles.empty}>
          Drama tidak ditemukan.
        </p>
      )}

      {/* MODAL */}
      {selected && (
        <div
          style={styles.modalOverlay}
          onClick={() => setSelected(null)}
        >
          <div
            style={styles.modalBox}
            onClick={(e) => e.stopPropagation()}
          >

            {!detail ? (
              <p style={{ color: "white" }}>
                Loading...
              </p>
            ) : (
              <>
                <img
                  src={detail.thumbnail}
                  style={styles.modalImg}
                />

                <h2>{detail.title}</h2>

                <p style={styles.desc}>
                  {detail.description}
                </p>

                <p>
                  Total Episode: {detail.total_episode}
                </p>

                <div style={styles.btnGroup}>
                  <Link href={`/detail/${detail.final_slug || selected.slug}`}>
                    <button style={styles.playBtn}>
                      ▶ Tonton
                    </button>
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
    </>
  );
}

export default function SearchFullPage() {
  return (
    <div style={styles.page}>
      <div style={{ width: "100%", maxWidth: 1200 }}>

        {/* HEADER */}
        <div style={styles.header}>
          <Link href="/" style={styles.backBtn}>
            ← Kembali
          </Link>
        </div>

        <Suspense
          fallback={
            <div style={{ color: "white" }}>
              Memuat halaman...
            </div>
          }
        >
          <SearchContent />
        </Suspense>
      </div>

      {/* HOVER EFFECT */}
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
    color: "white",
  },

  header: {
    marginBottom: 20,
    paddingTop: 10,
  },

  backBtn: {
    color: "red",
    textDecoration: "none",
    fontWeight: "bold",
    fontSize: 15,
  },

  heading: {
    fontSize: 20,
    marginBottom: 20,
    paddingLeft: 5,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: 10,
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
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    minHeight: 32,
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

  empty: {
    textAlign: "center",
    color: "#888",
    marginTop: 50,
  },

  // MODAL
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
    cursor: "pointer",
  },

  closeBtn: {
    flex: 1,
    background: "#333",
    color: "white",
    border: "none",
    padding: 10,
    borderRadius: 6,
    cursor: "pointer",
  },

  // SKELETON
  skeletonCard: {
    borderRadius: 10,
  },

  skeletonImage: {
    width: "100%",
    aspectRatio: "2/3",
    borderRadius: 10,
    background:
      "linear-gradient(90deg, #222 25%, #333 50%, #222 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
  },

  skeletonTitle: {
    height: 10,
    marginTop: 6,
    borderRadius: 4,
    background: "#222",
  },
};
