// src/utils/limitEmojis.ts
export function limitEmojis(
  input: string,
  opts: { maxTotal?: number; maxRun?: number } = {}
): string {
  const { maxTotal = Number(process.env.MAX_EMOJIS ?? 5), maxRun = Number(process.env.MAX_EMOJI_RUN ?? 3) } = opts;

  const custom = /<a?:\w{2,}:\d+>/g;
  const uni = /(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)/gu;
  const anyEmoji = new RegExp(`${custom.source}|${uni.source}`, 'gu');

  let total = 0;
  let last = '';
  let run = 0;

  const out = input.replace(anyEmoji, (m) => {
    if (m === last) {
      run += 1;
    } else {
      last = m;
      run = 1;
    }
    if (run > maxRun) return '';
    if (total >= maxTotal) return '';
    total += 1;
    return m;
  });

  return out.replace(/\s{3,}/g, ' ').trim();
}
