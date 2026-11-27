# Archival to-do list

Drafted 27 November 2026, five days after closing. Owners are proposals:
**A** author, **H** host artist, **M** museum or pavilion team.

## Now: before things are packed, moved or lost

- [ ] **H, A** Find out whether the room has been dismantled. If not, photograph
      the wall, each work front and back, labels, frames, loupe and QR code, with
      a scale reference.
- [ ] **H, M** Record where each physical object is, who is responsible, its
      condition, and where it goes next.
- [ ] **A** Do not delete `app/dist/`; copy it to a second place. It holds
      `ab/` (audio files) and `node_modules/` (reported 27 November).
- [ ] **A** Look for `app/dist/directions/` and `app/dist/trailer-fragments/`.
- [ ] **A** Collect originals that git lacks or holds only compressed:
      speech recording, introduction video source, installation photos and videos,
      full-size photograph, bulletin and specification PDFs as printed, textile
      design files (plotter, embroidery, laser), invitation and emails that
      confirm the participation, press mentions.
- [ ] **A** Save the Instagram installation views as image files, and note who
      made each one.
- [ ] **A** Keep `daqhris.com` renewed and this repository public and unrenamed.

## Within two weeks

- [ ] **A** Ask Software Heritage to archive the repository: open
      <https://archive.softwareheritage.org/save/>, choose git, paste
      `https://github.com/daqhris/god-bless-usa`. Later, check that the SWHIDs in
      [`README.md`](./README.md) resolve.
- [ ] **A** Save the public pages in the [Wayback Machine](https://web.archive.org/save):
      the site root, `pavilion.html`, `preview.html`, `submission.html`, `story/`
      and `daqhris.com/venice-biennale`.
- [ ] **A** Tag the closing version (created after the fact, and says so):

      git tag -a closing-2026-11-22 d3903f40331d55916aedcfc1bcb9df9a38d9c6ef \
        -m "State of main at the closing of the 61st Venice Biennale. Tagged afterwards."
      git push origin closing-2026-11-22

- [ ] **A** Answer the [open questions](./questions-for-the-artist.md).
- [ ] **A** Send the cover note to the host artist, curator and museum.
- [ ] **A** Pack the local npm dependencies into one file. As a folder, the
      deposit script would leave out nested `node_modules` and links:

      tar -czf ../node_modules.tar.gz -C app/dist node_modules

- [ ] **A** Build the deposit package, adding what was collected, then verify it.
      Remove any `--add` line whose folder does not exist:

      python3 archive/build_deposit.py build --out ../deposit-2026 \
        --add audio-drafts=app/dist/ab \
        --add dependencies=../node_modules.tar.gz \
        --add director-output=app/dist/directions \
        --add installation=/path/to/photos \
        --add originals=/path/to/originals
      python3 archive/build_deposit.py verify ../deposit-2026

      Check added folders for private data first. The script skips `.env` files
      but cannot recognise other sensitive content.

## Within three months

- [ ] **M** Issue a signed attestation naming the guest works, their authors,
      room and dates. The [Biennale page](https://www.labiennale.org/en/art/2026/bosnia-and-herzegovina)
      for the pavilion, read on 27 November 2026, names no guests.
- [ ] **M** Share pavilion visitor figures, if any were counted, and installation
      documentation.
- [ ] **A, M** Decide what the museum receives: documentation only, deposit,
      loan, gift or acquisition.
- [ ] **A, M** Sign a written agreement covering: preservation copies, format
      migration and emulation, offline display, research access, re-exhibition,
      loans, credit line, duration, withdrawal, and third-party material. The
      repository licence asks for a separate written grant for institutional
      redistribution.
- [ ] **A** Clear or exclude third-party material: film still used as portrait,
      co-authored installation photos, quoted names and logos.
- [ ] **A** Write a transcript or captions for the performance, speech and video.
- [ ] **A** Add the voice model cache after a successful render
      (`node_modules/@huggingface/transformers/.cache/` by default, under `app/`;
      check `app/dist/node_modules` too):
      `--add voice-model=<that folder>`.
- [ ] **A** Optional: publish a GitHub release and a
      [Zenodo](https://zenodo.org/) record to obtain a DOI. This creates a public,
      lasting copy, so check rights first.
- [ ] **A** Optional: record a short interview about intentions and acceptable
      changes.

## Every year (suggested: each May)

- [ ] **M, A** Verify every copy of the package.
- [ ] **M, A** Play the work from the package in a current browser.
- [ ] **A** Check the domain, the QR code and external links.
- [ ] **M, A** Review the preservation guide.
