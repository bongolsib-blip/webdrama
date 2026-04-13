
export const metadata = {
  title: "Drama Streaming",
  description: "Streaming drama app"
};

export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
