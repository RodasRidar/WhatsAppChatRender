import { useCallback, useState } from 'react';
import { parseChat } from '../domain/parseChat';

// Storage layout: a small metadata index for the list screen, plus one raw-text
// entry per chat (kept separate so importing one doesn't rewrite the others).
const INDEX_KEY = 'whatsapp-viewer:index';
const rawKey = (id) => `whatsapp-viewer:chat:${id}`;

// Legacy single-chat keys from the earlier version (migrated on first load).
const LEGACY_RAW = 'whatsapp-viewer:chat';
const LEGACY_NAME = 'whatsapp-viewer:name';

function readIndex() {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeIndex(list) {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(list));
  } catch {
    /* quota — index stays in memory for this session */
  }
}

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function previewText(item) {
  if (item.deleted) return 'Se eliminó este mensaje';
  if (item.interactive) {
    return item.interactive.kind === 'list' ? '📋 Lista de opciones' : '🔘 Opciones';
  }
  if (item.media) return `[${item.media}]`;
  return item.text.replace(/\s+/g, ' ').trim().slice(0, 70);
}

/** Derive the list-row metadata from a raw export (parses once at import time). */
function buildMeta(id, fileName, raw) {
  const { items, participants } = parseChat(raw);
  const messages = items.filter((i) => i.type === 'message');
  const last = messages[messages.length - 1];
  return {
    id,
    title: participants[0] || (fileName || '').replace(/\.txt$/i, '') || 'Chat',
    fileName: fileName || '',
    importedAt: Date.now(),
    count: messages.length,
    lastMs: last ? last.ms : null,
    preview: last ? previewText(last) : '',
  };
}

function migrateLegacy() {
  try {
    const oldRaw = localStorage.getItem(LEGACY_RAW);
    if (!oldRaw) return [];
    const name = localStorage.getItem(LEGACY_NAME) || '';
    const id = newId();
    const meta = buildMeta(id, name, oldRaw);
    localStorage.setItem(rawKey(id), oldRaw);
    writeIndex([meta]);
    localStorage.removeItem(LEGACY_RAW);
    localStorage.removeItem(LEGACY_NAME);
    return [meta];
  } catch {
    return [];
  }
}

/**
 * Owns the collection of imported chats. Each chat's raw text is the single
 * source of truth and is re-parsed on open, so parser improvements apply to
 * already-stored chats.
 */
export function useChats() {
  const [chats, setChats] = useState(() => {
    const idx = readIndex();
    return idx.length ? idx : migrateLegacy();
  });
  const [error, setError] = useState('');

  const importText = useCallback((raw, fileName) => {
    const id = newId();
    let meta;
    try {
      meta = buildMeta(id, fileName, raw);
    } catch {
      setError('No se pudo interpretar el chat.');
      return;
    }
    try {
      localStorage.setItem(rawKey(id), raw);
      setError('');
    } catch {
      setError('El chat es muy grande para guardarlo; se muestra solo en esta sesión.');
    }
    setChats((prev) => {
      const next = [meta, ...prev];
      writeIndex(next);
      return next;
    });
  }, []);

  const importFile = useCallback(
    (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => importText(String(e.target.result), file.name);
      reader.onerror = () => setError('No se pudo leer el archivo.');
      reader.readAsText(file, 'utf-8');
    },
    [importText]
  );

  const getRaw = useCallback((id) => {
    try {
      return localStorage.getItem(rawKey(id)) || '';
    } catch {
      return '';
    }
  }, []);

  const renameChat = useCallback((id, title) => {
    const clean = title.trim();
    if (!clean) return;
    setChats((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, title: clean } : c));
      writeIndex(next);
      return next;
    });
  }, []);

  const removeChat = useCallback((id) => {
    try {
      localStorage.removeItem(rawKey(id));
    } catch {
      /* ignore */
    }
    setChats((prev) => {
      const next = prev.filter((c) => c.id !== id);
      writeIndex(next);
      return next;
    });
  }, []);

  return { chats, error, importFile, getRaw, renameChat, removeChat };
}
