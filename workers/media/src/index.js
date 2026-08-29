const ALLOWED_PREFIX = "periodicals/";

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: {
          Allow: "GET, HEAD"
        }
      });
    }

    const url = new URL(request.url);

    let key;

    try {
      key = decodeURIComponent(
        url.pathname.replace(/^\/+/, "")
      );
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    if (!key || !key.startsWith(ALLOWED_PREFIX)) {
      return new Response("Not Found", { status: 404 });
    }

    const object = await env.MEDIA.get(key);

    if (!object) {
      return new Response("Not Found", { status: 404 });
    }

    const headers = new Headers();

    object.writeHttpMetadata(headers);

    headers.set("etag", object.httpEtag);
    headers.set(
      "Cache-Control",
      "public, max-age=3600, s-maxage=86400"
    );
    headers.set("X-Content-Type-Options", "nosniff");

    if (request.method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers
      });
    }

    return new Response(object.body, {
      status: 200,
      headers
    });
  }
};
