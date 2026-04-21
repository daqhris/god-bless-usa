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
│  VOICE ADAPTER                  │   src/voices  (interface only in PR #1)
│  renders SSML → audio           │   PR #2: Kokoro-82M adapter
│  primary: Kokoro-82M            │   fallbacks: CosyVoice 2, Chatterbox
│  fallback: CosyVoice 2, Chatter │
└──────────────┬──────────────────┘
               │  .wav / .mp3
               ▼
        canonical scene audio  →  pin to Arweave  →  static web player + QR
```

The director is **engine-agnostic** by design: the Opus 4.7 pipeline produces SSML and sound-design hints; a swappable adapter turns SSML into audio. This lets us fall back between Kokoro / CosyVoice 2 / Chatterbox per scene or per voice without touching the director.

## Quick start

```bash
cd app
cp .env.example .env         # fill in ANTHROPIC_API_KEY
npm install
npm run render:scene -- scenes/01-eyewitness.md --out dist/directions
```

The CLI reads one scene markdown file, calls Opus 4.7 as performance director, and writes the structured direction as JSON to `dist/directions/<scene-id>.json`. No audio is rendered in PR #1 — that's PR #2.

## Opus 4.7 configuration (see `src/director/index.ts`)

- **Model:** `claude-opus-4-7` — no sampling parameters (removed on 4.7).
- **Thinking:** `{ type: "adaptive" }` — Opus 4.7's adaptive thinking is off by default; the director enables it because the task is intelligence-sensitive (poetic reading, voice casting, timing feel).
- **Effort:** `high` — minimum for intelligence-sensitive work on 4.7, and a reasonable cost/quality balance for a 13-scene batch.
- **Structured outputs:** `output_config.format` with a Zod schema (`DirectorOutputSchema`) — the model returns validated JSON, not prose-to-be-parsed.
- **Prompt caching:** `cache_control: { type: "ephemeral" }` on the system block — the character briefs and sound design framework are stable across all 13 scenes, so the first scene writes the cache and the remaining 12 read it.

## Milestones

- **PR #1 (this PR)** — Scaffold + director pipeline for one scene end-to-end. No audio yet.
- **PR #2** — Kokoro-82M voice adapter, render Scene I to `.wav`, verify end-to-end.
- **PR #3** — All 13 scenes rendered and concatenated into the canonical ~15-minute performance.
- **PR #4** — Static web player + QR landing + "put on headphones" consent flow.
- **PR #5 (stretch)** — Live director mode (per-visitor regeneration) for the "hybrid" half.
- **PR #6** — Arweave pin, final submission bundle.

## Voice licensing

All chosen TTS engines are under permissive, commercial-use-safe licences (Apache-2.0 / MIT). This matters because a Biennale exhibition is commercial display.

| Engine         | Licence    | Role                                         |
|----------------|------------|----------------------------------------------|
| Kokoro-82M     | Apache-2.0 | Primary — all four voices                    |
| CosyVoice 2    | Apache-2.0 | Fallback — emotional range, language variety |
| Chatterbox     | MIT        | Fallback — emotion control, voice cloning    |

## Credits

See [repository root README.md](../README.md) for full authorship and provenance. The digital artifact in this folder was scaffolded in collaboration with Claude Opus 4.7 during the Anthropic "Build with Opus 4.7" hackathon, with Chris-Armel Iradukunda (daqhris) as primary author and creative director.
