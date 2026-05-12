"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";

const API = "https://drama-liart.vercel.app";

const PROVIDERS = [
  "shortmax", "dramabox", "dramabite", "dramawave", "dramanova",
  "netshort", "reelshort", "idrama", "melolo", "starshort",
  "goodshort", "flextv", "fundrama", "microdrama", "bilitv",
  "vigloo", "velolo", "reelala", "stardusttv", "flickreels", "reelife"
];

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [results, setResults] = useState([]);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [doneProviders, setDoneProviders] = useState(0);
  const seenTitles = useRef(new Set());
  const abortRef = useRef(null);

  // MODAL
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [finalSlug, setFinalSlug] = useState(null);

  // =========================
  // FETCH BERTAHAP
  // =========================
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    // Abort fetch sebelumnya jika query berubah
    if (abortRef.current) abortRef.current = false;
    const isActive = { value: true };
    abortRef.current = isActive;

    seenTitles.current = new Set();
    setResults([]);
    setDoneProviders(0);

    const run = async () => {
      // ==============================
      // STEP 1: Fetch lokal (cepat)
      // ==============================
      setLoadingLocal(true);
      try {
        const res = await fetch(`${API}/search-local?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        if (!isActive.value) return;

        const localItems = (data.items || []).filter(item => {
          const key = item.title.toLowerCase().trim();
          if (seenTitles.current.has(key)) return false;
          seenTitles.current.add(key);
          return true;
        });

        setResults(localItems);
      } catch (e) {
        console.error("local search error:", e);
      } finally {
        setLoadingLocal(false);
      }

      // ==============================
      // STEP 2: Fetch provider satu-satu, tampilkan langsung
      // ==============================
      setLoadingProviders(true);

      await Promise.allSettled(
        PROVIDERS.map(async (provider) => {
          try {
            const res = await fetch(
              `${API}/search-provider?q=${encodeURIComponent(query)}&provider=${provider}`
            );
            const data = await res.json();

            if (!isActive.value) return;

            const newItems = (data.items || []).filter(item => {
              const key = item.title.toLowerCase().trim();
              if (seenTitles.current.has(key)) return false;
              seenTitles.current.add(key);
              return true;
            });

            if (newItems.length > 0) {
              // 🔥 Append langsung tanpa tunggu provider lain
              setResults(prev => [...prev, ...newItems]);
            }
          } catch (e) {
            console.error(`provider ${provider} error:`, e);
          } finally {
            if (isActive.value) {
              setDoneProviders(prev => prev + 1);
            }
          }
        })
      );

      if (isActive.value) setLoadingProviders(false);
    };

    run();

    return () => { isActive.value = false; };
  }, [query]);

  // =========================
  // OPEN DETAIL
  // =========================
  const openDetail = async (item) => {
    if (!slug) return;
    const isActive = { value: true };
  
    const loadDetail = async () => {
      try {
        let slugToUse = slug;
  
        if (slug.startsWith("import")) {
          // STEP 1: Trigger import, dapat task_id
          console.log("START IMPORT");

          const startRes = await fetch(
            `https://drama-liart.vercel.app/start-import?slug=${encodeURIComponent(slug)}`
          );
          
          console.log("STATUS", startRes.status);
          
          const startData = await startRes.json();
          
          console.log("START DATA", startData);
  
          if (startData.status === "success") {
            // Langsung dapat slug (drama sudah ada)
            slugToUse = startData.final_slug;
  
          } else if (startData.task_id) {
            // STEP 2: Poll sampai selesai
            const taskId = startData.task_id;
            let resolved = false;
  
            for (let i = 0; i < 40; i++) { // max 40 × 3 detik = 2 menit
              if (!isActive.value) return;
  
              await new Promise(r => setTimeout(r, 3000));
  
              console.log("POLLING...", i + 1);

              const pollRes = await fetch(
                `https://drama-liart.vercel.app/poll-import?task_id=${taskId}`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    cookies: startData.cookies
                  })
                }
              );
              
              const pollData = await pollRes.json();
  
              console.log(`[poll ${i+1}]`, pollData);
  
              if (pollData.status === "success" && pollData.final_slug) {
                slugToUse = pollData.final_slug;
                resolved = true;
                break;
              }
  
              if (pollData.status === "error") {
                console.error("Import error:", pollData.message);
                break;
              }
              // status "processing" → lanjut polling
            }
  
            if (!resolved) {
              console.error("Import timeout");
              return;
            }
          } else {
            console.error("start-import gagal:", startData);
            return;
          }
        }
  
        if (!isActive.value) return;
  
        // Fetch detail dengan slug bersih
        const res = await fetch(
          `https://drama-liart.vercel.app/detail?slug=${slugToUse}`
        );
        const data = await res.json();
        setDetail(data.data);
        setFinalSlug(data.final_slug || slugToUse);
  
      } catch (e) {
        console.error("loadDetail error:", e);
      }
  };

  // =========================
  // LOCK SCROLL & ESC
  // =========================
  useEffect(() => {
    document.body.style.overflow = selected ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [selected]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const isLoading = loadingLocal || loadingProviders;

  return (
    <>
      {/* TITLE + STATUS */}
      <div style={styles.statusBar}>
        <h1 style={styles.heading}>
          {loadingLocal
            ? `Mencari "${query}"...`
            : `${results.length} hasil untuk "${query}"`}
        </h1>

        {/* Progress provider */}
        {loadingProviders && (
          <div style={styles.providerStatus}>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${(doneProviders / PROVIDERS.length) * 100}%`
                }}
              />
            </div>
            <p style={styles.providerText}>
              Memuat dari provider... ({doneProviders}/{PROVIDERS.length})
            </p>
          </div>
        )}
      </div>

      {/* GRID */}
      <div style={styles.grid}>

        {/* SKELETON hanya saat loading lokal */}
        {loadingLocal &&
          Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={styles.skeletonCard}>
              <div style={styles.skeletonImage}></div>
              <div style={styles.skeletonTitle}></div>
            </div>
          ))}

        {/* DATA — muncul bertahap */}
        {results.map((item, index) => (
          <div
            key={`${item.slug}-${index}`}
            className="card-item"
            style={styles.card}
            onClick={() => openDetail(item)}
          >
            {item.thumbnail ? (
              <img
                src={item.thumbnail}
                alt={item.title}
                loading="lazy"
                style={styles.img}
                onError={(e) => { e.target.style.display = "none"; }}
              />
            ) : (
              <div style={styles.noThumb}>
                <span style={{ fontSize: 10, color: "#666" }}>No Image</span>
              </div>
            )}
            <div className="overlay" style={styles.overlay}></div>
            {item.type === "import" && (
              <div style={styles.importBadge}>{item.provider || "import"}</div>
            )}
            <div style={styles.title}>{item.title}</div>
          </div>
        ))}
      </div>

      {/* EMPTY */}
      {!isLoading && results.length === 0 && (
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
                  {selected.type === "import"
                    ? "Mengimpor drama, harap tunggu..."
                    : "Memuat detail..."}
                </p>
                {selected.type === "import" && (
                  <p style={{ color: "#555", fontSize: 11, marginTop: 5 }}>
                    Proses ini bisa 10-30 detik
                  </p>
                )}
              </div>
            ) : detail.error ? (
              <div style={{ color: "red", padding: 20, textAlign: "center" }}>
                <p>Gagal memuat detail.</p>
                <button onClick={() => setSelected(null)} style={styles.closeBtn}>
                  Tutup
                </button>
              </div>
            ) : (
              <>
                {detail.thumbnail && (
                  <img src={detail.thumbnail} style={styles.modalImg} alt={detail.title} />
                )}
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
          transform: scale(1.05);
          z-index: 2;
          box-shadow: 0 8px 25px rgba(0,0,0,0.6);
        }
        .card-item:hover .overlay { opacity: 1; }
        .card-item:hover img { filter: brightness(1.15); }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .card-item { animation: fadeIn 0.3s ease; }
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
  statusBar: { marginBottom: 15 },
  heading: { fontSize: 18, margin: "0 0 8px" },
  providerStatus: { marginBottom: 10 },
  progressBar: {
    width: "100%",
    height: 3,
    background: "#222",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 5,
  },
  progressFill: {
    height: "100%",
    background: "red",
    borderRadius: 2,
    transition: "width 0.3s ease",
  },
  providerText: { fontSize: 11, color: "#555", margin: 0 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
    gap: 10,
  },
  card: {
    cursor: "pointer",
    position: "relative",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  img: {
    width: "100%",
    borderRadius: 8,
    aspectRatio: "2/3",
    objectFit: "cover",
    display: "block",
  },
  noThumb: {
    width: "100%",
    aspectRatio: "2/3",
    borderRadius: 8,
    background: "#1a1a1a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    borderRadius: 8,
    background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent 60%)",
    opacity: 0,
    transition: "opacity 0.2s",
  },
  importBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    background: "rgba(255,0,0,0.8)",
    color: "white",
    fontSize: 8,
    padding: "2px 5px",
    borderRadius: 3,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 11,
    color: "#ddd",
    textAlign: "center",
    marginTop: 5,
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    minHeight: 30,
    lineHeight: 1.3,
  },
  empty: { textAlign: "center", color: "#555", marginTop: 60, fontSize: 14 },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modalBox: {
    background: "#111",
    padding: 20,
    borderRadius: 12,
    maxWidth: 400,
    width: "90%",
    color: "white",
    maxHeight: "85vh",
    overflowY: "auto",
  },
  modalLoading: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 0",
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid #333",
    borderTop: "3px solid red",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  modalImg: { width: "100%", borderRadius: 8 },
  desc: { fontSize: 12, marginTop: 8, color: "#bbb", lineHeight: 1.5 },
  btnGroup: { marginTop: 15, display: "flex", gap: 10 },
  playBtn: {
    flex: 1,
    background: "red",
    color: "white",
    border: "none",
    padding: "10px 0",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: "bold",
  },
  closeBtn: {
    flex: 1,
    background: "#2a2a2a",
    color: "white",
    border: "none",
    padding: "10px 0",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
  },
  skeletonCard: { borderRadius: 8 },
  skeletonImage: {
    width: "100%",
    aspectRatio: "2/3",
    borderRadius: 8,
    background: "linear-gradient(90deg, #181818 25%, #242424 50%, #181818 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
  },
  skeletonTitle: { height: 9, marginTop: 5, borderRadius: 3, background: "#1a1a1a" },
};
