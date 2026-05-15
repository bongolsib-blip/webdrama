const API_KEY = "ztatv_8ef9a9b28e724cbbd87f068510228c4fd54e3925";
const BASE    = "https://api.nexoratv.qzz.io/api";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path") || "/v1/channels";

  const forward = new URLSearchParams();
  for (const [k, v] of searchParams.entries()) {
    if (k !== "path") forward.set(k, v);
  }
  const qs  = forward.toString();
  const url = `${BASE}${path}${qs ? "?" + qs : ""}`;

  try {
    const upstream = await fetch(url, {
      headers: { "x-api-key": API_KEY },
    });

    const contentType = upstream.headers.get("content-type") || "";
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "x-api-key, content-type",
    };

    // Stream biner (HLS segments, dll) — pipe langsung
    if (
      contentType.includes("video/") ||
      contentType.includes("mpegurl") ||
      contentType.includes("octet-stream") ||
      path.startsWith("/stream/")
    ) {
      const body = await upstream.arrayBuffer();
      return new Response(body, {
        status: upstream.status,
        headers: { "Content-Type": contentType, ...corsHeaders },
      });
    }

    // JSON
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=30",
        ...corsHeaders,
      },
    });
  } catch (err) {
    return Response.json(
      { error: "Proxy error", detail: err.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

// Preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "x-api-key, content-type",
    },
  });
}
