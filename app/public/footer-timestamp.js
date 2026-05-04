// Last-updated timestamp.
//
// Per page, fetches the most recent commit touching that page's source path
// from the GitHub API and renders the date into #last-updated. Same runtime
// pattern as doublement-aliene.daqhris.com — no build-time embed, no static
// regeneration needed; each page reflects its own source-file commit date.
//
// Privacy note: this fetch is the only network request these pages make
// beyond the static asset CDN. Each visitor's browser contacts
// api.github.com once per page; no analytics, no cookies, no logging by
// the publisher. If the call fails (offline, rate-limited, CSP-blocked),
// the element keeps the static fallback text it shipped with.

const REPO = "daqhris/god-bless-usa";

function formatLongDate(iso) {
  // "April 27, 2026" — matches the printlab.awalkaday.art convention.
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function updateLastUpdated() {
  const el = document.getElementById("last-updated");
  if (!el) return;
  const path = el.dataset.sourcePath;
  if (!path) return;

  const url =
    "https://api.github.com/repos/" +
    REPO +
    "/commits?path=" +
    encodeURIComponent(path) +
    "&per_page=1";

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return;
    const date = data[0].commit && data[0].commit.committer && data[0].commit.committer.date;
    if (!date) return;
    el.textContent = "Date of last modification: " + formatLongDate(date);
  } catch {
    // Network error or CSP block — keep the fallback text in the element.
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", updateLastUpdated);
} else {
  updateLastUpdated();
}
