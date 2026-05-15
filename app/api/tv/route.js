// /app/api/tv/route.js

const API_KEY = "ztatv_8ef9a9b28e724cbbd87f068510228c4fd54e3925";
const BASE_API = "https://api.nexoratv.qzz.io";

// ==========================================
// MAIN PROXY
// ==========================================
async function proxyRequest(request, method = "GET") {
  try {
    const requestUrl = new URL(request.url);
    const searchParams = requestUrl.searchParams;

    let path = searchParams.get("path");

    if (!path) {
      return Response.json(
        { error: "No path provided" },
        { status: 400 }
      );
    }

    // ==========================================
    // HANDLE DRM DATA URL
    // ==========================================
    if (path.startsWith("data:")) {
      const base64Data = path.split(",")[1] || "";

      return new Response(base64Data, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // ==========================================
    // BUILD TARGET URL
    // ==========================================
    let targetUrl;

    // absolute URL
    if (
      path.startsWith("http://") ||
      path.startsWith("https://")
    ) {
      targetUrl = new URL(path);
    } else {
      // relative DASH/HLS segment
      targetUrl = new URL(path, BASE_API);
    }

    // append additional query params
    searchParams.forEach((value, key) => {
      if (key !== "path") {
        targetUrl.searchParams.append(key, value);
      }
    });

    // ==========================================
    // FORWARD REQUEST BODY
    // ==========================================
    let body = undefined;

    if (
      method !== "GET" &&
      method !== "HEAD"
    ) {
      body = await request.arrayBuffer();
    }

    // ==========================================
    // COPY REQUEST HEADERS
    // ==========================================
    const reqHeaders = new Headers();

    reqHeaders.set("x-api-key", API_KEY);

    reqHeaders.set(
      "User-Agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    );

    reqHeaders.set("Accept", "*/*");

    // forward range request
    const range = request.headers.get("range");
    if (range) {
      reqHeaders.set("Range", range);
    }

    // ==========================================
    // FETCH UPSTREAM
    // ==========================================
    const upstream = await fetch(targetUrl.toString(), {
      method,
      headers: reqHeaders,
      body,
      redirect: "follow",
    });

    // ==========================================
    // RESPONSE HEADERS
    // ==========================================
    const headers = new Headers();

    headers.set(
      "Content-Type",
      upstream.headers.get("Content-Type") ||
        "application/octet-stream"
    );

    headers.set(
      "Access-Control-Allow-Origin",
      "*"
    );

    headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, OPTIONS"
    );

    headers.set(
      "Access-Control-Allow-Headers",
      "*"
    );

    headers.set(
      "Access-Control-Expose-Headers",
      "*"
    );

    headers.set(
      "Cache-Control",
      "public, s-maxage=60"
    );

    // IMPORTANT FOR VIDEO STREAMING
    const contentLength =
      upstream.headers.get("Content-Length");

    if (contentLength) {
      headers.set(
        "Content-Length",
        contentLength
      );
    }

    const contentRange =
      upstream.headers.get("Content-Range");

    if (contentRange) {
      headers.set(
        "Content-Range",
        contentRange
      );
    }

    const acceptRanges =
      upstream.headers.get("Accept-Ranges");

    if (acceptRanges) {
      headers.set(
        "Accept-Ranges",
        acceptRanges
      );
    }

    // ==========================================
    // RETURN STREAM
    // ==========================================
    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (err) {
    console.error("Proxy Error:", err);

    return Response.json(
      {
        error: err.message,
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}

// ==========================================
// METHODS
// ==========================================

export async function GET(request) {
  return proxyRequest(request, "GET");
}

export async function POST(request) {
  return proxyRequest(request, "POST");
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods":
        "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
