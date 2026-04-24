// Visitor-facing player for "God Bless The United States Of Aliens".
// Three states: landing → playing → ended. Single audio element. No looping,
// no progress UI, no scrubbing — the piece is a ceremony, not a media file.

const stages = ["landing", "playing", "ended"];
const audio = document.getElementById("master-audio");
const beginBtn = document.getElementById("begin");
const escapeBtn = document.getElementById("escape");

function show(stage) {
  for (const id of stages) {
    const el = document.getElementById("stage-" + id);
    if (el) el.hidden = id !== stage;
  }
  // Scroll to top so the visitor's eye lands on the new stage rather than
  // a leftover scroll position.
  window.scrollTo({ top: 0, behavior: "instant" });
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
  const prep = document.querySelector("#stage-landing .prep");
  if (prep) {
    prep.textContent =
      "The ceremony's audio could not load. Check your connection and reload the page.";
  }
  beginBtn.textContent = "Reload to retry";
  beginBtn.disabled = true;
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
    show("landing");
    const prep = document.querySelector("#stage-landing .prep");
    if (prep) {
      prep.textContent =
        "Playback could not start. Check your connection and try again.";
    }
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
