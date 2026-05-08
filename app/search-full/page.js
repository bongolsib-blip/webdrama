"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";

// 1. SEMUA LOGIKA DATA ADA DI SINI
function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://drama-liart.vercel.app/search-full?q=${encodeURIComponent(query)}`);
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

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "20px" }}>
        {loading ? `Mencari "${query}"...` : `Ditemukan ${results.length} hasil untuk: "${query}"`}
      </h1>
      
      {loading ? (
        <div style={{ textAlign: "center", padding: "50px" }}>Sedang memuat data...</div>
      ) : (
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", 
          gap: "15px" 
        }}>
          {results.map((item) => (
            <div key={item.slug} style={{ textAlign: "center" }}>
              <Link href={`/detail/${item.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ position: "relative", borderRadius: "10px", overflow: "hidden" }}>
                  <img 
                    src={item.thumbnail} 
                    alt={item.title}
                    style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover" }} 
                  />
                </div>
                <p style={{ fontSize: "12px", marginTop: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.title}
                </p>
              </Link>
            </div>
          ))}
        </div>
      )}

      {!loading && results.length === 0 && (
        <p style={{ textAlign: "center", color: "#888", marginTop: "50px" }}>Drama tidak ditemukan.</p>
      )}
    </div>
  );
}

// 2. KOMPONEN UTAMA HANYA SEBAGAI PEMBUNGKUS (SHELL)
export default function SearchFullPage() {
  return (
    <div style={{ padding: "20px", background: "#000", minHeight: "100vh", color: "white" }}>
      {/* Tombol kembali diletakkan di luar Suspense agar langsung muncul */}
      <div style={{ marginBottom: "20px" }}>
        <Link href="/" style={{ color: "red", textDecoration: "none", fontWeight: "bold" }}>
          ← Kembali ke Beranda
        </Link>
      </div>

      <Suspense fallback={<div style={{ color: "white" }}>Memuat halaman...</div>}>
        <SearchContent />
      </Suspense>
    </div>
  );
}
