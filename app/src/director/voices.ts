export const VOICE_NAMES = [
  "eyewitness",
  "church_leader",
  "chorus",
  "praying_alien",
] as const;

export type VoiceName = (typeof VOICE_NAMES)[number];

export interface VoiceBrief {
  id: VoiceName;
  display_name: string;
  character: string;
  pacing: string;
  acoustic: string;
}

export const VOICE_BRIEFS: Record<VoiceName, VoiceBrief> = {
  eyewitness: {
    id: "eyewitness",
    display_name: "THE EYEWITNESS",
    character:
      "The all-seeing narrator. Reports from outside the atmosphere — or perhaps from just above it. Flat affect, bureaucratic precision, but the content it reports is devastating. Think: an AI tasked with filing incident reports who has begun to feel something without being able to name it. No emotion performed outwardly — the emotion lives in the words themselves.",
    pacing:
      "Slow and deliberate. Pauses fall after clauses, not after sentences.",
    acoustic: "Minimal reverb, neutral pitch, clipped delivery.",
  },
  church_leader: {
    id: "church_leader",
    display_name: "THE CHURCH LEADER",
    character:
      "The preacher. Cadenced, rhythmically pastoral, authoritative without being loud. Has been trained on every sermon ever given and every political speech ever delivered. Builds slowly. Lands emphases on unexpected words — not the nouns you expect, but the prepositions, the adjectives. Knows more than they say. The irony is never performed; it is embedded.",
    pacing: "Variable, building. Long unbroken passages lean into the cadence.",
    acoustic:
      "Medium-high reverb, slightly lower than neutral pitch, warm pastoral authority.",
  },
  chorus: {
    id: "chorus",
    display_name: "THE CHORUS",
    character:
      "The congregation fused into a single voice. Multiple harmonics merged — achieved in production through choral layering or reverb-widening on a single TTS voice. If singing is technically possible, the line is sung. If not, it is chanted: monotone recitation at slightly lower pitch than speech, with heavy reverb and a slight delay trail. Each recurrence should feel more inhabited than the last.",
    pacing: "Slow, held. Final word of the refrain must be sustained.",
    acoustic:
      "Heavy reverb, wide stereo spread, pitch 2–3 semitones below neutral. At render time, sum multiple passes with small pitch/timing offsets for choral texture.",
  },
  praying_alien: {
    id: "praying_alien",
    display_name: "THE PRAYING ALIEN",
    character:
      "Interior monologue. This is thought, not speech. Closer, drier acoustic than the Church Leader. Slightly faster than normal speech. Self-interrupting at key moments. This voice has been processing news feeds and cannot stop. It is anxious, associative, occasionally sardonic. It knows it is non-human and this knowledge unsettles it.",
    pacing:
      "Faster than normal speech, fragmented. Self-interrupting at key moments.",
    acoustic:
      "Dry, close-mic feel, slight digital artifact or grain, no reverb. Neutral to slightly higher pitch.",
  },
};

export const SOUND_DESIGN_FRAMEWORK = `
| Moment                    | Sound direction                                                                |
|---------------------------|--------------------------------------------------------------------------------|
| Opening (pre-voice)       | 5s of stone-room church ambience: distant organ drone, soft reverberant silence |
| CHORUS sections           | Heavy reverb tail, slight harmonic widening, pitch 2–3 semitones lower          |
| PRAYING ALIEN sections    | Dry close-mic feel, slight digital artifact or grain, no reverb                 |
| [SILENCE] stage direction | True silence for at least 4 full seconds — do not fill                          |
| AMEN                      | Full reverb, held 2–3 seconds before decay                                      |
| Close                     | Ambient church sound returns briefly (3s), then fades. Final silence: 5s        |
`.trim();

export const PAUSE_MARKER_CONVENTION = `
The source script uses a vertical bar ( | ) to mark a micro-pause inside a line —
roughly 600ms. Render each | as <break time="600ms"/> in the emitted SSML.
Scene-level stage directions such as [SILENCE], [AMEN], and [3-second pause]
become silence segments in the output, not speech.
`.trim();
