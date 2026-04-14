"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [q, setQ] = useState("");
  const [isSearch, setIsSearch] = useState(false);

  const loadList = async (p = 1) => {
    const res = await fetch(
      `https://drama-liart.vercel.app/list?page=${p}`
    );
    const data = await res.json();

    setItems(data?.data?.items || []);
    setHasNext(data?.data?.has_next || false);
  };

  const handleSearch = async () => {
    if (!q) {
      setIsSearch(false);
      setPage(1);
      return loadList(1);
    }

    setIsSearch(true);

    const res = await fetch(
      `https://drama-liart.vercel.app/search?q=${q}`
    );
    const data = await res.json();

    setItems(data.items || []);
    setHasNext(false);
  };

  useEffect(() => {
    if (!isSearch) {
      loadList(page);
    }
  }, [page, isSearch]);

  return (
    <div style={{ padding: 20 }}>
      <h1>🎬 Drama Streaming</h1>

      {/* SEARCH */}
      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="Cari drama..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ padding: 8, width: 250 }}
        />
        <button onClick={handleSearch} style={{ marginLeft: 10 }}>
          Search
        </button>

        <button
          onClick={() => {
            setQ("");
            setIsSearch(false);
            setPage(1);
            loadList(1);
          }}
          style={{ marginLeft: 10 }}
        >
          Reset
        </button>
      </div>

      {/* LIST */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))",
          gap: 10,
        }}
      >
        {items.map((item, i) => (
          <Link key={i} href={`/detail/${item.slug}`}>
            <div style={{ border: "1px solid #ccc", padding: 10 }}>
              <img src={item.thumbnail} width="100%" />
              <p>{item.title}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* PAGINATION */}
      <div style={{ marginTop: 20 }}>
        <button
          disabled={page === 1 || isSearch}
          onClick={() => setPage((prev) => prev - 1)}
        >
          ⬅ Prev
        </button>

        <span style={{ margin: "0 10px" }}>Page {page}</span>

        <button
          disabled={!hasNext || isSearch}
          onClick={() => setPage((prev) => prev + 1)}
        >
          Next ➡
        </button>
      </div>
    </div>
  );
}
