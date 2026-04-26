// Biennale countdown / status indicator.
//
// Privacy-clean by construction: pure client-side, runs once on page load,
// no server endpoint, no tracking, no observation of the visitor. Updates
// the text inside #biennale-status; falls back to the element's static
// fallback text if the script fails to load (graceful degradation).
//
// State machine:
//   - Before May 9, 2026  → "N days until the 61st Biennale opens — May 9, 2026."
//   - May 9 → Nov 22 2026 → "On view at Palazzo Malipiero. Day N of the 61st Biennale."
//   - After Nov 22, 2026  → "The 61st Biennale closed on November 22, 2026. The
//                            performance was on view from May 9 to November 22."

// La Biennale di Venezia opens to the public on May 9, 2026 (after the
// vernissage week). Closing dinner is November 22 — the next day the piece
// is no longer "on view."
const OPENING = new Date("2026-05-09T00:00:00+02:00"); // CEST
const CLOSING = new Date("2026-11-23T00:00:00+01:00"); // CET (day after Nov 22)

function pluralDays(n) {
  return n === 1 ? "1 day" : n + " days";
}

function updateBiennaleStatus() {
  const el = document.getElementById("biennale-status");
  if (!el) return;
  const now = new Date();

  if (now < OPENING) {
    const days = Math.ceil((OPENING - now) / 86400000);
    el.textContent =
      pluralDays(days) +
      " until the 61st International Art Exhibition opens — May 9, 2026.";
  } else if (now < CLOSING) {
    const day = Math.floor((now - OPENING) / 86400000) + 1;
    el.textContent =
      "On view at Palazzo Malipiero. Day " +
      day +
      " of the 61st International Art Exhibition.";
  } else {
    el.textContent =
      "The 61st International Art Exhibition closed on November 22, 2026. " +
      "The performance was on view from May 9 to November 22, 2026.";
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", updateBiennaleStatus);
} else {
  updateBiennaleStatus();
}
