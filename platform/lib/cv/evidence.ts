export interface CVExcerpt { id: string; text: string }

/** Keep exact source text. IDs let the model cite it without rewriting quotes. */
export function cvExcerpts(text: string): CVExcerpt[] {
  const excerpts: CVExcerpt[] = [];
  const sentences = new Intl.Segmenter("vi", { granularity: "sentence" });
  for (const line of text.split(/\r?\n/u)) {
    for (const { segment } of sentences.segment(line)) {
      let rest = segment.trim();
      while (rest) {
        let end = Math.min(rest.length, 600);
        if (end < rest.length) {
          const space = rest.lastIndexOf(" ", end);
          if (space > 300) end = space;
          // Never split a Unicode surrogate pair at a chunk boundary.
          if (/[\uD800-\uDBFF]/u.test(rest[end - 1]!)) end--;
        }
        const excerpt = rest.slice(0, end).trim();
        if (excerpt) excerpts.push({ id: `cv-${excerpts.length}`, text: excerpt });
        rest = rest.slice(end).trim();
      }
    }
  }
  return excerpts;
}
