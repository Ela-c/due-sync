# DueSync

DueSync is a Chrome extension popup that helps students export OnTrack assessment tasks into external planning tools.

The current production path supports Trello: select a unit, choose tasks, connect Trello, pick a board/list, and create cards with due dates.

## Features

- Reads units and task definitions from an authenticated OnTrack tab.
- Supports multi-select export of tasks.
- Creates Trello cards (title, description, due date) in a selected list.
- Uses short-lived Trello token storage with local caching for faster repeated loads.
- Includes a guided 6-step popup flow for selection, connection, destination setup, and export progress.

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS 4 + shadcn/ui-style primitives
- Chrome Extensions Manifest V3 APIs (`tabs`, `scripting`, `storage`, `identity`)

## Prerequisites

- Node.js 20+
- pnpm
- Google Chrome
- An authenticated OnTrack session in an open tab
- Trello API key

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create your environment file:

```bash
cp .env.example .env
```

3. Set your Trello key in `.env`:

```env
VITE_TRELLO_APP_API_KEY="your_trello_api_key"
```

## Development

Run the app in dev mode:

```bash
pnpm run dev
```

Build for extension loading:

```bash
pnpm run build
```

Lint:

```bash
pnpm run lint
```

Preview production build:

```bash
pnpm run preview
```

## Load as Chrome Extension

1. Build the project with `pnpm run build`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the generated `dist` folder.

## Usage Flow

1. Open OnTrack and ensure you are logged in.
2. Open the DueSync extension popup.
3. Load units, choose one, then select tasks.
4. Select Trello as destination.
5. Authorize Trello and choose board/list.
6. Export tasks and verify created cards.

## Security Notes

- Keep `.env` local and never commit real API keys.
- Trello access tokens are stored locally for session reuse and can be revoked from the popup.

## Status

- Trello integration: available
- Notion integration: planned (UI placeholder present)
