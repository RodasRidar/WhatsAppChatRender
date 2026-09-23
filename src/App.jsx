import { useMemo, useState } from 'react';
import { useChats } from './hooks/useChats';
import { parseChat } from './domain/parseChat';
import ChatList from './components/ChatList';
import ChatScreen from './components/ChatScreen';

export default function App() {
  const { chats, error, importFile, getRaw, renameChat, removeChat } = useChats();
  const [selectedId, setSelectedId] = useState(null);

  const selected = selectedId ? chats.find((c) => c.id === selectedId) : null;
  const raw = selected ? getRaw(selected.id) : '';
  const chat = useMemo(() => (raw ? parseChat(raw) : null), [raw]);

  return (
    <div className="app">
      <div className="phone">
        {selected && chat ? (
          <ChatScreen
            chat={chat}
            title={selected.title}
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
