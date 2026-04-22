export type SsmlToken =
  | { type: "text"; text: string; speed_factor: number }
  | { type: "break"; ms: number };

const SPEAK_RE = /<\/?speak[^>]*>/gi;
// <prosody> is a director hint at the schema layer — Kokoro doesn't parse it.
// Strip it before tokenization so it doesn't leak into the spoken text.
const PROSODY_RE = /<\/?prosody[^>]*>/gi;
const TAG_RE =
  /<break\s+time="(\d+)(ms|s)"\s*\/>|<emphasis[^>]*>|<\/emphasis>/gi;

// Emphasized phrases render at a slightly slower speed than the segment base.
// Kokoro has no native emphasis control — slowing the phrase is the cleanest
// way to give it landing weight without artificially pitching it up.
const EMPHASIS_SPEED_FACTOR = 0.88;

export function tokenizeSsml(ssml: string): SsmlToken[] {
  const body = ssml.replace(SPEAK_RE, "").replace(PROSODY_RE, "").trim();

  const tokens: SsmlToken[] = [];
  let emphasis_depth = 0;
  let last = 0;
  TAG_RE.lastIndex = 0;

  const pushText = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    tokens.push({
      type: "text",
      text,
      speed_factor: emphasis_depth > 0 ? EMPHASIS_SPEED_FACTOR : 1,
    });
  };

  let m: RegExpExecArray | null;
  while ((m = TAG_RE.exec(body)) !== null) {
    pushText(body.slice(last, m.index));
    const tag = m[0];
    if (tag.startsWith("<break")) {
      const n = Number(m[1]);
      const unit = m[2];
      const ms = unit === "s" ? n * 1000 : n;
      tokens.push({ type: "break", ms });
    } else if (tag.startsWith("</emphasis")) {
      emphasis_depth = Math.max(0, emphasis_depth - 1);
    } else if (tag.toLowerCase().startsWith("<emphasis")) {
      emphasis_depth++;
    }
    last = TAG_RE.lastIndex;
  }
  pushText(body.slice(last));
  return tokens;
}
