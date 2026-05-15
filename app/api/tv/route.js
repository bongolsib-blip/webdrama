const API_KEY = "ztatv_8ef9a9b28e724cbbd87f068510228c4fd54e3925";
const BASE_API = "https://api.nexoratv.qzz.io/api";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");

  if (!path) return Response.json({ error: "No path provided" }, { status: 400 });

  // 1. Bersihkan path agar tidak terjadi double /api
  const cleanPath = path.startsWith("/api") ? path.replace("/api", "") : path;
  
  // 2. Susun URL Upstream
  const url = new URL(`${BASE_API}${cleanPath}`);
  searchParams.forEach((v, k) => {
    if (k !== "path") url.searchParams.append(k, v);
  });

  try {
    const upstream = await fetch(url.toString(), {
      headers: { 
        "x-api-key": API_KEY,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
    });

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key",
    };

    // Langsung kembalikan stream body (lebih hemat RAM & stabil untuk HLS)
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/octet-stream",
        "Cache-Control": "public, s-maxage=30",
        ...corsHeaders,
      },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key",
    },
  });
}
