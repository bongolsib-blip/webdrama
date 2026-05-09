"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";

const API = "https://drama-liart.vercel.app";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  // MODAL
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [finalSlug, setFinalSlug] = useState(null);

  // Sentinel untuk infinite scroll
  const sentinelRef = useRef(null);

  // ================= FETCH PAGE =================
  const fetchPage = async (q, page, append = false) => {
    if (page === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await fetch(
        `${API}/search-full?q=${encodeURIComponent(q)}&page=${page}`
      );
      const data = await res.json();
      const items = data.items || [];

      setResults(prev => append ? [...prev, ...items] : items);
      setHasNext(data.has_next && items.length > 0);
      setCurrentPage(page);
    } catch (err) {
      console.error("Fetch error:", err);
      if (!append) setResults([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // ================= SEARCH AWAL =================
  useEffect(() => {
    if (!query) {
      setResults([]);
      setLoading(false);
      return;
    }
    setResults([]);
    setCurrentPage(1);
    setHasNext(false);
    fetchPage(query, 1, false);
  }, [query]);

  // ================= INFINITE SCROLL =================
  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // Kalau sentinel terlihat dan ada next page dan tidak sedang loading
        if (entry.isIntersecting && hasNext && !loadingMore && !loading) {
          fetchPage(query, currentPage + 1, true);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNext, loadingMore, loading, currentPage, query]);

  // ================= OPEN DETAIL =================
  const openDetail = async (item) => {
    setSelected(item);
    setDetail(null);
    setFinalSlug(null);

    try {
      const res = await fetch(
        `${API}/detail?slug=${encodeURIComponent(item.slug)}`
      );
      const data = await res.json();

      setFinalSlug(data.final_slug || item.slug);
      setDetail(data.data);
    } catch (err) {
      console.error("Detail error:", err);
    }
  };

  // ================= LOCK SCROLL =================
  useEffect(() => {
    document.body.style.overflow = selected ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [selected]);

  // ================= ESC CLOSE =================
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      {/* TITLE */}
      <h1 style={styles.heading}>
        {loading
          ? `Mencari "${query}"...`
          : `Ditemukan ${results.length}${hasNext ? "+" : ""} hasil untuk "${query}"`}
      </h1>

      {/* GRID */}
      <div style={styles.grid}>

        {/* SKELETON saat loading pertama */}
        {loading &&
          Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={styles.skeletonCard}>
              <div style={styles.skeletonImage}></div>
              <div style={styles.skeletonTitle}></div>
            </div>
          ))}

        {/* DATA */}
        {!loading &&
          results.map((item, index) => (
            <div
              key={`${item.slug}-${index}`}
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
              <div style={styles.title}>{item.title}</div>
            </div>
          ))}

        {/* SKELETON saat load more */}
        {loadingMore &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={`more-${i}`} style={styles.skeletonCard}>
              <div style={styles.skeletonImage}></div>
              <div style={styles.skeletonTitle}></div>
            </div>
          ))}
      </div>

      {/* SENTINEL — elemen tak terlihat di bawah grid untuk trigger load more */}
      <div ref={sentinelRef} style={{ height: 1 }} />

      {/* EMPTY */}
      {!loading && results.length === 0 && (
        <p style={styles.empty}>Drama tidak ditemukan.</p>
      )}

      {/* MODAL */}
      {selected && (
        <div style={styles.modalOverlay} onClick={() => setSelected(null)}>
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            {!detail ? (
              <div style={styles.modalLoading}>
                <div style={styles.spinner}></div>
                <p style={{ color: "#aaa", marginTop: 10, fontSize: 13 }}>
                  Memuat detail...
                </p>
              </div>
            ) : (
              <>
                <img src={detail.thumbnail} style={styles.modalImg} alt={detail.title} />
                <h2 style={{ margin: "10px 0 5px", fontSize: 16 }}>{detail.title}</h2>
                <p style={styles.desc}>{detail.description}</p>
                <p style={{ fontSize: 13, color: "#aaa" }}>
                  Total Episode: {detail.total_episode || "?"}
                </p>
                <div style={styles.btnGroup}>
                  <Link href={`/detail/${encodeURIComponent(finalSlug || selected.slug)}`}>
                    <button style={styles.playBtn}>▶ Tonton</button>
                  </Link>
                  <button onClick={() => setSelected(null)} style={styles.closeBtn}>
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
        <div style={styles.header}>
          <Link href="/" style={styles.backBtn}>← Kembali</Link>
        </div>

        <Suspense fallback={<div style={{ color: "white" }}>Memuat halaman...</div>}>
          <SearchContent />
        </Suspense>
      </div>

      <style>{`
        .card-item:hover {
          transform: scale(1.08);
          z-index: 2;
          box-shadow: 0 10px 30px rgba(0,0,0,0.6);
        }
        .card-item:hover .overlay { opacity: 1; }
        .card-item:hover .info { opacity: 1; }
        .card-item:hover img { filter: brightness(1.2); }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    background: "#000",
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    padding: 10,
    color: "white",
  },
  header: { marginBottom: 20, paddingTop: 10 },
  backBtn: { color: "red", textDecoration: "none", fontWeight: "bold", fontSize: 15 },
  heading: { fontSize: 20, marginBottom: 20, paddingLeft: 5 },
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
  empty: { textAlign: "center", color: "#888", marginTop: 50 },
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
  modalLoading: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "30px 0",
  },
  spinner: {
    width: 30,
    height: 30,
    border: "3px solid #333",
    borderTop: "3px solid red",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  modalImg: { width: "100%", borderRadius: 10 },
  desc: { fontSize: 13, marginTop: 10, color: "#bbb", lineHeight: 1.5 },
  btnGroup: { marginTop: 15, display: "flex", gap: 10 },
  playBtn: {
    flex: 1,
    background: "red",
    color: "white",
    border: "none",
    padding: 10,
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
  },
  closeBtn: {
    flex: 1,
    background: "#333",
    color: "white",
    border: "none",
    padding: 10,
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
  },
  skeletonCard: { borderRadius: 10 },
  skeletonImage: {
    width: "100%",
    aspectRatio: "2/3",
    borderRadius: 10,
    background: "linear-gradient(90deg, #222 25%, #333 50%, #222 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
  },
  skeletonTitle: { height: 10, marginTop: 6, borderRadius: 4, background: "#222" },
};
