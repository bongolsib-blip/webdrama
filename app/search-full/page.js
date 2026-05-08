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
        const res = await fetch(`https://drama-liart.vercel.app/search?q=${query}`);
        const data = await res.json();
        setResults(data.items || []);
      } catch (err) {
        console.error("Fetch error:", err);
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
    <div style={{ padding: "20px", background: "#000", minHeight: "100vh", color: "white" }}>
      <Suspense fallback={<p>Loading Search...</p>}>
        <SearchContent />
      </Suspense>

      <div style={{ marginTop: "30px" }}>
        <Link href="/" style={{ color: "red" }}>← Kembali ke Beranda</Link>
      </div>
    </div>
  );
}
