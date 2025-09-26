// src/limitEmojis.ts
export function limitEmojis(input: string): string {
  // Hard caps (no env vars)
  const maxTotal = 5;  // total emojis allowed in the whole message
  const maxRun   = 3;  // same emoji in a row

  // Custom Discord emojis: <:name:id> or <a:name:id>
  const custom = /<a?:\w{2,}:\d+>/g;
  // Unicode emojis (supports ZWJ sequences)
  const uni = /(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)/gu;

  const anyEmoji = new RegExp(`${custom.source}|${uni.source}`, 'gu');

  let total = 0, last = '', run = 0;

  const out = input.replace(anyEmoji, (m) => {
    if (m === last) run++; else { last = m; run = 1; }
    if (run > maxRun) return '';
    if (total >= maxTotal) return '';
    total++;
    return m;
  });

  return out.replace(/\s{3,}/g, ' ').trim();
}
