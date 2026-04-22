# /app — God Bless USA performance app

The digital artifact: an AI-voiced web performance of *"God Bless The United States Of Aliens — An All-Seeing Eyewitness Report."*

- **Source material** at the repository root (story, script, PDFs) is **not rewritten** — this app renders it.
- **Submission target:** Build with Opus 4.7 hackathon, April 21–26, 2026.
- **Exhibition target:** 61st International Art Exhibition — La Biennale di Venezia, 2026, Bosnia and Herzegovina Pavilion (*Domus Diasporica*), May–November 2026.

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

# Step-by-step:
npm run render:scene -- scenes/01-eyewitness.md --out dist/directions
npm run render:audio -- dist/directions/01-eyewitness.json --out public/assets/audio

# Or in one go:
npm run render:all -- scenes/01-eyewitness.md

# Then preview in a browser:
npm run serve
# open http://localhost:5173
```

First run downloads the Kokoro-82M ONNX model (~80 MB) into the HuggingFace transformers cache; subsequent runs are instant.

**Rendering without an API key.** A hand-crafted fixture lives at `scenes/fixtures/01-eyewitness.example.json`. You can render it to audio without calling Claude:

```bash
npm run render:audio -- scenes/fixtures/01-eyewitness.example.json
```

This validates the Kokoro adapter + SSML parser + WAV writer end-to-end on zero API cost.

## Opus 4.7 configuration (see `src/director/index.ts`)

- **Model:** `claude-opus-4-7` — no sampling parameters (removed on 4.7).
- **Thinking:** `{ type: "adaptive" }` — Opus 4.7's adaptive thinking is off by default; the director enables it because the task is intelligence-sensitive (poetic reading, voice casting, timing feel).
- **Effort:** `high` — minimum for intelligence-sensitive work on 4.7, reasonable cost/quality balance for a 13-scene batch.
- **Structured outputs:** `output_config.format` with a Zod schema (`DirectorOutputSchema`) — the model returns validated JSON, not prose-to-be-parsed.
- **Prompt caching:** `cache_control: { type: "ephemeral" }` on the system block — character briefs and sound-design framework stay stable across all 13 scenes, so the first scene writes the cache and the remaining twelve read it.

## Kokoro configuration (see `src/voices/kokoro.ts`)

- **Model:** `onnx-community/Kokoro-82M-v1.0-ONNX` — 82M parameters, Apache-2.0, ONNX quantized (`q8`), runs on CPU.
- **Sample rate:** 24 kHz mono.
- **Voice map** (`src/voices/voice-map.ts`): EYEWITNESS → `af_heart` · CHURCH LEADER → `bm_george` · CHORUS → `bf_emma` (will be layered for choral texture in PR #3) · PRAYING ALIEN → `am_puck`.
- **SSML handling:** `<speak>` wrapper + `<break time="Nms"/>` for inline pauses. `<emphasis>` and `<prosody>` tags are stripped before phonemization (they're hints for the director's intent; Kokoro's natural prosody handles the delivery). Scene-level `[SILENCE]` / `[3-second pause]` become explicit silence segments.
- **`__dirname` shim:** kokoro-js 1.2.x loads bundled voice files via `import.meta.dirname`, which requires Node ≥ 20.11. The adapter also sets a global `__dirname` as a fallback so older Node 20.x users get a graceful path rather than a confusing `paths[0]` error. `engines` in `package.json` still declares the ≥ 20.11 requirement.

## Milestones

- ~~PR #1 — Scaffold + director pipeline for one scene end-to-end. No audio yet.~~ ✅
- **PR #2 (this PR)** — Kokoro-82M voice adapter + Scene I rendered to WAV + local-serve preview.
- **PR #3** — All 13 scenes rendered. Chorus voice layered (multiple passes summed with small pitch/timing offsets). Ambient cues wired in.
- **PR #4** — Visitor-facing web player: QR landing, "put on headphones" consent, non-looping playback, end state linking back to the USALIEN token. GitHub Pages deploy.
- **PR #5 (stretch)** — Live director mode (per-visitor regeneration) behind a tiny serverless function.
- **PR #6** — Arweave pin of the final bundle, submission packaging.

## Voice licensing

All chosen TTS engines use permissive, commercial-use-safe licences. This matters because a Biennale exhibition is commercial display.

| Engine         | Licence    | Role                                         |
|----------------|------------|----------------------------------------------|
| Kokoro-82M     | Apache-2.0 | Primary — all four voices                    |
| CosyVoice 2    | Apache-2.0 | Fallback — emotional range, language variety |
| Chatterbox     | MIT        | Fallback — emotion control, voice cloning    |

## Credits

See [repository root README.md](../README.md) for full authorship and provenance. The digital artifact in this folder was scaffolded in collaboration with Claude Opus 4.7 during the Anthropic "Build with Opus 4.7" hackathon, with Chris-Armel Iradukunda (daqhris) as primary author and creative director.
