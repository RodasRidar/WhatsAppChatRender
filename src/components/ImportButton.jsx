import { useRef } from 'react';

/**
 * File picker restricted to .txt. Reusable in the empty state and the header.
 */
export default function ImportButton({ onImport, children, className = '' }) {
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onImport(file);
    e.target.value = ''; // allow re-importing the same file name
  };

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => inputRef.current?.click()}
      >
        {children}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,text/plain"
        hidden
        onChange={handleChange}
      />
    </>
  );
}
