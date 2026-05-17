export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== "/status") {
      return new Response("Not found", { status: 404 });
    }

    const flight = (url.searchParams.get("flight") || "").toUpperCase();
    if (!/^HKE\d{3,4}$/.test(flight)) {
      return json({ error: "invalid flight" }, 400);
    }

    const sourceUrl = `https://www.flightaware.com/live/flight/${flight}`;
    try {
      const resp = await fetch(sourceUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; TripStatusBot/1.0; +https://example.com)",
          Accept: "text/html",
        },
      });
      const html = await resp.text();

      const status =
        pick(html, /"flightStatus"\s*:\s*"([^"]+)"/i) ||
        pick(html, /Status[^<]{0,30}<\/[^>]+>\s*<[^>]+>\s*([^<]{2,80})</i) ||
        "Unknown";

      const depTime =
        pick(html, /Departure[^<]{0,40}<[^>]+>\s*([^<]{2,40})</i) || "";
      const arrTime =
        pick(html, /Arrival[^<]{0,40}<[^>]+>\s*([^<]{2,40})</i) || "";

      return json({
        flight,
        status: clean(status),
        departure: clean(depTime),
        arrival: clean(arrTime),
        sourceUrl,
        fetchedAt: new Date().toISOString(),
      });
    } catch (e) {
      return json(
        {
          flight,
          error: "fetch_failed",
          message: String(e && e.message ? e.message : e),
          sourceUrl,
        },
        502
      );
    }
  },
};

function pick(text, re) {
  const m = text.match(re);
  return m && m[1] ? m[1] : "";
}

function clean(s) {
  return String(s).replace(/\s+/g, " ").trim();
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
    },
  });
}
