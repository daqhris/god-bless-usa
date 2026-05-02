// Biennale countdown / status indicator.
//
// Privacy-clean by construction: pure client-side, runs once on page load,
// no server endpoint, no tracking, no observation of the visitor. Updates
// the text inside #biennale-status; falls back to the element's static
// fallback text if the script fails to load (graceful degradation).
//
// State machine:
//   - Before May 8 2026 19:00 → "N days until public opening — May 9, 2026.
//                                Pavilion vernissage May 8, 19:00."
//   - May 8 19:00 → May 9     → "Pavilion vernissage tonight. Public opening
//                                tomorrow at Palazzo Malipiero."
//   - May 9 → Nov 22 2026     → "On view at Palazzo Malipiero. Day N of the
//                                61st Biennale."
//   - After Nov 22, 2026      → "The 61st Biennale closed on November 22, 2026.
//                                The performance was on view from May 9 to
//                                November 22."

// La Biennale di Venezia opens to the public on May 9, 2026. The pavilion's
// own vernissage (Domus Diasporica's official opening event at Palazzo
// Malipiero) is the night before, Friday May 8 at 19:00 — confirmed by the
// pavilion's exhibition trailer.
const VERNISSAGE = new Date("2026-05-08T19:00:00+02:00"); // CEST
const OPENING = new Date("2026-05-09T00:00:00+02:00"); // CEST
const CLOSING = new Date("2026-11-23T00:00:00+01:00"); // CET (day after Nov 22)

function pluralDays(n) {
  return n === 1 ? "1 day" : n + " days";
}

function updateBiennaleStatus() {
  const el = document.getElementById("biennale-status");
  if (!el) return;
  const now = new Date();

  if (now < VERNISSAGE) {
    const days = Math.ceil((OPENING - now) / 86400000);
    el.textContent =
      pluralDays(days) +
      " until public opening — May 9, 2026. " +
      "Pavilion vernissage Friday May 8, 19:00 at Palazzo Malipiero.";
  } else if (now < OPENING) {
    el.textContent =
      "Pavilion vernissage tonight at Palazzo Malipiero. " +
      "Public opening tomorrow, May 9, 2026.";
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
