// script.js
// Core functionality for AstroLens:
// - Theme toggle: persist day/night mode to localStorage
// - APOD integration: fetch NASA image of the day from Netlify function or client-side fallbacks
// - Grid hover fallback: enhance card grid interactions for older browsers

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initGridHoverFallback();
  initAPOD();
});

/**
 * Initialize and apply theme based on saved preference or system preference.
 * Persists selection to localStorage for future visits.
 */
function initThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;

  const saved = localStorage.getItem("site-theme");
  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  let theme = saved || (prefersDark ? "night" : "day");

  applyTheme(theme);

  btn.addEventListener("click", () => {
    theme = theme === "night" ? "day" : "night";
    applyTheme(theme);
    localStorage.setItem("site-theme", theme);
  });
}

/**
 * Apply theme class to body and update toggle button state.
 * @param {string} theme - Either "day" or "night"
 */
function applyTheme(theme) {
  document.body.classList.remove("theme-day", "theme-night");
  if (theme === "day") {
    document.body.classList.add("theme-day");
    const btn = document.getElementById("theme-toggle");
    if (btn) btn.setAttribute("aria-pressed", "false");
  } else {
    document.body.classList.add("theme-night");
    const btn = document.getElementById("theme-toggle");
    if (btn) btn.setAttribute("aria-pressed", "true");
  }
}

/**
 * Enhance card grid interactions for browsers that don't support CSS :has().
 * Adds/removes grid-hover-only class based on pointer events.
 */
function initGridHoverFallback() {
  const grid = document.querySelector(".card-grid");
  if (!grid) return;

  // If browser supports :has in CSS we already used progressive enhancement.
  // This JS provides a fallback for older browsers.
  let overTile = false;

  grid.addEventListener("pointerenter", () => {
    if (!overTile) grid.classList.add("grid-hover-only");
  });
  grid.addEventListener("pointerleave", () =>
    grid.classList.remove("grid-hover-only")
  );

  grid.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("pointerenter", () => {
      overTile = true;
      grid.classList.remove("grid-hover-only");
    });
    card.addEventListener("pointerleave", () => {
      overTile = false;
      grid.classList.add("grid-hover-only");
    });
  });
}

/**
 * Fetch NASA Astronomy Picture of the Day (APOD) and render into #apod-area.
 * Tries multiple sources in priority order:
 * 1. Netlify serverless function (/.netlify/functions/apod) - recommended for production
 * 2. Local API proxy (/api/apod) - for custom server setups
 * 3. Client-side config (window.NASA_API_KEY from config.js) - local development only
 * 4. Meta tag (nasa-api-key) - fallback
 * 5. Temporary demo key - final fallback
 */
async function initAPOD() {
  const area = document.getElementById("apod-area");
  if (!area) return;

  try {
    // Try Netlify function first (recommended: runs server-side with secure env vars)
    try {
      const res = await fetch("/.netlify/functions/apod");
      if (res && res.ok) {
        const data = await res.json();
        renderApod(area, data);
        return;
      }
    } catch (err) {
      console.debug("Netlify function not available", err.message);
    }

    // Fall back to local proxy if available
    try {
      const res = await fetch("/api/apod");
      if (res && res.ok) {
        const data = await res.json();
        renderApod(area, data);
        return;
      }
    } catch (err) {
      console.debug("Local API proxy not available", err.message);
    }

    // Client-side fallback (WARNING: keys exposed to users; for dev/testing only)
    const clientKey =
      typeof window !== "undefined" &&
      (window.NASA_API_KEY || window.CLIENT_NASA_API_KEY)
        ? window.NASA_API_KEY || window.CLIENT_NASA_API_KEY
        : null;

    const metaKey = document
      .querySelector('meta[name="nasa-api-key"]')
      ?.getAttribute("content");

    const apiKey = clientKey || metaKey || "hdjf";

    const res = await fetch(
      `https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(
        apiKey
      )}`
    );
    if (!res.ok) throw new Error(`APOD fetch failed: ${res.status}`);
    const data = await res.json();
    renderApod(area, data);
  } catch (e) {
    area.innerHTML = '<p class="muted">Unable to load NASA APOD.</p>';
    console.warn("APOD initialization error:", e);
  }
}

/**
 * Render APOD data into the provided DOM element.
 * Supports both image and video media types.
 * @param {HTMLElement} area - Target element for APOD content
 * @param {Object} data - APOD API response object
 */
function renderApod(area, data) {
  // Build markup: if image, show image; if video, show link
  let html = `<h4>${escapeHtml(data.title || "NASA APOD")}</h4>`;
  if (data.media_type === "image") {
    html += `<img src="${escapeHtml(data.url)}" alt="${escapeHtml(
      data.title
    )}">`;
  } else if (data.media_type === "video") {
    html += `<a href="${escapeHtml(
      data.url
    )}" target="_blank" rel="noopener">View video</a>`;
  }
  if (data.explanation)
    html += `<p class="muted">${escapeHtml(
      data.explanation.slice(0, 200)
    )}...</p>`;
  area.innerHTML = html;
}

/**
 * Escape HTML special characters to prevent XSS attacks.
 * @param {string} s - String to escape
 * @returns {string} - Escaped string safe for HTML insertion
 */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
