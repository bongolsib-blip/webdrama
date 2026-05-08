"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // 1. FUNGSI QUICK SEARCH (API: /search)
  const handleQuickSearch = async () => {
    if (!q.trim()) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch(
        `https://drama-liart.vercel.app/search?q=${encodeURIComponent(q)}`
      );

      if (!res.ok) throw new Error("Gagal mengambil data");

      const data = await res.json();
      
      if (data.status !== "success") throw new Error("API Error");

      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan saat mengambil data cepat");
    } finally {
      setLoading(false);
    }
  };

  // 2. FUNGSI FULL SEARCH (Redirect ke halaman khusus)
  const handleFullSearch = () => {
    if (!q.trim()) return;
    // Diarahkan ke halaman khusus search-full dengan query parameter
    router.push(`/search-full?q=${encodeURIComponent(q)}`);
  };

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: "0 auto" }}>
      
      {/* SECTION: SEARCH BAR */}
      <div style={{ marginBottom: 30, background: "#f9f9f9", padding: 20, borderRadius: 12 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            type="text"
            value={q}
            placeholder="Cari drama..."
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleQuickSearch();
            }}
            style={{
              flex: 1,
              padding: "12px 15px",
              borderRadius: 8,
              border: "2px solid #ddd",
              fontSize: 16,
              outline: "none"
            }}
          />
          
          {/* Tombol Search Biasa (Quick) */}
          <button
            onClick={handleQuickSearch}
            disabled={loading}
            style={{
              padding: "0 20px",
              borderRadius: 8,
              border: "none",
              background: "#111",
              color: "#fff",
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            {loading ? "..." : "Quick Search"}
          </button>

          {/* Tombol Search Full */}
          <button
            onClick={handleFullSearch}
            style={{
              padding: "0 20px",
              borderRadius: 8,
              border: "2px solid #111",
              background: "#fff",
              color: "#111",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            Full Search ↗
          </button>
        </div>
        <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
          * <b>Quick Search</b> untuk hasil instan di sini. <b>Full Search</b> untuk hasil lebih lengkap di halaman baru.
        </p>
      </div>

      {/* SECTION: HASIL QUICK SEARCH */}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 20,
        }}
      >
        {items.map((item) => (
          <Link
            key={item.slug}
            href={`/detail/${item.slug}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                border: "1px solid #e5e5e5",
                borderRadius: 12,
                overflow: "hidden",
                background: "#fff",
                height: "100%",
              }}
            >
              <Image
                src={item.thumbnail}
                alt={item.title}
                width={300}
                height={400}
                unoptimized
                style={{ width: "100%", height: 320, objectFit: "cover" }}
              />

              <div style={{ padding: 14 }}>
                <h3 style={{ fontSize: 16, marginBottom: 8 }}>{item.title}</h3>
                
                {/* Menangani perbedaan field description/tags antara API Quick & Full */}
                {item.description && (
                  <p style={{ fontSize: 13, color: "#666" }}>
                    {item.description.slice(0, 60)}...
                  </p>
                )}
                
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 10 }}>
                  {item.tags?.map((tag) => (
                    <span key={tag} style={{ fontSize: 10, background: "#eee", padding: "2px 6px", borderRadius: 4 }}>
                      {tag}
                    </span>
                  ))}
                  {item.type && (
                    <span style={{ fontSize: 10, background: "#007bff", color: "#fff", padding: "2px 6px", borderRadius: 4 }}>
                      {item.type}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {!loading && items.length === 0 && !error && (
        <div style={{ textAlign: "center", marginTop: 50, color: "#999" }}>
          <p>Gunakan kolom di atas untuk mencari drama favoritmu.</p>
        </div>
      )}
    </div>
  );
}
