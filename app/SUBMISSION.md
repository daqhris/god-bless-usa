# Build with Opus 4.7 — Submission Declaration

This document transparently declares which parts of the `god-bless-usa` repository are **source material predating the hackathon** and which parts are **new work built during the hackathon week (April 21–26, 2026)**, and places the work in its pavilion context.

## Source material (predates the hackathon)

All files at the repository root are pre-existing source material for the performance piece. They are not rewritten, refactored, or regenerated during the hackathon. They include:

- `story.md`, `story.html`, `God-Bless-USA.pdf` — the original short story *"God Bless The United States Of Aliens — An All-Seeing Eyewitness Report"*, written December 2024 by Chris-Armel Iradukunda (daqhris), minted as the USALIEN ERC-721 on the Base blockchain (contract `0xaec14e14e0acb86ba90864785054edc627a2337e`), and permanently archived on Arweave.
- `god-bless-usa_performance-script.md`, `god-bless-usa_performance-script.pdf` — the director's score for the performance, drafted April 2026 ahead of the hackathon.
- `image.png`, `LICENSE`, `README.md` — repository metadata and artwork cover.

These files document the conceptual and literary work underlying the performance, and are treated as libretto / source text — analogous to a composer's score or a playwright's script.

## New work (built during the hackathon week)

Everything inside `/app` is new work built during the hackathon:

- `/app/src/director/` — the Opus 4.7 performance-director pipeline (structured output, prompt caching, Zod schema, SSML emission).
- `/app/src/voices/` — the Kokoro-82M voice adapter (chorus ensemble, full-ensemble rendering for AMEN and HUGS), Schroeder speech reverb, the synthesized organ drone and Roman / Vatican-style bell peal blended with a CC-BY field recording, the typewriter underlay for EYEWITNESS, and three interior signal beds for Scene IX (brain-electric / heart-pulse / gut-rumble).
- `/app/src/render*.ts` and `/app/scripts/*.ts` — CLIs for single-scene, full-batch, audio-only re-render, master rebuild (with the undercurrent drone mixed in), and Opus / AAC encoding.
- `/app/scenes/` — the 15 scene markdown files (Opening Invocation + 14 numbered scenes) used as director input.
- `/app/public/` — the visitor-facing web player (vanilla HTML / CSS / JS) with mobile-first audio delivery (Opus / AAC / WAV fallbacks, buffer-gated Begin), the per-scene preview page, the jury introduction page, the 15 rendered WAVs and ~18-minute concatenated master, the QR code pointing at the live URL, OG card and favicon. The `/story` page (the original written-text version) is restaged from the root `story.html` at deploy time.
- `.github/workflows/pages.yml` — the Pages deployment workflow.
- `/app/README.md`, `/app/SUBMISSION.md` — documentation of the new work.

## Role of Claude Opus 4.7

Opus 4.7 plays three overlapping roles, all declared transparently and credited in commit trailers via the standard `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` convention:

1. **Co-director of the performance at runtime.** Each scene of the rendered audio was directed by an Opus 4.7 call that reads the script and emits SSML-annotated direction for the TTS voice engine. Per the technical notes already written into `god-bless-usa_performance-script.md` before the hackathon, *"Claude becomes the performance director; TTS becomes the actor."* During development, the director role was shared with daqhris through iterative listening passes — each round of feedback produced an updated system prompt, voice map, or rendering adjustment.

2. **Co-developer of the app scaffolding.** The TypeScript code inside `/app` and the visitor player were written collaboratively between daqhris (primary author and creative director) and Claude Opus 4.7 (implementation partner).

3. **Research / ideation partner during iteration.** Surveying open-source TTS options (Kokoro, CosyVoice 2, Chatterbox), mapping Catholic bell-peal pitch conventions, proposing opening-invocation alternatives, and drafting credit wording — all through conversation rather than canned prompts.

## Pavilion context

The AI-voiced performance is exhibited as a **guest work in *Domus Diasporica***, the Pavilion of Bosnia and Herzegovina at the 61st International Art Exhibition — La Biennale di Venezia.

