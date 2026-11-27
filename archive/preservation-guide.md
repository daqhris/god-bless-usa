# Long-term preservation guide

Draft, 27 November 2026. A proposal for the author and the receiving institution
to amend. It is not legal advice.

## 1. What is being preserved

| Layer | Contents | Priority |
|---|---|---|
| The performance as heard | Audio master, scene files, web player | 1 |
| The encounter | QR code, personal phone, headphones, one start button, ending | 1 |
| The physical trio | Printed bulletin, textile, photograph, frames, loupe, wall, placement | 1 (held outside this repository) |
| The making | Story, performance script, scene files, director prompt and schema, direction files, code, git history | 2 |
| The context | Opening speech, introduction video, installation photos, credits, press | 2 |

## 2. Significant properties (proposed)

These describe what makes the work itself. The author decides the final list.

**Keep**

- The exact audio of the master, including its pauses. A faint drone runs under
  the master, through the marked silences too. Do not trim, denoise or "repair"
  it.
- Each listener starts their own session. No loop and no scrubbing: the player's
  code calls the piece "a ceremony, not a media file".
- Private listening through headphones on a personal device.
- Synthetic voices only in the performance.
- The credit of co-direction, worded the same way everywhere.
- The link between the printed bulletin and the sound.

**May change, if documented**

- Web server, domain and hosting.
- Compressed audio formats.
- Page layout needed to keep working in newer browsers.
- Playback device, when personal phones are not practical.

**A change that creates a new version**

- Rendering the voices again, with the same or another model.
- Directing the score again with an AI model.

The AI direction is not expected to repeat itself: a new call can give different
pacing and notes. A new render must be labelled with its date and tools and must
never overwrite the 2026 master.

## 3. How the work was made

```
story (Dec 2024) → performance script (April 2026)
  → 15 scene files (app/scenes/*.md): revised text and stage directions
  → director: Claude Opus 4.7, one call per scene → direction files (JSON)
  → voices: Kokoro-82M + synthesized sound beds → 15 scene WAVs
  → concatenation → god-bless-usa.wav → Opus and AAC copies
  → static web player (HTML, CSS, JavaScript)
```

The author also steered the result through repeated listening passes.

The scene files are in the repository. They differ from the April script, mainly
in a new opening, the playback order and an extended coda. The
[as-performed script](./performance-script-as-performed.md) brings them together.

**Gap.** The direction files were written to `app/dist/directions/`, which git
ignores. They are not in the repository or its history. The folder
`app/src/director/` is tracked, but it holds the director's code and brief, not
its output. The three files in
`app/scenes/fixtures/` are hand-written examples, not the record of the exhibited
direction. If the originals survive on the author's computer, they are the most
important thing to add to the archive: they are the co-director's actual
contribution.

## 4. Dependencies and risks

| Dependency | Affects | Risk | Measure |
|---|---|---|---|
| Domain `daqhris.com` | The QR code on the printed bulletin | Lapse breaks the physical work | Renew for several years; name a fallback holder |
| GitHub and GitHub Pages | Live site, source links | Policy or account change | Software Heritage, deposit package, own copy |
| Links to `blob/main` | Pavilion page references | Target moves with later edits | Cite tags, commits or SWHIDs |
| Instagram embed | Installation views | Post removed, platform change | Keep the original image files |
| Arweave, Base, Ethereum | Original story and photograph; the dated proof of publication ([context](./context.md)) | External networks and gateways | Keep file copies and transaction references |
| Browser audio support | Playback | Formats or autoplay rules change | WAV master; test yearly |
| Claude Opus 4.7 API | New direction only, not playback | The provider lists it as active, retirement [not sooner than 16 April 2027](https://platform.claude.com/docs/en/about-claude/model-deprecations) | Keep prompt, schema and direction files |
| Kokoro-82M weights | New render only | Downloaded at render time; no revision is pinned in the code | Add the local model cache to the deposit |
| npm packages | New render and image export only | Install downloads binaries from GitHub; `npm audit` reported high-severity advisories in packages used by the voice engine (26 November 2026) | Not needed for playback. Add local caches if re-rendering matters |

## 5. Software environment

Tested on 27 November 2026 for both reference versions: dependency install and
TypeScript type check pass, and the three fixture files validate. Environment:
Linux x64, Node 22.23.5, npm 10.9.9.

```bash
cd app
ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm ci   # skips an optional GPU download
npm run typecheck
```

**Not tested:** rendering audio. The voice model could not be downloaded in the
test environment, so nobody should assume the master can be regenerated.

## 6. Storage and care

1. Keep at least three copies, on two kinds of storage, one in another location.
2. Run `build_deposit.py verify` on each copy at deposit, after every transfer,
   and once a year. Record the date and result.
3. Never edit files inside a package. Make a new package and keep the old one.
4. Keep formats as they are. Make a migrated copy only when a format is at risk,
   beside the original.
5. If browsers can no longer play the player, first try an archived browser in a
   virtual machine (emulation); adapt the code only after that.
6. Review this guide yearly and after every re-exhibition.

## 7. Showing it again

| Setup | How | Note |
|---|---|---|
| A. As in Venice | Printed QR code leads to the live site | Needs the domain and internet |
| B. Local network | A small computer serves the closing version | A new QR code changes the bulletin: ask the author first |
| C. Offline station | Tablet and headphones open the local `index.html` | Loses the personal-phone encounter |

Before opening: play the full 17 min 55 s on the actual equipment, confirm the
end screen, check headphones, and scan the printed QR code. The landing page
shows a notice that the 2026 exhibition has closed; the author decides whether it
stays.

Wall arrangement, as documented by the author: textile at the top, bulletin at the
left, photograph at the right. The
[Venice page](https://daqhris.com/venice-biennale) draws this arrangement only.
Its colours are not a record of the wall, whose real background was not set in the
colours of the Burundian flag. Confirm sizes and framing first (see the
[open questions](./questions-for-the-artist.md)). Record every new presentation:
date, place, setup, version, changes, photos.

## 8. Useful references

- [BagIt packaging format, RFC 8493](https://www.rfc-editor.org/rfc/rfc8493)
- [The Met: time-based media documentation templates](https://www.metmuseum.org/essays/sample-documentation-templates)
- [Software Heritage: save a repository](https://archive.softwareheritage.org/save/)
