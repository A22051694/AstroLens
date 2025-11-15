// Netlify Function: apod
// Reads NASA_API_KEY from Netlify environment variables (set in Site settings)
// and proxies the APOD request to NASA so the key is never exposed to clients.

exports.handler = async function (event) {
  const apiKey = process.env.NASA_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "NASA_API_KEY not configured on Netlify" }),
    };
  }

  try {
    // Use global fetch available in Netlify Node 18+ runtimes
    const r = await fetch(
      `https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(
        apiKey
      )}`
    );
    if (!r.ok) {
      const text = await r.text();
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "NASA fetch failed", details: text }),
      };
    }
    const data = await r.json();
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err) {
    console.error("apod function error", err);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: "APOD proxy error" }),
    };
  }
};
