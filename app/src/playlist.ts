/**
 * Canonical performance order for the master track.
 *
 * Deviates from the script's source-order (which has chorus first) so the
 * narrative reads: THE EYEWITNESS reports, THEN THE CHURCH LEADER addresses
 * the congregation, THEN THE CHORUS responds with the refrain. The chorus
 * "responds" to a preceding leader segment throughout, as in a real mass.
 *
 * Scene IDs are the filenames under app/scenes/ (without .md extension).
 * Kept in a side-effect-free module so scripts can import it without
 * triggering any CLI entrypoint.
 */
export const DEFAULT_PLAYLIST: readonly string[] = [
  "00-opening",
  "01-eyewitness",
  "03-church-leader-speech",
  "02-chorus-first",
  "05-church-leader-speech-continued",
  "04-chorus-second",
  "07-church-leader-silence",
  "06-chorus-third",
  "08-church-leader-amen",
  "09-praying-alien",
  "10-chorus-fourth",
  "11-church-leader-prayer",
  "12-chorus-final-echo",
  "13-blessing",
  "14-coda",
];
