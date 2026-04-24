# Introduction video assets

Drop two files here (filenames matter — `submission.html` references them):

- **`intro.mp4`** — the recorded introduction. Target: 720p (1280×720) or
  1080p (1920×1080), H.264 video + AAC audio, 30 fps, 2–4 Mbps.
  Two-to-three minutes is the sweet spot for hackathon jury review.
- **`intro-poster.jpg`** — a still frame used before the video plays.
  Same aspect ratio (16:9), 1280×720 or larger, under 300 KB.

Keep the file under 100 MB so GitHub Pages serves it without touching
git-lfs.

Captions (optional, deferred in the current PR): a WebVTT file at
`intro.vtt` plus a `<track>` element in `submission.html`. Not wired up
yet — will be added when the captions track is ready.

If you need to re-encode a source recording to the above targets, the
bundled `ffmpeg-static` binary is already available:

```bash
./node_modules/ffmpeg-static/ffmpeg.exe \
  -i source.mov \
  -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  public/assets/video/intro.mp4
```

`+faststart` moves the metadata to the front of the file so the video
can start playing before it is fully downloaded — matters on mobile.
