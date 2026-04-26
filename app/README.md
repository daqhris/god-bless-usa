# /app — God Bless USA performance app

The digital artifact: an AI-voiced web performance of *"God Bless The United States Of Aliens — An All-Seeing Eyewitness Report."* **Live at [daqhris.com/god-bless-usa/](https://daqhris.com/god-bless-usa/).**

- **Source material** at the repository root (story, script, PDFs) is **not rewritten** — this app renders it.
- **Submission:** [Build with Opus 4.7](https://cerebralvalley.ai/e/built-with-4-7-hackathon) hackathon (Cerebral Valley × Anthropic, April 21–26, 2026).
- **Exhibition:** A guest work in ***Domus Diasporica*** by **Mladen Bundalo** — Pavilion of Bosnia and Herzegovina at the 61st International Art Exhibition — La Biennale di Venezia. Commissioned by **Sarita Vujković**; curated by **Isidora Živković**. 61st Biennale theme: *In Minor Keys*, curated by **Koyo Kouoh**. Venue: Palazzo Malipiero, San Marco 3198, Venice. Dates: **May 9 – November 22, 2026**.
- **Licence:** Open-source, MIT. Museum-archivable as a single self-contained folder.

## Architecture

```
performance script (.md at repo root)
        │
        │  one scene at a time
        ▼
┌─────────────────────────────────┐
│  DIRECTOR  (Claude Opus 4.7)    │   src/director
│  reads the scene, emits         │   — system prompt (cached)
│  structured direction:          │   — Zod output schema
│    speech | silence | ambient   │   — per-voice briefs
│  with SSML + sound design       │
└──────────────┬──────────────────┘
               │  direction JSON
               ▼
┌─────────────────────────────────┐
│  VOICE ADAPTER                  │   src/voices
│  SSML → 24 kHz mono WAV         │   PR #2: Kokoro-82M (primary)
│  primary: Kokoro-82M            │   fallbacks stay as interface-
│  fallback: CosyVoice 2, Chatter │   level options for later PRs
└──────────────┬──────────────────┘
               │  public/assets/audio/<scene>.wav
               ▼
┌─────────────────────────────────┐
│  STATIC WEB PLAYER (public/)    │   served locally with `npm run serve`
│  canonical pre-rendered audio   │   same folder will be published by
│                                 │   GitHub Pages in a later PR
└─────────────────────────────────┘
```

The director is **engine-agnostic** by design: Opus 4.7 produces SSML and sound-design hints; a swappable adapter turns SSML into audio. We can fall back between Kokoro / CosyVoice 2 / Chatterbox per voice or per scene without touching the director.

## Will it run on GitHub Pages? Do we need local infrastructure?

**Short answer: yes to both.** The canonical exhibition experience is pre-rendered static files that GitHub Pages serves fine. Local infrastructure still matters — for iteration speed, for exhibition resilience (wifi flakiness in Venice is real), and for museum-grade offline archivability.

**GitHub Pages as a host.** Pages serves static files only. Our pipeline is:

- **Build-time (your laptop or CI)** — `npm run render:all` calls Claude Opus 4.7 as director, then Kokoro-82M as TTS. Both the direction JSON and the final `.wav` land under `public/`.
- **Runtime (Pages)** — static HTML + pre-rendered WAV, zero server, zero per-visit API cost. Museum-archivable as a single folder.

The only piece Pages can't host is the **live director mode** (the stretch half of our hybrid) — it would need to hold an `ANTHROPIC_API_KEY`. That lives behind a tiny serverless function (Cloudflare Workers or a Vercel edge function) in PR #5 and is kept separate from the Biennale URL.

**Local infrastructure.**

- `npm run serve` runs a static server on <http://localhost:5173> against the same `public/` folder that Pages will eventually publish. This gives a sub-second dev loop — essential during a hackathon week.
- The `public/` folder is self-contained. A USB stick or a Raspberry Pi serving it with any static server keeps the piece alive if Biennale wifi dies, or lets a museum archive the performance as an offline folder.
- Pages is just a public mirror of that folder; the folder is the object.

## Quick start

**Prerequisites:** Node.js ≥ 20.11 (kokoro-js relies on `import.meta.dirname`; `package.json` declares this via `engines`).

```bash
cd app
cp .env.example .env         # fill in ANTHROPIC_API_KEY
npm install

# Render ONE scene end-to-end (director + audio):
npm run render:all -- scenes/01-eyewitness.md

# Render ALL fifteen scenes (Opening Invocation + Scenes I–XIV) and concatenate
# them into the master WAV:
npm run render:all-scenes
# scenes play in the canonical order defined by DEFAULT_PLAYLIST in
#   src/playlist.ts — leader speaks, then chorus responds.
# flags:
#   --no-coda              → drop Scene XIV from the master
#   --no-master            → skip concatenation
#   --gap-ms 2000          → change inter-scene silence (default 3000 ms — gives each scene room to breathe)
#   --playlist <file.json> → override playlist with a JSON array of scene IDs

# Prepare the CC-BY Vatican bell sample — trim to the 15–40 s window,
# loudness-normalize, downmix to 24 kHz mono. The result blends into Scene 0
# automatically on the next render (no change needed if the file is absent —
# the synthesized peal is used as a fallback). Provide the path to the WAV
# downloaded from https://freesound.org/people/everythingsounds/sounds/197458/ :
npm run prepare:bell -- path/to/197458__everythingsounds__rome-vatican-changing.wav

# Re-render a single scene from its cached director JSON, without touching
# Claude — useful after changing ambient synthesis or voice mapping:
npm run render:audio -- dist/directions/00-opening.json

# Concatenate the per-scene WAVs into the master track without re-running
# the director. Use after `render:audio` on individual scenes:
npm run rebuild:master

# Compress every WAV under public/assets/audio/ to Opus (~32 kbps mono) and
# AAC (~64 kbps mono) alongside the originals. The visitor player prefers
# Opus, falls back to AAC on older iOS, and keeps WAV for archival:
npm run encode:audio

# Preview in a browser (same folder GitHub Pages will serve):
npm run serve
# open http://localhost:5173
```

First run downloads the Kokoro-82M ONNX model (~80 MB) into the HuggingFace transformers cache; subsequent runs are instant. A full 15-scene render on a modern CPU takes roughly 25–30 minutes (TTS-bound; the director calls are cached after scene 1). The resulting master is approximately eighteen minutes long.

**Rendering without an API key (fixtures).** Hand-crafted direction fixtures live under `scenes/fixtures/` — one per representative scene. You can render them to audio without calling Claude:

```bash
npm run render:audio -- scenes/fixtures/01-eyewitness.example.json    # Eyewitness
npm run render:audio -- scenes/fixtures/02-chorus-first.example.json  # Chorus ensemble
```

These validate the Kokoro adapter + SSML parser + WAV writer end-to-end at zero API cost, and specifically let reviewers hear the chorus layering and the synthesized drone without touching an Anthropic key.

## Opus 4.7 configuration (see `src/director/index.ts`)

- **Model:** `claude-opus-4-7` — no sampling parameters (removed on 4.7).
- **Thinking:** `{ type: "adaptive" }` — Opus 4.7's adaptive thinking is off by default; the director enables it because the task is intelligence-sensitive (poetic reading, voice casting, timing feel).
- **Effort:** `high` — minimum for intelligence-sensitive work on 4.7, reasonable cost/quality balance for a 15-scene batch.
- **Structured outputs:** `output_config.format` with a Zod schema (`DirectorOutputSchema`) — the model returns validated JSON, not prose-to-be-parsed.
- **Prompt caching:** `cache_control: { type: "ephemeral" }` on the system block — character briefs and sound-design framework stay stable across all 15 scenes, so the first scene writes the cache and the remaining fourteen read it.

## Kokoro configuration (see `src/voices/kokoro.ts`)

- **Model:** `onnx-community/Kokoro-82M-v1.0-ONNX` — 82M parameters, Apache-2.0, ONNX quantized (`q8`), runs on CPU.
- **Sample rate:** 24 kHz mono.
- **Voice map** (`src/voices/voice-map.ts`): EYEWITNESS → `af_heart` · CHURCH LEADER → `bm_george` · CHORUS → four-voice ensemble (see below) · PRAYING ALIEN → `af_nicole` (Kokoro's 🎧 intimate-headphone voice — fits an interior monologue that doesn't know it's being overheard).
- **SSML handling:** `<speak>` wrapper + `<break time="Nms"/>` for inline pauses. `<emphasis>…</emphasis>` is **honored** — the adapter renders emphasized phrases at 0.88× the segment's base speed, giving them landing weight (Kokoro has no native emphasis; slowing is the cleanest substitute). `<prosody>` is stripped — pacing lives in the segment-level `speed` field instead. Scene-level `[SILENCE]` / `[3-second pause]` become explicit silence segments.
- **`speed` per segment:** 1.0 neutral, 0.88–0.95 for reverent / pastoral / sung lines, 1.05–1.10 for accelerating passages (the Praying Alien's heartbeat signal). Emphasis tags compose multiplicatively with segment speed.
- **`__dirname` shim:** kokoro-js 1.2.x loads bundled voice files via `import.meta.dirname`, which requires Node ≥ 20.11. The adapter also sets a global `__dirname` as a fallback so older Node 20.x users get a graceful path rather than a confusing `paths[0]` error. `engines` in `package.json` still declares the ≥ 20.11 requirement.

## Chorus — "the congregation fused into a single voice"

The adapter renders each CHORUS speech segment through a **four-voice ensemble** (three female + one male: `bf_emma`, `af_bella`, `af_sarah`, `am_michael`) and sums the results with narrow timing offsets (0, +6, −5, +9 ms). The male voice gives the congregation the diversity of pitch and timbre that a real "amen" carries; the narrow offsets keep the ensemble near-synchronous — validation, not a round. The [AMEN] in Scene VIII is specifically directed to use this voice rather than the Church Leader alone.

See `src/voices/mix.ts` for the mixer (pad-and-sum with peak clipping). No DSP dependencies beyond pure-TypeScript arithmetic.

## Typewriter underlay for THE EYEWITNESS

The eyewitness is filing an incident report; the report is being typed as it is transmitted. When a speech segment's voice is `eyewitness`, the adapter mixes a **synthesized typewriter bed** underneath (`src/voices/underlay.ts` — filtered noise keystrokes with exponential decay, pseudorandom 170–360 ms intervals, occasional bell ting for line-ends). The bed runs at 0.25× gain so it sits under the voice as presence, not foreground. It also extends ~1.1 s past the last word so the keystrokes trail into the inter-scene silence — the bridge the score asks for between Scene I (report) and Scene II (mass begins). Deterministic PRNG means every render produces the same bed, which matters for museum-grade reproducibility.

The coda (Scene XIV) uses the same voice and therefore inherits the same underlay — the surveillance loop closes audibly with the typewriter finishing its transmission.

## Ambient cues — synthesized organ drone, real Vatican bells

The score asks for a stone-room church ambience around the opening, the AMEN decay tail, and the closing fade. The adapter **synthesizes** these cues as additive sine partials (fundamental A2 / octave / perfect fifth / octave-of-fifth) with a slow amplitude LFO and gentle fade in / out. The Roman / Vatican-style bell peal at the opening invocation blends a CC-BY field recording (Freesound #197458 by everythingsounds, trimmed and loudness-normalized at prep time) on top of the deterministic synthesized peal, so the cathedral timbre is real but the rhythmic skeleton stays reproducible. See `src/voices/ambient.ts`.

A master-length **undercurrent drone** at A1 (55 Hz) with two slow LFOs runs underneath the entire concatenated piece at low gain — the "thin drone underneath throughout" the sound-design framework calls for. Mixed in by `scripts/rebuild-master.ts` after concat, with 12-second fades at each edge so it ghosts in and out rather than switching. See `synthesizeUndercurrentDrone` in `ambient.ts`.

## Speech reverb

`src/voices/reverb.ts` is a Schroeder-Moorer algorithmic reverb (four parallel IIR comb filters with lowpass-damped feedback for air absorption, two series allpass filters for diffusion). Pure TypeScript, deterministic. Four presets map to the director's per-segment `reverb` enum:

| Preset | RT60 | Tail | Wet | Use |
|--------|------|------|-----|-----|
| `none`   | —     | 0 ms    | 0 %  | PRAYING ALIEN interior (`dry_close: true` overrides any preset) |
| `light`  | ~0.6 s | 900 ms  | 22 % | EYEWITNESS filing stamps; intimate, close |
| `medium` | ~1.3 s | 1800 ms | 32 % | CHURCH LEADER's pulpit address |
| `heavy`  | ~2.4 s | 2800 ms | 45 % | CHORUS refrain; stone cathedral; Scene 0 chorus premonition |

Applied after every voice path (single, chorus ensemble, full ensemble) and after any underlay bed mixing, so a chorus refrain picks up the heavy tail uniformly across all four voices and the typewriter bed sits in the same room as EYEWITNESS.

## Scene IX signal beds

Scene IX — *The Praying Alien: Distracting Chain-of-Thoughts* — is the longest sustained non-human voice in the piece (3:32). The score names three distinct mental signals punctuating it; `src/voices/signal-beds.ts` provides one synthesizer per signal. All three are "presence, not foreground" in the same register as the EYEWITNESS typewriter underlay (gain 0.35), and each fades 700 ms past the last spoken word so the bed dissolves into the following silence.

| Signal | Synthesis | Reading |
|--------|-----------|---------|
| Train of Thoughts | Sparse Poisson-distributed synaptic pops (mean interval compresses 240 → 110 ms) over a 1.2 kHz nervous hum with smoothed amplitude flicker | Brain electricity, not locomotion. No BPM. |
| Drumbeating Heart Pulse | Low cardiac lub-dub at 88 → 108 BPM (S1 lower/louder, S2 higher/softer, classical 180 ms gap, fundamentals 55–80 Hz) with a body-motion rail-chuff phase-locked underneath | Heart and body, both agitated. |
| Drumbeating Gut Feeling | Non-rhythmic sub-audio drone at ~42 Hz with two overlaid LFOs (amplitude / detune) plus a thin peristaltic noise layer | Pre-rational. Felt more than heard. |

A pre-scan in the Kokoro adapter tags each praying-alien segment with the signal that introduced it (matches the preceding eyewitness SSML for the signal name), so the right bed is mixed under the right monologue without director-side annotation.

## Mobile audio delivery

The visitor `<audio>` element offers three `<source>` elements per track — Opus (≈32 kbps mono), AAC (≈64 kbps mono), WAV (archival fallback). Browsers pick the first they support: Opus for Chrome/Firefox/iOS 17+, AAC for older iOS, WAV for offline museum use. `preload="auto"` starts the fetch on page load, and the Begin button is disabled until `canplaythrough` fires (with a `canplay` + 2.5 s safety net), so the first sound a visitor hears is Scene 0's first toll, not silence. The encoding pipeline is `npm run encode:audio`, backed by bundled `ffmpeg-static` so no system ffmpeg is required.

## Build pipeline summary

```
scenes/*.md  ──▶  director (Opus 4.7)  ──▶  dist/directions/*.json
                                                    │
                                                    ▼
                                       kokoro adapter (TTS + reverb +
                                       beds + underlay)
                                                    │
                                                    ▼
                                  public/assets/audio/<scene>.wav
                                                    │
                          rebuild-master.ts (concat + undercurrent drone)
                                                    │
                                                    ▼
                                  public/assets/audio/god-bless-usa.wav
                                                    │
                                  encode-audio.ts (Opus + AAC)
                                                    │
                                                    ▼
                                  served by GitHub Pages from app/public
```

## Shipped, in shipped order

The hackathon week of April 21–26, 2026:

1. Scaffold + director pipeline for one scene end-to-end.
2. Kokoro-82M voice adapter + Scene I rendered to WAV + local-serve preview.
3. All 14 numbered scenes extracted; chorus ensemble layering; synthesized ambient cues; batch CLI.
4. `.gitignore` hardening against API-key leaks.
5. `zod/v4` import fix for the Anthropic SDK's JSON-schema converter.
6. Audio revisions from artist listening passes: male voice in chorus + narrow offsets, Praying Alien → `af_nicole`, typewriter underlay for EYEWITNESS, emphasis honored with per-segment speed, master playlist reordered so leader precedes chorus, coda default-on, AMEN + HUGS directed to full ensemble.
7. Opening Invocation (Scene 0) added: bell peal + organ drone + chorus premonition + eyewitness file header.
8. Visitor-facing web player + GitHub Pages deploy + printable QR.
9. Pavilion context written into SUBMISSION.md (Mladen Bundalo, *Domus Diasporica*, Opus 4.7 co-director credit, three frames of the alien).
10. Print files for the framed bulletin and photo spec sheets.
11. Mobile audio delivery: Opus / AAC / WAV fallbacks, `preload="auto"`, buffer-gated Begin, plus a real CC-BY Vatican bell recording blended into Scene 0.
12. Jury submission page (`/submission.html`) and SEO polish (Schema.org JSON-LD, robots.txt, sitemap.xml).
13. Scene IX interior ambient beds (brain-electric / heart-pulse / gut-rumble).
14. Schroeder reverb per speech segment + master-length undercurrent drone.
15. `/story` page redeployed from the root literary source via the Pages workflow.
16. Text-consistency pass: scene counts, durations, scene IX preview description, sitemap; Scene 8 audio re-rendered with `<sub>`-aliased "Oh Gees" so audio matches the printed bulletin's "OGs."

Deferred for after the Biennale opens, not the deadline:
- Live director mode (per-visitor regeneration behind a serverless function).
- Mix-ducking the undercurrent drone under PRAYING ALIEN's interior (currently continuous throughout).
- Accessibility pass (transcript page, ARIA live region, reduced-motion, skip link).
- Captions track on the introduction video.
- Arweave pin of the final WAV master.

## Voice licensing

All chosen TTS engines use permissive, commercial-use-safe licences. This matters because a Biennale exhibition is commercial display.

| Engine         | Licence    | Role                                         |
|----------------|------------|----------------------------------------------|
| Kokoro-82M     | Apache-2.0 | Primary — all four voices                    |
| CosyVoice 2    | Apache-2.0 | Fallback — emotional range, language variety |
| Chatterbox     | MIT        | Fallback — emotion control, voice cloning    |

## Credits

See [repository root README.md](../README.md) for full authorship and provenance. The digital artifact in this folder was scaffolded in collaboration with Claude Opus 4.7 during the Anthropic "Build with Opus 4.7" hackathon, with Chris-Armel Iradukunda (daqhris) as primary author and creative director.
