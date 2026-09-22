// Canvas has no text wrapping. Every text feature past a single centred
// line needs this, so it lives on its own rather than inside whichever
// module happened to want it first.

// Greedy wrap: fills each line as far as it fits, then breaks. Measuring is
// the expensive part, so callers that draw the same string every frame
// (a dialogue line being typed out) should wrap once and keep the result.
//
// A single word longer than maxWidth gets its own line and overflows,
// rather than being broken mid-word — with an 800px canvas and prose, that
// case means the font or the box is wrong, and silently hyphenating would
// hide it.
export function wrapText(ctx, text, maxWidth) {
  const lines = [];
  for (const paragraph of String(text).split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) { lines.push(''); continue; }
    let line = words[0];
    for (let i = 1; i < words.length; i++) {
      const candidate = `${line} ${words[i]}`;
      if (ctx.measureText(candidate).width <= maxWidth) line = candidate;
      else { lines.push(line); line = words[i]; }
    }
    lines.push(line);
  }
  return lines;
}

// How many characters of a wrapped block to show, counting across lines —
// what a typewriter reveal needs. Returns a new array of partial lines.
export function revealLines(lines, charsShown) {
  const out = [];
  let budget = charsShown;
  for (const line of lines) {
    if (budget <= 0) break;
    out.push(line.slice(0, budget));
    budget -= line.length;
  }
  return out;
}

export function totalChars(lines) {
  return lines.reduce((n, l) => n + l.length, 0);
}
