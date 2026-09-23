import { useState } from 'react';
import ImportButton from './ImportButton';
import EmptyState from './EmptyState';
import { formatListTime } from '../domain/format';

/**
 * Chat list screen (like WhatsApp's home). Shows every imported chat; tapping a
 * row opens it. Importing adds a new chat without touching the others.
 */
export default function ChatList({ chats, error, onImport, onOpen, onDelete }) {
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
          <ChatRow key={chat.id} chat={chat} onOpen={onOpen} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

function ChatRow({ chat, onOpen, onDelete }) {
  const [confirming, setConfirming] = useState(false);

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

      {confirming ? (
        <div className="chat-row__confirm" onClick={(e) => e.stopPropagation()}>
          <button className="mini-btn mini-btn--danger" onClick={() => onDelete(chat.id)}>
            Borrar
          </button>
          <button className="mini-btn" onClick={() => setConfirming(false)}>
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="chat-row__delete"
          title="Borrar chat"
          onClick={(e) => {
            e.stopPropagation();
            setConfirming(true);
          }}
        >
          🗑️
        </button>
      )}
    </div>
  );
}

function initials(name) {
  const clean = name.replace(/^@/, '');
  return clean.slice(0, 2).toUpperCase();
}