- **Exhibitor (inviting artist):** [Mladen Bundalo](https://www.mladenbundalo.com/) (b. 1986, Prijedor; lives and works in Brussels). Interdisciplinary artist, filmmaker, and author. His work explores belonging, migration, diaspora, uncertainty, and value across film, photography, drawing, and in situ installation.
- **Commissioner:** Sarita Vujković (Director, Museum of Contemporary Art of the Republic of Srpska; professor at the Academy of Arts, University of Banja Luka).
- **Curator:** Isidora Živković (Banjac).
- **Production:** Museum of Contemporary Art of the Republic of Srpska + Association Vizart.
- **Architecture:** KOTO.
- **Venue:** Palazzo Malipiero, San Marco 3198, Venice.
- **Dates:** May 9 – November 22, 2026.
- **Biennale framing:** The 61st International Art Exhibition is curated by **Koyo Kouoh** under the theme ***In Minor Keys*** — art as "peaceful and poetic resistance" during times of turbulence, creating space for regenerative reflection and hope.

The themes of this AI-voiced performance — a diasporic alien narrator filing a surveillance report on a protesting Christmas-Eve mass — resonate with *Domus Diasporica*'s focus on multi-rooted belonging and with *In Minor Keys*' quiet-resistance register.

### How the invitation came about

The invitation originated at the **[Hectolitre](https://www.hectolitre.space/) art space** in Brussels, where daqhris works from and where Mladen Bundalo is a former coordinator and current resident. Mladen offered daqhris a guest-work spot in *Domus Diasporica* in the context of daqhris's country of origin (Burundi) not being represented at the Biennale. The two artists share a working space, not just a national framework; the relationship is closer than a curatorial introduction.

### Physical placement at Palazzo Malipiero

daqhris cannot be physically present at the Biennale opening for reasons consistent with the piece's own subject matter — the legal-alien condition that structures international movement for non-EU / non-US nationals. Mladen is traveling with the ready-to-exhibit artworks and will arrange the physical elements within the pavilion in coordination with the curator and commissioner.

### Distinction from the pavilion's own sound team

*Domus Diasporica* has its own sound team — **Jeanne Debarsy** (Sound Designer) and **Pierre-Louis Cassou** (Post-production) — who work on Mladen Bundalo's in situ installations (notably *The Living Room*). This AI-voiced work is a distinct, self-contained piece with its own acoustic vocabulary (AI director, synthesized bell peal and organ drone, typewriter underlay, four-voice ensemble). It does not share sound design with the pavilion's other components.

## Three frames of the alien

The piece's central conceit — "aliens" — operates across three registers simultaneously, which is the conceptual spine that makes the title *God Bless The United States Of Aliens* work at all three levels:

1. **Legal** — the state-administered designation applied to non-citizens crossing borders, to immigrants waiting at consulates, to the artist himself as a non-EU-born legal alien in Europe. The alien who is *allowed a seat at the table*.
2. **Technological** — the non-human voices in the piece, the AI director that generates the performance direction, the automated filing of the surveillance report. The machine-as-alien: an intelligence reading the mass from outside the species.
3. **Cosmic** — the extraterrestrial in the story's surface narrative: "overseas-based beings" praying in a protesting church, UFOs flickering over superweapon warehouses, all-seeing eyewitnesses reporting "as seen from above."

The performance collapses the three frames into a single ambiguous narrator filing a single ambiguous report.

## Licensing

The repository carries a **dual licence**, separating the engine from the artwork (see [`/LICENSE`](../LICENSE) at repo root for the full statement and [`/LICENSES/`](../LICENSES/) for the verbatim texts):

- **Code (EUPL-1.2)** — TypeScript pipeline, visitor player, deploy workflow, package manifests. EU-recognised, GPL-compatible permissive copyleft. May be reused, modified, redistributed.
- **Creative content (CC BY-NC-ND 4.0)** — the literary work, the AI-voiced performance (rendered audio), the printed bulletin and photo specs. Share with attribution; commercial reuse and derivatives require a separate written grant from the author.

Both run under **Belgian law** as governing jurisdiction. The author retains the moral right of attribution under Belgian copyright law.

The TTS engines selected (Kokoro-82M, CosyVoice 2, Chatterbox) carry their own permissive licences (Apache-2.0 / MIT) and are bundled alongside the dual repository licence — verified because Biennale exhibition constitutes commercial display.

The entire `/app` is **open-source from end to end** — director prompt, voice ensemble configuration, synthesized ambient, visitor player, deploy workflow. Museum-archivable as a single self-contained folder: pure HTML / CSS / JavaScript at runtime, pre-rendered WAV audio, no server dependencies. A `.zip` of `/app/public/` opened on any static server will run the piece offline for as long as browsers support the `<audio>` element.

## Hackathon

Built during the **[Built with Opus 4.7](https://cerebralvalley.ai/e/built-with-4-7-hackathon)** hackathon, a one-week virtual hackathon organised by **Cerebral Valley** and **Anthropic** (April 21–26, 2026), with a $100,000 prize pool and $500 in API credits per selected participant.
