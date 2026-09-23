// Pure domain parser: WhatsApp exported .txt -> structured chat data.
// No React, no DOM, no side effects. Fully unit-testable in isolation.
//
// Supported line shapes:
//   [8/20/26, 2:20:33 AM] Tú: message               -> normal message
//   [8/20/26, 9:11:55 AM] - System notice           -> system message
//   [9/22/26, 8:01:51 AM] - ⚙️ internal action      -> internal system (hidden-able)
//   [.., ..] Tú: [Botones: A | B | C]               -> interactive quick-reply buttons
//   [.., ..] Tú: [Lista: Título → o1 | o2 | o3]      -> interactive list message
//   8/20/26, 2:20 p. m. - Tú: message               -> Android/dash export (fallback)
//   <continuation line>                             -> appended to previous item
//   Leading "#" lines / encryption notice           -> file comments / system

// --- Detection tables --------------------------------------------------------

const MEDIA_PATTERNS = [
  { re: /<imagen omitida>|<image omitted>/i, type: 'image' },
  { re: /<video omitido>|<video omitted>/i, type: 'video' },
  { re: /<audio omitido>|<audio omitted>|<PTT omitido>/i, type: 'audio' },
  { re: /<sticker omitido>|<sticker omitted>/i, type: 'sticker' },
  { re: /<GIF omitido>|<GIF omitted>/i, type: 'gif' },
  { re: /<Contacto omitido>|<contact card omitted>/i, type: 'contact' },
  { re: /<Documento omitido>|<document omitted>/i, type: 'document' },
  { re: /<ubicaci[oó]n:|location:/i, type: 'location' },
  { re: /<Multimedia omitido>|<Media omitted>/i, type: 'media' },
];

const DELETED_PATTERNS = [
  /se elimin[oó] este mensaje/i,
  /este mensaje fue eliminado/i,
  /you deleted this message/i,
  /this message was deleted/i,
];

const FORWARDED_RE = /^\[reenviado\]\s*|^\[forwarded\]\s*/i;

// Interactive WhatsApp messages (the customer taps instead of typing).
const LIST_RE = /\[Lista:\s*([^\]]+)\]/i;
const BUTTONS_RE = /\[Botones:\s*([^\]]+)\]/i;

// Senders that represent the person/bot who exported the chat (right side).
const ME_ALIASES = new Set(['tú', 'tu', 'you']);

