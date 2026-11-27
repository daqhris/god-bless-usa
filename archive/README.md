# Archive: *God Bless The United States Of Aliens*

Start here if you are looking after this work for a museum, a pavilion or a
collection.

> **Status: draft, 27 November 2026.** Prepared after the closing of the 61st
> Venice Biennale with the help of an AI assistant (Claude Sonnet 5.5, which did
> not take part in making the work). Compiled from this repository and public web
> pages. The author has answered some points but has not yet approved the whole.
> Answers and open points are in
> [`questions-for-the-artist.md`](./questions-for-the-artist.md).

| Document | What it answers |
|---|---|
| This file | What is the work, which versions matter, how to play it |
| [`preservation-guide.md`](./preservation-guide.md) | What must be kept, what can break, how to show it again |
| [`TODO.md`](./TODO.md) | Who does what, and in which order |
| [`questions-for-the-artist.md`](./questions-for-the-artist.md) | Decisions and inconsistencies to settle |
| [`checksums/`](./checksums/) | SHA-256 of every file at opening and at closing |
| [`build_deposit.py`](./build_deposit.py) | Builds and verifies a self-contained deposit package |

## Catalogue record

| Field | Value |
|---|---|
| Title | *God Bless The United States Of Aliens. An All-Seeing Eyewitness Report* |
| Short description | "A nonhuman-voiced Catholic mass ceremony, an all-seeing eyewitness report, a prescient prophecy." (the author's wording, in use at [radio.hectolitre.be](https://radio.hectolitre.be/pages/works/god-bless-usa.html)) |
| Author | Chris-Armel Iradukunda (daqhris), born 1992, Bujumbura; works in Brussels |
| Co-direction | Chris-Armel Iradukunda and Claude Opus 4.7 (AI model by Anthropic). The author is the primary author and creative director |
| Type | Web-based, AI-voiced sound performance, heard on the visitor's phone through headphones, reached by a QR code on a printed liturgical bulletin |
| Duration | 17 min 55 s (audio master) |
| Voices | Synthetic only in the performance: Kokoro-82M text-to-speech, four characters and a full ensemble. A recorded bell sample (CC BY 4.0) is mixed into the opening |
| Language | English |
| Dates | Story written and published December 2024; app built April 2026; shown 9 May to 22 November 2026 |
| Presentation | Guest work (*Solidarity Burundi Pavilion*, guest room) in *Domus Diasporica* by Mladen Bundalo, Pavilion of Bosnia and Herzegovina, 61st International Art Exhibition, Palazzo Malipiero, Venice |
| Pavilion | Commissioner: Sarita Vujković (Director, Museum of Contemporary Art of the Republic of Srpska). Curator: Isidora Živković. Production: the Museum and Association Vizart |
| Shown with | A textile (AI self-portrait, made with Gemini 2.5 Pro) and the photograph *awalkaday 91-2022* |
| Rights | Code: EUPL-1.2. Text, score, audio, print files: CC BY-NC-ND 4.0. See [`/LICENSE`](../LICENSE) |
| Contact | media@daqhris.com |

**Attendance.** By design, no web traffic statistics were recorded (author, 27
November 2026), so the number of listeners is unknown. The 714,015 visitors [reported for the whole Biennale](https://hyperallergic.com/momentous-61st-venice-biennale-ends-with-2nd-highest-visitor-turnout/)
must not be presented as the audience of this work.

## The two reference versions

| | Opening | Closing |
|---|---|---|
| Date | 8 May 2026 | last commit on `main` before 23 November 2026 (dated 1 November) |
| Git reference | tag `vernissage-2026-05-08` | commit `d3903f40331d55916aedcfc1bcb9df9a38d9c6ef` |
| Revision SWHID | `swh:1:rev:3d33f0d55d49ec98b6718cb63219e604e9f28953` | `swh:1:rev:d3903f40331d55916aedcfc1bcb9df9a38d9c6ef` |
| Web app folder SWHID | `swh:1:dir:2757d4da8908156ece189384f119ce88100308b6` | `swh:1:dir:6c4ed05e5339c0575b292fad2427a331d7ade396` |
| Checksums | [`vernissage-2026-05-08.sha256`](./checksums/vernissage-2026-05-08.sha256) | [`closing-2026-11-22.sha256`](./checksums/closing-2026-11-22.sha256) |

A second tag, `visiting-hours-2026-05-08`, adds the visiting hours on opening
evening.

**The audio did not change during the exhibition.** The files under
`app/public/assets/` are identical in both versions. Text and layout of the web
pages did change, as did the performance script (credit lines and a regenerated
PDF) and software dependencies.

SWHIDs are [Software Heritage identifiers](https://docs.softwareheritage.org/devel/swh-model/persistent-identifiers.html),
computed from the content itself. They were computed locally; they will resolve
online only once Software Heritage holds a copy (see the to-do list).

## Audio master

`app/public/assets/audio/god-bless-usa.wav`

- WAV, PCM 16-bit, 24 kHz, mono (the native rate of the voice model)
- SHA-256 `4aa8946e1d67d9362d20afa7d0dfcc1dd3f416a66b69449e195815d1a596f886`
- SWHID `swh:1:cnt:e408cfe4f54cbef64b588361f403230222dd5fa3`

The `.opus.ogg` and `.m4a` files are compressed access copies.

## Play it without internet

Open `app/public/index.html` in a web browser, wait for **Begin**, press it.

Tested on 27 November 2026 in Chromium with web requests blocked, for both
reference versions taken from a deposit package: playback started and, after
skipping to the last second, the end screen appeared. A full listen, other
browsers and phones were not tested.
Offline, these are unavailable: the Instagram installation views, the
"last modified" dates, external links, and the `/story` page (the deposit package
rebuilds that page).

## Build the deposit package

On a full clone of this repository, with Python 3.9+ and git:

```bash
git fetch --tags
python3 archive/build_deposit.py build --out ../deposit-2026
python3 archive/build_deposit.py verify ../deposit-2026
```

A package built without additions is about 890 MB. Material that git does not
hold is added with `--add label=path`. The list of what
to add is in the [to-do list](./TODO.md).
