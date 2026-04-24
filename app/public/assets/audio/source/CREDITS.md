# Audio source samples

Third-party audio used in the performance. All licences permit commercial
exhibition with attribution; the derived clips placed alongside each source
are trimmed and loudness-normalized using `scripts/prepare-*.ts` so the
transformations are reproducible from the originals.

## rome-vatican-bells-25s.wav

- **Title:** Rome Vatican Changing
- **Author:** [everythingsounds](https://freesound.org/people/everythingsounds/)
- **Source:** https://freesound.org/people/everythingsounds/sounds/197458/
- **Licence:** Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Used region:** 0:15 – 0:40 of the original (25 s)
- **Transformations:** trimmed, 150 ms fade in/out, loudness-normalized to
  −18 LUFS / −1 dBTP, downmixed to mono, resampled to 24 kHz to match the
  Kokoro TTS output rate.
- **Use:** blended under the synthesized organ drone in Scene 0
  (Opening Invocation) to ground the peal in a real Vatican recording
  while keeping the deterministic synthesis as the rhythmic skeleton.

Reproduce the derived WAV with:

```bash
npm run prepare:bell -- path/to/197458__everythingsounds__rome-vatican-changing.wav
```
