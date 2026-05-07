"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async () => {
    if (!q.trim()) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch(
        `https://drama-liart.vercel.app/search?q=${encodeURIComponent(q)}`
      );

      if (!res.ok) {
        throw new Error("Gagal mengambil data");
      }

      const data = await res.json();

      if (data.status !== "success") {
        throw new Error("API Error");
      }

      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan saat mengambil data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: 20,
        maxWidth: 1400,
        margin: "0 auto",
      }}
    >
      {/* SEARCH BAR */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 24,
        }}
      >
        <input
          type="text"
          value={q}
          placeholder="Cari drama..."
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              search();
            }
          }}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 8,
            border: "1px solid #ccc",
            outline: "none",
            fontSize: 16,
          }}
        />

        <button
          onClick={search}
          disabled={loading}
          style={{
            padding: "12px 20px",
            borderRadius: 8,
            border: "none",
            background: "#111",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {loading ? "Loading..." : "Search"}
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <p
          style={{
            color: "red",
            marginBottom: 20,
          }}
        >
          {error}
        </p>
      )}

      {/* EMPTY */}
      {!loading && items.length === 0 && (
        <p
          style={{
            color: "#666",
          }}
        >
          Belum ada hasil pencarian
        </p>
      )}

      {/* GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fill,minmax(220px,1fr))",
          gap: 20,
        }}
      >
        {items.map((item) => (
          <Link
            key={item.slug}
            href={`/detail/${item.slug}`}
            style={{
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              style={{
                border: "1px solid #e5e5e5",
                borderRadius: 12,
                overflow: "hidden",
                background: "#fff",
                transition: "0.2s",
                height: "100%",
              }}
            >
              {/* IMAGE */}
              <Image
                src={item.thumbnail}
                alt={item.title}
                width={300}
                height={400}
                unoptimized
                style={{
                  width: "100%",
                  height: 320,
                  objectFit: "cover",
                }}
              />

              {/* CONTENT */}
              <div style={{ padding: 14 }}>
                <h3
                  style={{
                    fontSize: 16,
                    marginBottom: 10,
                    lineHeight: 1.4,
                  }}
                >
                  {item.title}
                </h3>

                <p
                  style={{
                    fontSize: 14,
                    color: "#666",
                    lineHeight: 1.5,
                    marginBottom: 12,
                  }}
                >
                  {item.description?.slice(0, 100)}...
                </p>

                {/* TAGS */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                  }}
                >
                  {item.tags?.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: 12,
                        padding: "4px 8px",
                        background: "#f3f3f3",
                        borderRadius: 20,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
