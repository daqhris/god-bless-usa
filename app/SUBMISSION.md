# Build with Opus 4.7 — Submission Declaration

This document transparently declares which parts of the `god-bless-usa` repository are **source material predating the hackathon** and which parts are **new work built during the hackathon week (April 21–26, 2026)**.

## Source material (predates the hackathon)

All files at the repository root are pre-existing source material for the performance piece. They are not rewritten, refactored, or regenerated during the hackathon. They include:

- `story.md`, `story.html`, `God-Bless-USA.pdf` — the original short story *"God Bless The United States Of Aliens — An All-Seeing Eyewitness Report"*, written December 2024, minted as the USALIEN ERC-721 on the Base blockchain (contract `0x2193ddd4d64bad38c7bd523090f333f425560a72`), and permanently archived on Arweave.
- `god-bless-usa_performance-script.md`, `god-bless-usa_performance-script.pdf` — the director's score for the performance, drafted April 2026 ahead of the hackathon.
- `image.png`, `LICENSE`, `README.md` — repository metadata and artwork cover.

These files document the conceptual and literary work underlying the performance, and are treated as libretto / source text — analogous to a composer's score or a playwright's script.

## New work (built during the hackathon week)

Everything inside `/app` is new work built during the hackathon:

- `/app/src/director/` — the Opus 4.7 performance-director pipeline (structured output, prompt caching, Zod schema, SSML emission).
- `/app/src/voices/` — the pluggable TTS adapter interface. Concrete Kokoro-82M adapter lands in PR #2.
- `/app/src/render.ts` — CLI that reads one scene, calls the director, and writes structured direction.
- `/app/scenes/` — scene-by-scene extractions from the script, used as director input.
- `/app/README.md`, `/app/SUBMISSION.md` — documentation of the new work.

## Role of Claude Opus 4.7

Opus 4.7 plays two roles in this project:

1. **Co-developer of the app.** The TypeScript scaffolding in `/app` was written collaboratively between Chris-Armel Iradukunda (daqhris, primary author and creative director) and Claude Opus 4.7 (implementation partner). Claude's contribution is declared in commit trailers via the standard `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` convention, and is credited in `/app/README.md`.

2. **Performance director at runtime.** Opus 4.7 is the core intelligence of the rendered app itself: each scene of the performance is directed by an Opus 4.7 call that reads the script and emits SSML-annotated direction for the TTS voice engine. Per the existing technical notes in `god-bless-usa_performance-script.md`, *"Claude becomes the performance director; TTS becomes the actor."* This is not a post-hoc use of the API — it is written into the script itself.

## Licensing and commercial use

The artwork is MIT-licensed (see `LICENSE` at repo root). All TTS engines selected (Kokoro-82M, CosyVoice 2, Chatterbox) use permissive, commercial-use-safe licences (Apache-2.0 / MIT) — verified because Biennale exhibition constitutes commercial display.