// Header shapes. Meridiem tolerates "AM", "a.m.", "a. m.", etc.
const BRACKET_RE =
  /^\[(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*([ap]\.?\s?m\.?)?\]\s?(.*)$/i;
const DASH_RE =
  /^(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*([ap]\.?\s?m\.?)?\s+-\s+(.*)$/i;

// Body of a normal message: "Sender: text". Sender is bounded to avoid eating
// a colon that belongs to the message body.
const SENDER_RE = /^([^:\n]{1,60}?):\s?([\s\S]*)$/;

// --- Helpers -----------------------------------------------------------------

function parseTimestamp(dateStr, timeStr, meridiem) {
  const sep = dateStr.includes('/') ? '/' : dateStr.includes('.') ? '.' : '-';
  let [a, b, y] = dateStr.split(sep).map((n) => parseInt(n, 10));

  // Default to M/D/Y (WhatsApp iOS Latam/US). If the first field can't be a
  // month but the second can, treat it as D/M/Y.
  let month;
  let day;
  if (a > 12 && b <= 12) {
    day = a;
    month = b;
  } else {
    month = a;
    day = b;
  }
  if (y < 100) y += 2000;

  const [hh, mm, ss = 0] = timeStr.split(':').map((n) => parseInt(n, 10));
  let hour = hh;
  if (meridiem) {
    const isPM = /p/i.test(meridiem);
    if (isPM && hour < 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;
  }

  const date = new Date(y, month - 1, day, hour, mm, ss);
  return { ms: date.getTime(), dayKey: `${y}-${month}-${day}` };
}

function detectMedia(text) {
  for (const { re, type } of MEDIA_PATTERNS) {
    if (re.test(text)) return type;
  }
  return null;
}

function isDeleted(text) {
  return DELETED_PATTERNS.some((re) => re.test(text));
}

function splitOptions(str) {
  return str
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Extract an interactive block ([Botones: ...] / [Lista: ...]) from the text.
 * Returns the parsed structure plus the remaining text (used as a caption).
 */
function parseInteractive(text) {
  const listMatch = LIST_RE.exec(text);
  if (listMatch) {
    const rest = text.replace(listMatch[0], '').trim();
    const parts = listMatch[1].split(/\s*(?:→|->)\s*/);
    const title = parts.length >= 2 ? parts[0].trim() : null;
    const optionsStr = parts.length >= 2 ? parts.slice(1).join(' ') : listMatch[1];
    return { interactive: { kind: 'list', title, options: splitOptions(optionsStr) }, rest };
  }

  const btnMatch = BUTTONS_RE.exec(text);
  if (btnMatch) {
    const rest = text.replace(btnMatch[0], '').trim();
    return { interactive: { kind: 'buttons', title: null, options: splitOptions(btnMatch[1]) }, rest };
  }

  return { interactive: null, rest: text };
}

function makeMessage(sender, body, stamp) {
  let text = body;

  const forwarded = FORWARDED_RE.test(text);
  if (forwarded) text = text.replace(FORWARDED_RE, '');

  const { interactive, rest } = parseInteractive(text);
  text = rest;

  const media = detectMedia(text);
  const deleted = isDeleted(text);
  const normalized = sender.trim();

  return {
    type: 'message',
    sender: normalized,
    isMe: ME_ALIASES.has(normalized.toLowerCase()),
    text: text.trim(),
    media,
    interactive,
    forwarded,
    deleted,
    ms: stamp.ms,
    dayKey: stamp.dayKey,
  };
}

function makeSystem(rawText, stamp) {
  const text = rawText.replace(/^-\s*/, '').trim();
  return {
    type: 'system',
    text,
    internal: /^⚙️/.test(text), // backstage automation the customer never sees
    ms: stamp ? stamp.ms : null,
    dayKey: stamp ? stamp.dayKey : null,
  };
}

function matchHeader(line) {
  const m = BRACKET_RE.exec(line) || DASH_RE.exec(line);
  if (!m) return null;
  const [, date, time, meridiem, body] = m;
  return { body, stamp: parseTimestamp(date, time, meridiem) };
}

// --- Public API --------------------------------------------------------------

/**
 * Parse a raw WhatsApp .txt export into structured data.
 * @param {string} raw
 * @returns {{ items: Array, participants: string[], meName: string|null, internalCount: number }}
 */
export function parseChat(raw) {
  const lines = String(raw).replace(/\r\n?/g, '\n').split('\n');
  const items = [];
  let last = null;
  let seenHeader = false;

  // `srcStart`/`srcEnd` mark the raw line span each item owns (inclusive), so an
  // export can rewrite only the edited items and leave every other line intact.
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    // Skip file-level comment lines (e.g. proposal notes) before the chat starts.
    if (!seenHeader && line.trimStart().startsWith('#')) continue;
    if (line.trim() === '' && last === null) continue;

    const header = matchHeader(line);

    if (!header) {
      // Continuation of the previous item, or a leading notice.
      if (last) {
        last.text = last.text ? `${last.text}\n${line}` : line;
        if (last.type === 'message' && !last.media) last.media = detectMedia(last.text);
        // Keep the raw body in sync so `srcPrefix + srcText` reproduces the
        // original lines verbatim (used for editing and faithful export).
        last.srcText = last.srcText != null ? `${last.srcText}\n${line}` : line;
        last.srcEnd = li;
      } else if (line.trim() !== '') {
        last = makeSystem(line.trim(), null);
        last.srcPrefix = '';
        last.srcText = line;
        last.srcStart = li;
        last.srcEnd = li;
        items.push(last);
      }
      continue;
    }

    seenHeader = true;
    const { body, stamp } = header;

    // Everything on the header line before the body, so an export can splice
    // `srcPrefix + editedBody` back in.
    const prefix = line.slice(0, line.length - body.length);

    // System line: bracket export writes "- text"; dash export has no "Sender:".
    if (/^-\s/.test(body) || (!SENDER_RE.test(body) && !body.includes(':'))) {
      last = makeSystem(body, stamp);
      last.srcPrefix = prefix;
      last.srcText = body;
      last.srcStart = li;
      last.srcEnd = li;
      items.push(last);
      continue;
    }

    const senderMatch = SENDER_RE.exec(body);
    if (senderMatch) {
      const [, sender, text] = senderMatch;
      last = makeMessage(sender, text, stamp);
      // The prefix must also cover "Sender: ", so extend it past the header.
      last.srcPrefix = line.slice(0, line.length - text.length);
      last.srcText = text;
      last.srcStart = li;
      last.srcEnd = li;
      items.push(last);
    } else {
      last = makeSystem(body, stamp);
      last.srcPrefix = prefix;
      last.srcText = body;
      last.srcStart = li;
      last.srcEnd = li;
      items.push(last);
    }
  }

  // Assign stable ids, collect participants, count internal actions.
  const counts = new Map();
  let internalCount = 0;
  items.forEach((item, i) => {
    item.id = i;
    if (item.type === 'message' && !item.isMe) {
      counts.set(item.sender, (counts.get(item.sender) || 0) + 1);
    }
    if (item.type === 'system' && item.internal) internalCount += 1;
  });

  const participants = [...counts.keys()];
  const meItem = items.find((it) => it.type === 'message' && it.isMe);
  const meName = meItem ? meItem.sender : null;

  return { items, participants, meName, internalCount };
}

/**
 * Every message is editable: the editor exposes the raw body (the exact text
 * after "Sender: " in the export), so captions, [Botones:...] and [Lista:...]
 * are all editable and round-trip faithfully. System notices stay read-only.
 */
export function isEditable(item) {
  return item.type === 'message';
}

/**
 * Re-derive a message from an edited raw body, keeping its identity and source
 * span. Used to live-render an edit (media, interactive, text, deleted, …)
 * without touching the untouched items around it.
 */
export function editMessageBody(item, body) {
  const next = makeMessage(item.sender, body, { ms: item.ms, dayKey: item.dayKey });
  return {
    ...next,
    id: item.id,
    srcPrefix: item.srcPrefix,
    srcText: body,
    srcStart: item.srcStart,
    srcEnd: item.srcEnd,
  };
}
