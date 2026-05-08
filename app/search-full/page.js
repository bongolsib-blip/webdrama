"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react"; // Tambahkan Suspense
import Link from "next/link";

// 1. Pindahkan logika pencarian ke komponen terpisah
function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) return;

    const fetchResults = async () => {
      setLoading(true);
      try {
        // Menggunakan endpoint search-full
        const res = await fetch(`https://drama-liart.vercel.app/search-full?q=${query}`);
        const data = await res.json();

        // Berdasarkan struktur JSON Anda: data.items adalah array-nya
        if (data && data.items) {
          setResults(data.items);
        } else {
          setResults([]);
        }
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
      <h1>Hasil Pencarian untuk: "{query}"</h1>
      
      {loading ? (
        <p>Sedang mencari...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "20px" }}>
          {results.map((item) => (
            <div key={item.slug}>
              <img src={item.thumbnail} style={{ width: "100%", borderRadius: "10px" }} />
              <p>{item.title}</p>
              <Link href={`/detail/${item.slug}`}>
                 <button style={{ background: "red", color: "white", border: "none", padding: "5px 10px", borderRadius: "5px", cursor: "pointer" }}>Tonton</button>
              </Link>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !loading && <p>Tidak ada hasil ditemukan.</p>}
    </div>
  );
}

// 2. Export utama yang membungkus komponen tadi dengan Suspense
export default function SearchFullPage() {
  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "20px" }}>
        Ditemukan {results.length} hasil untuk: "{query}"
      </h1>
      
      {loading ? (
        <p>Sedang memuat banyak data...</p>
      ) : (
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", 
          gap: "15px" 
        }}>
          {results.map((item) => (
            <div key={item.slug} style={{ textAlign: "center" }}>
              <Link href={`/detail/${item.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ position: "relative", overflow: "hidden", borderRadius: "10px" }}>
                  <img 
                    src={item.thumbnail} 
                    alt={item.title}
                    style={{ 
                      width: "100%", 
                      aspectRatio: "2/3", 
                      objectFit: "cover",
                      display: "block",
                      transition: "transform 0.3s"
                    }} 
                  />
                </div>
                <p style={{ 
                  fontSize: "12px", 
                  marginTop: "8px", 
                  overflow: "hidden", 
                  textOverflow: "ellipsis", 
                  whiteSpace: "nowrap" 
                }}>
                  {item.title}
                </p>
              </Link>
            </div>
          ))}
        </div>
      )}

      {!loading && results.length === 0 && (
        <p style={{ textAlign: "center", color: "#888" }}>Drama tidak ditemukan.</p>
      )}
    </div>
  );
}
