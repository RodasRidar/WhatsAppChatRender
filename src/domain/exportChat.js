// Rebuild a WhatsApp .txt from the original raw export, substituting only the
// edited message bodies. Every untouched line is preserved byte-for-byte, so
// the download keeps the original formatting (timestamps, senders, placeholders)
// and stays re-importable by the parser.

/**
 * @param {string} raw        Original raw export.
 * @param {Array}  items      Parsed items (carry srcStart/srcEnd/srcPrefix).
 * @param {Object} edits      Map of item.id -> new text (only edited entries).
 * @returns {string}          The edited export.
 */
export function applyEdits(raw, items, edits) {
  const lines = String(raw).replace(/\r\n?/g, '\n').split('\n');

  const replacements = items
    .filter(
      (it) =>
        edits[it.id] != null &&
        edits[it.id] !== it.srcText &&
        it.srcStart != null &&
        it.srcEnd != null &&
        it.srcPrefix != null
    )
    // A multi-line edit becomes header + continuation lines, exactly how the
    // parser reads them back.
    .map((it) => ({
      start: it.srcStart,
      end: it.srcEnd,
      block: `${it.srcPrefix}${edits[it.id]}`.split('\n'),
    }))
    // Splice from the bottom up so earlier indices stay valid.
    .sort((a, b) => b.start - a.start);

  for (const r of replacements) {
    lines.splice(r.start, r.end - r.start + 1, ...r.block);
  }

  return lines.join('\n');
}

/** Trigger a browser download of `text` as a .txt file. */
export function downloadText(text, fileName) {
  const safe = `${(fileName || 'chat').replace(/[^\w.-]+/g, '_')}`.replace(/\.txt$/i, '');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safe}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
