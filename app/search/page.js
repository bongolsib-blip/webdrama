
"use client";

import { useState } from "react";
import Link from "next/link";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);

  const search = async () => {
    const res = await fetch(`https://drama-liart.vercel.app/search?q=${q}`);
    const data = await res.json();
    setItems(data.items || []);
  };

  return (
    <div style={{ padding: 20 }}>
      <input onChange={(e) => setQ(e.target.value)} placeholder="Search..." />
      <button onClick={search}>Search</button>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {items.map((item, i) => (
          <Link key={i} href={`/detail/${item.slug}`}>
            <div style={{ border: "1px solid #ccc", padding: 10 }}>
              <img src={item.thumbnail} width="100%" />
              <p>{item.title}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
