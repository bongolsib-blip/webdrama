"use client";

import Link from "next/link";

export default function Row({ title, items }) {
  return (
    <div style={{ marginBottom: 30 }}>
      <h2 style={{ marginBottom: 10 }}>{title}</h2>

      <div style={rowStyle}>
        {items.map((item, i) => (
          <Link key={i} href={`/detail/${item.slug}`} style={{ textDecoration: "none" }}>
            <div style={cardStyle}>
              <img src={item.thumbnail} style={imgStyle} />

              <div style={infoStyle}>
                <p style={titleStyle}>{item.title}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

const rowStyle = {
  display: "flex",
  overflowX: "auto",
  gap: 10,
};

const cardStyle = {
  minWidth: 140,
  background: "#1a1a1a",
  borderRadius: 8,
  overflow: "hidden",
  transition: "0.2s",
};

const imgStyle = {
  width: "100%",
  height: 200,
  objectFit: "cover",
};

const infoStyle = {
  padding: 8,
};

const titleStyle = {
  fontSize: 12,
  color: "#fff",
};
