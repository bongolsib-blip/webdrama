"use client";

import { useEffect, useState } from "react";
import Row from "@/components/Row";

export default function Home() {
  const [items, setItems] = useState([]);
  const [featured, setFeatured] = useState(null);

  const loadData = async () => {
    const res = await fetch("https://drama-liart.vercel.app/list?page=1");
    const data = await res.json();

    const list = data?.data?.items || [];

    setItems(list);
    setFeatured(list[0]);
  };

  useEffect(() => {
    loadData();
  }, []);

  // 🔥 CONTINUE WATCHING (localStorage)
  const continueWatching =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("continue") || "[]")
      : [];

  return (
    <div style={{ background: "#0f0f0f", color: "white", minHeight: "100vh" }}>
      
      {/* HERO */}
      {featured && (
        <div style={heroStyle}>
          <img src={featured.thumbnail} style={heroImg} />

          <div style={heroOverlay}>
            <h1>{featured.title}</h1>
          </div>
        </div>
      )}

      <div style={{ padding: 20 }}>
        {/* CONTINUE WATCHING */}
        {continueWatching.length > 0 && (
          <Row title="Continue Watching" items={continueWatching} />
        )}

        {/* MAIN ROW */}
        <Row title="Popular Drama" items={items} />

        {/* DUPLICATE ROW (fake category) */}
        <Row title="Latest Episode" items={items.slice(5)} />
      </div>
    </div>
  );
}

/* STYLE */
const heroStyle = {
  height: 300,
  position: "relative",
};

const heroImg = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const heroOverlay = {
  position: "absolute",
  bottom: 20,
  left: 20,
};
