import { useState } from 'react';
import ImportButton from './ImportButton';
import EmptyState from './EmptyState';
import { formatListTime } from '../domain/format';

/**
 * Chat list screen (like WhatsApp's home). Shows every imported chat; tapping a
 * row opens it. Importing adds a new chat without touching the others.
 */
export default function ChatList({ chats, error, onImport, onOpen, onRename, onDelete }) {
  const [dragging, setDragging] = useState(false);

  if (chats.length === 0) {
    return <EmptyState error={error} onImport={onImport} />;
  }

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onImport(file);
  };

  return (
    <div className="list">
      <header className="list__header">
        <div className="list__brand">Chats</div>
        <ImportButton className="icon-btn" onImport={onImport}>
          <span title="Importar chat">📥</span>
        </ImportButton>
      </header>

      {error && <div className="chat__banner">{error}</div>}

      <div
        className={`list__body ${dragging ? 'list__body--drag' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {chats.map((chat) => (
          <ChatRow
            key={chat.id}
            chat={chat}
            onOpen={onOpen}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

// mode: 'view' | 'edit' | 'confirm'
function ChatRow({ chat, onOpen, onRename, onDelete }) {
  const [mode, setMode] = useState('view');
  const [draft, setDraft] = useState(chat.title);

  const save = () => {
    onRename(chat.id, draft);
    setMode('view');
  };
  const cancel = () => {
    setDraft(chat.title);
    setMode('view');
  };

  if (mode === 'edit') {
    return (
      <div className="chat-row chat-row--edit" onClick={(e) => e.stopPropagation()}>
        <div className="avatar avatar--list" aria-hidden="true">{initials(draft || chat.title)}</div>
        <input
          className="chat-row__input"
          autoFocus
          value={draft}
          maxLength={40}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') cancel();
          }}
          onBlur={save}
        />
        {/* onMouseDown preventDefault keeps the input from blurring before the click. */}
        <button className="icon-act" title="Guardar" onMouseDown={(e) => e.preventDefault()} onClick={save}>
          ✔️
        </button>
        <button className="icon-act" title="Cancelar" onMouseDown={(e) => e.preventDefault()} onClick={cancel}>
          ✖️
        </button>
      </div>
    );
  }

  return (
    <div className="chat-row" onClick={() => onOpen(chat.id)}>
      <div className="avatar avatar--list" aria-hidden="true">{initials(chat.title)}</div>

      <div className="chat-row__main">
        <div className="chat-row__top">
          <span className="chat-row__title">{chat.title}</span>
          <span className="chat-row__time">{formatListTime(chat.lastMs)}</span>
        </div>
        <div className="chat-row__bottom">
          <span className="chat-row__preview">{chat.preview || 'Sin mensajes'}</span>
          <span className="chat-row__count">{chat.count}</span>
        </div>
      </div>

      {mode === 'confirm' ? (
        <div className="chat-row__actions" onClick={(e) => e.stopPropagation()}>
          <button className="mini-btn mini-btn--danger" onClick={() => onDelete(chat.id)}>
            Borrar
          </button>
          <button className="mini-btn" onClick={() => setMode('view')}>
            Cancelar
          </button>
        </div>
      ) : (
        <div className="chat-row__actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="icon-act"
            title="Editar nombre"
            onClick={() => {
              setDraft(chat.title);
              setMode('edit');
            }}
          >
            ✏️
          </button>
          <button
            type="button"
            className="icon-act"
            title="Borrar chat"
            onClick={() => setMode('confirm')}
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
}

function initials(name) {
  const clean = name.replace(/^@/, '');
  return clean.slice(0, 2).toUpperCase();
}
