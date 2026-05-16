// Proxy HANYA untuk request JSON (channel list, EPG, DASH info)
// HLS streaming langsung dari hls.js pakai xhrSetup — tidak lewat sini

const API_KEY = "ztatv_8ef9a9b28e724cbbd87f068510228c4fd54e3925";
const BASE    = "https://api.nexoratv.qzz.io/api";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path") || "/v1/channels";

  const forward = new URLSearchParams();
  for (const [k, v] of searchParams.entries()) {
    if (k !== "path") forward.set(k, v);
  }
  const url = `${BASE}${path}${forward.toString() ? "?" + forward.toString() : ""}`;

  try {
    const res  = await fetch(url, { headers: { "x-api-key": API_KEY } });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, s-maxage=30",
      },
    });
  } catch (err) {
    return Response.json({ error: err.message }, {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
