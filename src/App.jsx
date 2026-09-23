import { useCallback, useEffect, useMemo, useState } from 'react';
import { useChats } from './hooks/useChats';
import { parseChat } from './domain/parseChat';
import ChatList from './components/ChatList';
import ChatScreen from './components/ChatScreen';

export default function App() {
  const { chats, error, importFile, getRaw, getEdits, saveEdits, renameChat, removeChat } = useChats();
  const [selectedId, setSelectedId] = useState(null);
  const [edits, setEdits] = useState({});

  const selected = selectedId ? chats.find((c) => c.id === selectedId) : null;
  const raw = selected ? getRaw(selected.id) : '';
  const chat = useMemo(() => (raw ? parseChat(raw) : null), [raw]);

  // Load the saved edit overlay whenever a different chat is opened.
  useEffect(() => {
    setEdits(selectedId ? getEdits(selectedId) : {});
  }, [selectedId, getEdits]);

  const handleSaveEdits = useCallback(
    (map) => {
      if (!selected || !chat) return;
      // Keep only entries that actually differ from the original raw body.
      const byId = new Map(chat.items.map((it) => [it.id, it]));
      const clean = {};
      for (const [id, val] of Object.entries(map)) {
        const it = byId.get(Number(id));
        if (it && val !== it.srcText) clean[id] = val;
      }
      saveEdits(selected.id, clean);
      setEdits(clean);
    },
    [selected, chat, saveEdits]
  );

  return (
    <div className="app">
      <div className="phone">
        {selected && chat ? (
          <ChatScreen
            chat={chat}
            title={selected.title}
            raw={raw}
            edits={edits}
            onSaveEdits={handleSaveEdits}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <ChatList
            chats={chats}
            error={error}
            onImport={importFile}
            onOpen={setSelectedId}
            onRename={renameChat}
            onDelete={removeChat}
          />
        )}
      </div>
    </div>
  );
}
