const API_KEY = "ztatv_8ef9a9b28e724cbbd87f068510228c4fd54e3925";
const BASE    = "https://api.nexoratv.qzz.io/api";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path") || "/v1/channels";

  // forward semua param kecuali "path"
  const forward = new URLSearchParams();
  for (const [k, v] of searchParams.entries()) {
    if (k !== "path") forward.set(k, v);
  }
  const qs  = forward.toString();
  const url = `${BASE}${path}${qs ? "?" + qs : ""}`;

  try {
    const res = await fetch(url, {
      headers: { "x-api-key": API_KEY },
      next: { revalidate: 30 },
    });

    // Untuk stream (HLS/DASH), pipe binary langsung ke client
    const contentType = res.headers.get("content-type") || "";
    if (
      contentType.includes("application/vnd.apple.mpegurl") ||
      contentType.includes("application/x-mpegurl") ||
      contentType.includes("video/") ||
      path.includes("/stream/")
    ) {
      const body = await res.arrayBuffer();
      return new Response(body, {
        status: res.status,
        headers: {
          "Content-Type": contentType || "application/octet-stream",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Untuk JSON biasa
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // Jika bukan JSON (misal EPG 404 teks), kembalikan error terstruktur
      return Response.json(
        { error: true, status: res.status, message: text.slice(0, 200) },
        { status: res.status, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    return Response.json(data, {
      status: res.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    return Response.json(
      { error: "Proxy error", detail: err.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
