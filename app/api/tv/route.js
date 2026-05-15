const API_KEY = "ztatv_8ef9a9b28e724cbbd87f068510228c4fd54e3925";
const BASE = "https://api.nexoratv.qzz.io/api";

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  // endpoint: /api/tv?path=/v1/channels&category=nasional
  const path = searchParams.get("path") || "/v1/channels";

  // forward semua query param kecuali "path"
  const forward = new URLSearchParams();
  for (const [k, v] of searchParams.entries()) {
    if (k !== "path") forward.set(k, v);
  }

  const qs = forward.toString();
  const url = `${BASE}${path}${qs ? "?" + qs : ""}`;

  try {
    const res = await fetch(url, {
      headers: { "x-api-key": API_KEY },
      // cache 30 detik agar tidak boros kuota
      next: { revalidate: 30 },
    });

    const data = await res.json();

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
      { status: 500 }
    );
  }
}
