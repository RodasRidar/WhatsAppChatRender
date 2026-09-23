import { useState } from 'react';
import ImportButton from './ImportButton';

/**
 * Landing screen shown when no chat is loaded. Supports click-to-pick and
 * drag & drop of a .txt export.
 */
export default function EmptyState({ onImport, error }) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onImport(file);
  };

  return (
    <div
      className={`empty ${dragging ? 'empty--drag' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <div className="empty__card">
        <div className="empty__logo" aria-hidden="true">💬</div>
        <h1 className="empty__title">WhatsApp Chat Viewer</h1>
        <p className="empty__text">
          Importá un chat exportado de WhatsApp en formato <code>.txt</code> y
          visualizalo como en la app. Se guarda en tu navegador (localStorage);
          nada sale de tu equipo.
        </p>

        <ImportButton className="btn btn--primary" onImport={onImport}>
          Importar chat (.txt)
        </ImportButton>

        <p className="empty__hint">o arrastrá el archivo aquí</p>

        {error && <p className="empty__error">{error}</p>}
      </div>
    </div>
  );
}
