export type SsmlToken =
  | { type: "text"; text: string }
  | { type: "break"; ms: number };

const BREAK_RE = /<break\s+time="(\d+)(ms|s)"\s*\/>/gi;
const SPEAK_RE = /<\/?speak[^>]*>/gi;
const STRIP_RE = /<\/?(emphasis|prosody)[^>]*>/gi;

export function tokenizeSsml(ssml: string): SsmlToken[] {
  const body = ssml.replace(SPEAK_RE, "").replace(STRIP_RE, "").trim();

  const tokens: SsmlToken[] = [];
  let last = 0;
  BREAK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = BREAK_RE.exec(body)) !== null) {
    const before = body.slice(last, m.index).trim();
    if (before) tokens.push({ type: "text", text: before });
    const n = Number(m[1]);
    const unit = m[2];
    const ms = unit === "s" ? n * 1000 : n;
    tokens.push({ type: "break", ms });
    last = BREAK_RE.lastIndex;
  }
  const tail = body.slice(last).trim();
  if (tail) tokens.push({ type: "text", text: tail });
  return tokens;
}
