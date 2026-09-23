import { formatTime } from '../domain/format';

const MEDIA_LABEL = {
  image: { icon: '📷', label: 'Imagen' },
  video: { icon: '🎥', label: 'Video' },
  audio: { icon: '🎧', label: 'Audio' },
  sticker: { icon: '🩷', label: 'Sticker' },
  gif: { icon: '🎬', label: 'GIF' },
  contact: { icon: '👤', label: 'Contacto' },
  document: { icon: '📄', label: 'Documento' },
  location: { icon: '📍', label: 'Ubicación' },
  media: { icon: '📎', label: 'Multimedia' },
};

// Colors for participant name labels (received messages), keyed by index.
const NAME_COLORS = ['#e542a3', '#1f7aec', '#e6a817', '#0aa884', '#d9536f', '#7f66ff'];

export function nameColor(sender, participants) {
  const idx = Math.max(0, participants.indexOf(sender));
  return NAME_COLORS[idx % NAME_COLORS.length];
}

export default function MessageBubble({
  item,
  showName,
  showTail,
  participants,
  editing = false,
  editable = false,
  rawValue = '',
  onChange,
}) {
  const side = item.isMe ? 'out' : 'in';
  const media = item.media ? MEDIA_LABEL[item.media] : null;
  const caption = media ? stripPlaceholder(item.text) : item.text;

  // Edit mode exposes the raw export body (caption + <media> placeholder +
  // [Botones:...] / [Lista:...]) so anything in the message can be changed.
  if (editing && editable) {
    return (
      <div className={`row row--${side}`}>
        <div className="stack">
          <div className={`bubble bubble--${side} ${showTail ? 'bubble--tail' : ''}`}>
            {showName && !item.isMe && (
              <div className="bubble__name" style={{ color: nameColor(item.sender, participants) }}>
                {item.sender}
              </div>
            )}
            <textarea
              className="bubble__edit"
              value={rawValue}
              rows={Math.max(2, rawValue.split('\n').length)}
              onChange={(e) => onChange?.(e.target.value)}
              aria-label="Editar mensaje (contenido crudo)"
            />
            <span className="bubble__time">
              {formatTime(item.ms)}
              {item.isMe && <span className="bubble__ticks" aria-label="Enviado">✓✓</span>}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // A message may carry only an interactive block (no text/media): in that case
  // we skip the bubble chrome and render the buttons/list on their own.
  const hasBubble = item.deleted || !!media || !!caption || !item.interactive;

  return (
    <div className={`row row--${side}`}>
      <div className="stack">
        {hasBubble && (
          <div className={`bubble bubble--${side} ${showTail ? 'bubble--tail' : ''}`}>
            {showName && !item.isMe && (
              <div className="bubble__name" style={{ color: nameColor(item.sender, participants) }}>
                {item.sender}
              </div>
            )}

            {item.forwarded && <div className="bubble__forwarded">↪ Reenviado</div>}

            {item.deleted ? (
              <div className="bubble__deleted">🚫 Se eliminó este mensaje</div>
            ) : (
              <>
                {media && (
                  <div className="bubble__media">
                    <span className="bubble__media-icon">{media.icon}</span>
                    <span className="bubble__media-label">{media.label}</span>
                  </div>
                )}
                {caption && <div className="bubble__text">{caption}</div>}
              </>
            )}

            <span className="bubble__time">
              {formatTime(item.ms)}
              {item.isMe && <span className="bubble__ticks" aria-label="Enviado">✓✓</span>}
            </span>
          </div>
        )}

        {item.interactive && <Interactive data={item.interactive} side={side} />}
      </div>
    </div>
  );
}

function Interactive({ data, side }) {
  if (data.kind === 'buttons') {
    return (
      <div className={`ia-buttons ia-buttons--${side}`}>
        {data.options.map((opt, i) => (
          <div className="ia-btn" key={i}>
            <span className="ia-btn__icon" aria-hidden="true">↩</span>
            <span className="ia-btn__label">{opt}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`ia-list ia-list--${side}`}>
      <div className="ia-list__header">
        <span className="ia-list__icon" aria-hidden="true">☰</span>
        <span>{data.title || 'Ver opciones'}</span>
      </div>
      <div className="ia-list__items">
        {data.options.map((opt, i) => (
          <div className="ia-list__item" key={i}>{opt}</div>
        ))}
      </div>
    </div>
  );
}

function stripPlaceholder(text) {
  return text
    .replace(/<[^>]*omitid[oa]>|<Media omitted>|<[^>]*omitted>/gi, '')
    .trim();
}
