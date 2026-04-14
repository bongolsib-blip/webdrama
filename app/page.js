"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const [history, setHistory] = useState([]);
  const [historyDetail, setHistoryDetail] = useState([]);

  // ================= LOAD LIST =================
  const fetchData = async (p = 1, q = "") => {
    setLoading(true);

    let url = q
      ? `https://drama-liart.vercel.app/search?q=${q}`
      : `https://drama-liart.vercel.app/list?page=${p}`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      const newItems = q ? data.items : data.data?.items;

      if (p === 1) setItems(newItems || []);
      else setItems((prev) => [...prev, ...(newItems || [])]);
    } catch (err) {
      console.log(err);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData(1);
  }, []);

  // ================= INFINITE SCROLL =================
  useEffect(() => {
    const handleScroll = () => {
      if (loading || query) return;

      if (
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 200
      ) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchData(nextPage);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [page, loading, query]);

  // ================= SEARCH =================
  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData(1, query);
  };

  // ================= LOAD HISTORY =================
  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("history_watch") || "[]");
    setHistory(data);
  }, []);

  // ================= FETCH DETAIL HISTORY =================
  useEffect(() => {
    const fetchHistory = async () => {
      if (!history.length) return;

      const results = await Promise.all(
        history.map(async (item) => {
          try {
            const res = await fetch(
              `https://drama-liart.vercel.app/detail?slug=${item.slug}`
            );
            const data = await res.json();

            return {
              ...item,
              title: data?.data?.title,
              thumbnail: data?.data?.thumbnail,
            };
          } catch {
            return null;
          }
        })
      );

      setHistoryDetail(results.filter(Boolean));
    };

    fetchHistory();
  }, [history]);

  return (
    <div style={container}>
      <h1 style={title}>🎬 Drama Streaming</h1>

      {/* SEARCH */}
      <form onSubmit={handleSearch} style={searchBox}>
        <input
          placeholder="Cari drama..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={inputStyle}
        />
        <button style={searchBtn}>Cari</button>
      </form>

      {/* CONTINUE WATCHING */}
      {historyDetail.length > 0 && (
        <>
          <h2 style={{ marginBottom: 10 }}>▶ Continue Watching</h2>

          <div style={rowStyle}>
            {historyDetail.map((item, i) => (
              <Link
                key={i}
                href={`/detail/${item.slug}?ep=${item.episode}`}
              >
                <div style={historyCard}>
                  <img src={item.thumbnail} style={historyImg} />
                  <div style={historyInfo}>
                    <p>{item.title}</p>
                    <span>Ep {item.episode}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* GRID */}
      <div style={gridStyle}>
        {items.map((item, i) => (
          <Link key={i} href={`/detail/${item.slug}`}>
            <div style={cardStyle}>
              <img src={item.thumbnail} style={imageStyle} />
              <p style={titleStyle}>{item.title}</p>
            </div>
          </Link>
        ))}
      </div>

      {loading && <p style={{ textAlign: "center" }}>Loading...</p>}
    </div>
  );
}

/* STYLE */

const container = {
  padding: 15,
  background: "#0f0f0f",
  minHeight: "100vh",
  color: "white",
};

const title = { fontSize: 24, marginBottom: 10 };

const searchBox = {
  display: "flex",
  gap: 10,
  marginBottom: 15,
};

const inputStyle = {
  flex: 1,
  padding: 10,
  borderRadius: 8,
  border: "none",
};

const searchBtn = {
  padding: "10px 15px",
  background: "#e50914",
  border: "none",
  color: "white",
  borderRadius: 8,
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
  gap: 12,
};

const cardStyle = { cursor: "pointer" };

const imageStyle = {
  width: "100%",
  borderRadius: 10,
  aspectRatio: "2/3",
  objectFit: "cover",
};

const titleStyle = {
  marginTop: 6,
  fontSize: 13,
  color: "#ddd",
};

/* CONTINUE WATCHING */
const rowStyle = {
  display: "flex",
  overflowX: "auto",
  gap: 10,
  marginBottom: 20,
};

const historyCard = {
  minWidth: 140,
};

const historyImg = {
  width: "100%",
  borderRadius: 8,
  aspectRatio: "2/3",
  objectFit: "cover",
};

const historyInfo = {
  marginTop: 5,
  fontSize: 12,
  color: "#ccc",
};
