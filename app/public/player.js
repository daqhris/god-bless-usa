// Visitor-facing player for "God Bless The United States Of Aliens".
// Three states: landing → playing → ended. Single audio element. No looping,
// no progress UI, no scrubbing — the piece is a ceremony, not a media file.

const stages = ["landing", "playing", "ended"];
const audio = document.getElementById("master-audio");
const beginBtn = document.getElementById("begin");
const escapeBtn = document.getElementById("escape");
const announce = document.getElementById("stage-announce");

// One-sentence stage announcement read by the polite live region in
// index.html. Kept short — visually-impaired visitors get the same
// "where am I in the ceremony?" cue a sighted visitor reads from the
// stage chrome.
const STAGE_ANNOUNCE = {
  landing: "Ready. Press Begin to start the ceremony.",
  playing: "The performance is playing. Press End to exit.",
  ended: "The performance is complete.",
};

// Where keyboard focus should land after a stage transition. landing only
// receives focus when the visitor steps back from playing — on the first
// page load the natural starting point is wherever the document opens, so
// landing is null. Playing focuses the End button so Escape works without
// needing to Tab in. Ended focuses the heading so a screen reader reads
// "The performance is complete" on arrival.
const STAGE_FOCUS = {
  landing: () => beginBtn,
  playing: () => escapeBtn,
  ended: () => document.getElementById("ended-heading"),
};

function show(stage) {
  for (const id of stages) {
    const el = document.getElementById("stage-" + id);
    if (el) el.hidden = id !== stage;
  }
  // Scroll to top so the visitor's eye lands on the new stage rather than
  // a leftover scroll position.
  window.scrollTo({ top: 0, behavior: "instant" });

  if (announce) announce.textContent = STAGE_ANNOUNCE[stage] || "";

  // Defer focus to the next frame: the previous stage's now-hidden button
  // can lose focus first, and the new stage's element is laid out before
  // we move focus onto it. preventScroll keeps the viewport at the top
  // we just set above.
  const target = STAGE_FOCUS[stage] && STAGE_FOCUS[stage]();
  if (target && typeof target.focus === "function") {
    requestAnimationFrame(() => target.focus({ preventScroll: true }));
  }
}

// Reason we gate Begin: with preload="auto" the browser starts fetching the
// Opus/AAC master on page load. On 4G the opening bell peal + organ drone is
// low-amplitude and silently skips if playback starts before enough has
// buffered. We only un-gate once the browser reports it can play through, so
// the first sound a visitor hears is Scene 0's first toll — not silence.
let armed = false;
function armBegin() {
  if (armed) return;
  armed = true;
  beginBtn.disabled = false;
  beginBtn.textContent = "Begin";
  // Mirror the visible "Loading…" → "Begin" cue for screen-reader users
  // so they hear the same arming moment a sighted visitor sees.
  if (announce) announce.textContent = STAGE_ANNOUNCE.landing;
}

audio.addEventListener("canplaythrough", armBegin, { once: true });

// Safety net — some mobile browsers fire canplay but delay canplaythrough
// indefinitely on a stable connection. After canplay + a short grace window
// we trust there's enough buffer to cover the opening.
audio.addEventListener(
  "canplay",
  () => {
    setTimeout(armBegin, 2500);
  },
  { once: true },
);

audio.addEventListener("error", () => {
  const message =
    "The ceremony's audio could not load. Check your connection and reload the page.";
  const prep = document.querySelector("#stage-landing .prep");
  if (prep) prep.textContent = message;
  beginBtn.textContent = "Reload to retry";
  beginBtn.disabled = true;
  if (announce) announce.textContent = message;
});

async function begin() {
  // The browser requires a user gesture to start audio with sound. The Begin
  // click satisfies that requirement; no autoplay anywhere else in the flow.
  if (beginBtn.disabled) return;
  show("playing");
  try {
    await audio.play();
  } catch (err) {
    console.error("playback failed:", err);
    const message =
      "Playback could not start. Check your connection and try again.";
    show("landing");
    const prep = document.querySelector("#stage-landing .prep");
    if (prep) prep.textContent = message;
    // Override the "Ready" announcement show("landing") just wrote — the
    // visitor needs to hear the failure, not an invitation to re-Begin.
    if (announce) announce.textContent = message;
  }
}

function escape() {
  // Soft exit during playback — pauses and returns to landing without
  // marking the piece as completed. Visitor can re-Begin if they want.
  audio.pause();
  audio.currentTime = 0;
  show("landing");
}

beginBtn?.addEventListener("click", begin);
escapeBtn?.addEventListener("click", escape);

audio.addEventListener("ended", () => {
  show("ended");
});

// Keyboard: space/enter on landing begins; escape on playing exits.
document.addEventListener("keydown", (ev) => {
  const landing = document.getElementById("stage-landing");
  const playing = document.getElementById("stage-playing");
  if (landing && !landing.hidden && (ev.key === "Enter" || ev.key === " ")) {
    ev.preventDefault();
    begin();
  } else if (playing && !playing.hidden && ev.key === "Escape") {
    ev.preventDefault();
    escape();
  }
});
