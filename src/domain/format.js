// Presentation-agnostic formatting helpers for timestamps.

const timeFmt = new Intl.DateTimeFormat('es', { hour: 'numeric', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' });
const shortDateFmt = new Intl.DateTimeFormat('es', { day: '2-digit', month: '2-digit', year: '2-digit' });

export function formatTime(ms) {
  if (ms == null) return '';
  return timeFmt.format(new Date(ms));
}

/** Compact stamp for the chat list: time if today, else a short date. */
export function formatListTime(ms) {
  if (ms == null) return '';
  const d = new Date(ms);
  if (sameDay(d, new Date())) return timeFmt.format(d);
  return shortDateFmt.format(d);
}

export function formatDaySeparator(ms) {
  if (ms == null) return '';
  const d = new Date(ms);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (sameDay(d, today)) return 'Hoy';
  if (sameDay(d, yesterday)) return 'Ayer';
  return capitalize(dayFmt.format(d));
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
