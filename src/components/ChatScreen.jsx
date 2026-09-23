import { useMemo, useState } from "react";
import MessageBubble from "./MessageBubble";
import { formatDaySeparator } from "../domain/format";
import { isEditable, editMessageBody } from "../domain/parseChat";
import { applyEdits, downloadText } from "../domain/exportChat";

/**
 * Full chat view: header + scrollable message list with day separators,
 * system chips, internal-action notes and grouped bubbles, plus a footer.
 *
 * Edit mode turns every plain-text message into a textarea; the pencil swaps
 * for Discard/Save plus a button that downloads the edited .txt.
 */
export default function ChatScreen({
  chat,
  title,
  raw = "",
  edits = {},
  onSaveEdits,
  onBack,
}) {
  const { items, participants, internalCount } = chat;
  const [showInternal, setShowInternal] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});

  const name = title || participants[0] || "Chat";
  const messageCount = items.filter((i) => i.type === "message").length;

  // Effective overlay: the live draft while editing, otherwise the saved edits.
  const overlay = editing ? draft : edits;

  const startEdit = () => {
    setDraft({ ...edits });
    setEditing(true);
  };
  const discard = () => {
    setDraft({});
    setEditing(false);
  };
  const save = () => {
    onSaveEdits?.(draft);
    setEditing(false);
  };
  const changeText = (id, value) => setDraft((d) => ({ ...d, [id]: value }));
  const download = () => downloadText(applyEdits(raw, items, overlay), name);

  const visibleItems = useMemo(
    () =>
      showInternal
        ? items
        : items.filter((i) => !(i.type === "system" && i.internal)),
    [items, showInternal],
  );

  const rendered = useMemo(() => buildRenderList(visibleItems), [visibleItems]);

  return (
    <div className="chat">
      <header className="chat__header">
        <button
          type="button"
          className="back-btn"
          title="Volver"
          onClick={onBack}
        >
          ←
        </button>
        <div className="avatar" aria-hidden="true">
          {initials(name)}
        </div>
        <div className="chat__title">
          <div className="chat__name">{name}</div>
          <div className="chat__sub">{messageCount} mensajes</div>
        </div>
        <div className="chat__actions">
          {editing ? (
            <>
              <button
                type="button"
                className="chat__action"
                title="Descartar cambios"
                onClick={discard}
              >
                Descartar
              </button>
              <button
                type="button"
                className="chat__action chat__action--save"
                title="Guardar cambios"
                onClick={save}
              >
                Guardar
              </button>
            </>
          ) : (
            <>
              {internalCount > 0 && (
                <button
                  type="button"
                  className={`icon-btn ${showInternal ? "icon-btn--on" : ""}`}
                  title={
                    showInternal
                      ? "Ocultar acciones internas"
                      : "Mostrar acciones internas"
                  }
                  onClick={() => setShowInternal((v) => !v)}
                >
                  ⚙️
                </button>
              )}
              <button
                type="button"
                className="icon-btn"
                title="Editar respuestas"
                onClick={startEdit}
              >
                ✏️
              </button>
              <button
                type="button"
                className="icon-btn"
                title="Descargar .txt modificado"
                onClick={download}
              >
                ⬇️
              </button>
            </>
          )}
        </div>
      </header>

      <div className="chat__body">
        {rendered.map((entry) => {
          if (entry.kind === "day") {
            return (
              <div className="day-sep" key={`day-${entry.key}`}>
                <span>{entry.label}</span>
              </div>
            );
          }
          if (entry.item.type === "system") {
            return entry.item.internal ? (
              <div className="internal" key={entry.item.id}>
                <span>{entry.item.text}</span>
              </div>
            ) : (
              <div className="system" key={entry.item.id}>
                <span>{entry.item.text}</span>
              </div>
            );
          }
          const editable = isEditable(entry.item);
          const edited = overlay[entry.item.id];
          // Re-parse the edited raw body so the bubble reflects new captions,
          // buttons or lists both live and after saving.
          const displayItem =
            editable && edited != null
              ? editMessageBody(entry.item, edited)
              : entry.item;
          return (
            <MessageBubble
              key={entry.item.id}
              item={displayItem}
              showName={entry.showName}
              showTail={entry.showTail}
              participants={participants}
              editing={editing}
              editable={editable}
              rawValue={edited ?? entry.item.srcText ?? entry.item.text}
              onChange={(v) => changeText(entry.item.id, v)}
            />
          );
        })}
      </div>

      <footer className="chat__footer">
        <div className="fake-input">
          {editing
            ? "Editá cada mensaje y guardá o descargá el .txt"
            : "Vista de solo lectura"}
        </div>
      </footer>
    </div>
  );
}

// --- Render-list assembly ----------------------------------------------------

function buildRenderList(items) {
  const out = [];
  let lastDayKey = null;
  let lastSender = null;

  items.forEach((item, i) => {
    if (item.dayKey && item.dayKey !== lastDayKey) {
      out.push({
        kind: "day",
        key: item.dayKey,
        label: formatDaySeparator(item.ms),
      });
      lastDayKey = item.dayKey;
      lastSender = null;
    }

    if (item.type !== "message") {
      out.push({ kind: "entry", item });
      lastSender = null;
      return;
    }

    const senderKey = item.isMe ? "__me__" : item.sender;
    const next = items[i + 1];
    const nextSameGroup =
      next &&
      next.type === "message" &&
      next.dayKey === item.dayKey &&
      (next.isMe ? "__me__" : next.sender) === senderKey;

    out.push({
      kind: "entry",
      item,
      showName: senderKey !== lastSender, // first of a group
      showTail: senderKey !== lastSender, // tail on the first bubble
    });

    lastSender = senderKey;
    if (!nextSameGroup) lastSender = null; // reset so groups re-open cleanly
  });

  return out;
}

function initials(name) {
  const clean = name.replace(/^@/, "");
  return clean.slice(0, 2).toUpperCase();
}
