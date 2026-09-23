# WhatsApp Chat Viewer

A local, single-page React app that renders an exported WhatsApp `.txt` chat in a
WhatsApp-like interface. Everything runs in the browser — the chat is stored in
`localStorage` and never leaves your machine.

## Features

- **Multiple chats**: import several exports and view each independently — a chat
  list screen, tap to open, back button to return. No need to delete one to see another.
- **Rename** a chat from the list (✏️) and delete it (🗑️, with confirm).
- Import a WhatsApp `.txt` export via button or drag & drop.
- WhatsApp-style bubbles: your messages (`Tú`) on the right, others on the left.
- Day separators (Hoy / Ayer / full date), grouped bubbles with tails, and sender colors.
- System notices (encryption, ad-source, calls) rendered as centered chips.
- Media placeholders (image, video, audio, sticker, GIF, document, location, contact).
- Interactive messages: quick-reply **buttons** `[Botones: A | B | C]` and **lists**
  `[Lista: Título → o1 | o2]` rendered as tappable WhatsApp-style controls.
- Internal automation notes (`- ⚙️ ...`, the backstage the customer never sees) are
  styled distinctly and can be toggled on/off from the header (⚙️).
- File-level comment lines (leading `#`) are ignored.
- Forwarded and deleted messages are recognized.
- Multi-line messages preserved.
- Chat persists in `localStorage`; re-import or clear from the header.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run lint     # ESLint (no-undef catches undefined references before runtime)
```

Build for static hosting:

```bash
npm run build
npm run preview
```

## How to export a chat from WhatsApp

On your phone: open the chat → **⋮ / More → Export chat → Without media** → save the
`.txt`. Then import that file here.

## Architecture

The parser is a pure, framework-free domain module — easy to test and evolve
independently from the UI.

```
src/
  domain/
    parseChat.js     # raw .txt -> structured items (pure, no React)
    format.js        # timestamp -> display strings
  hooks/
    useChats.js      # collection of chats: import, persist, list metadata, delete
  components/
    App.jsx          # navigation between the list and a single chat
    ChatList.jsx     # chat list screen (home)
    ChatScreen.jsx   # single chat view + back button
    MessageBubble.jsx / EmptyState.jsx / ImportButton.jsx
  index.css          # WhatsApp-like styling
```

Storage layout: a metadata index (`whatsapp-viewer:index`) for the list screen,
plus one raw-text entry per chat (`whatsapp-viewer:chat:<id>`) kept separate so
importing one chat never rewrites the others. The raw exported text is the single
source of truth: it is stored as-is and re-parsed on open, so parser improvements
apply to already-imported chats.
