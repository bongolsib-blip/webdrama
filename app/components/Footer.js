export default function Footer() {
  return (
    <footer style={styles.wrap}>
      <div style={styles.container}>

        {/* HERO */}
        <div style={styles.hero}>
          <h2>Nonton Drama Gratis Subtitle Bahasa Indonesia</h2>
          <p>
            Temukan short drama terbaru, streaming cepat, dan update episode lengkap tanpa download aplikasi.
          </p>
        </div>

        {/* GRID */}
        <div style={styles.grid}>

          {/* BRAND */}
          <div>
            
            <p style={styles.text}>
              Web Drama adalah platform streaming drama pendek dengan subtitle Bahasa Indonesia.
            </p>
          </div>

          {/* LINK */}
          <div>
            <h4>Jalan Pintas</h4>
            <div style={styles.links}>
              <a >Beranda</a>
              <a >Unggulan</a>
              <a >Populer</a>
            </div>
          </div>

          {/* KATEGORI */}
          <div>
            <h4>Kategori Cepat</h4>
            <div style={styles.links}>
              <a>Pernikahan</a>
              <a>Romansa</a>
              <a>Urban</a>
            </div>
          </div>

          {/* TAG */}
          <div>
            <h4>Tag Populer</h4>
            <div style={styles.tags}>
              {[
                "balas dendam",
                "Romantis",
                "Modern",
                "Gratis",
                "CEO",
                "Keluarga"
              ].map(tag => (
                <span key={tag} style={styles.tag}>#{tag}</span>
              ))}
            </div>
          </div>

        </div>

        {/* BOTTOM */}
        <div style={styles.bottom}>
          © 2026 BongolSIb
        </div>

      </div>
    </footer>
  );
}

const styles = {
  wrap: {
    background: "#0a0a0a",
    color: "#ccc",
    padding: "40px 20px",
  },
  container: {
    maxWidth: 1200,
    margin: "auto"
  },
  hero: {
    marginBottom: 30
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))",
    gap: 20
  },
  links: {
    display: "flex",
    flexDirection: "column",
    gap: 6
  },
  tags: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8
  },
  tag: {
    background: "#222",
    padding: "5px 10px",
    borderRadius: 6,
    fontSize: 12
  },
  text: {
    fontSize: 13,
    color: "#aaa"
  },
  bottom: {
    marginTop: 30,
    borderTop: "1px solid #222",
    paddingTop: 15,
    fontSize: 12
  }
};
