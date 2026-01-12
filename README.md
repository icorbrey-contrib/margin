# Margin

*Write in the margins of the web*

A web comments layer built on [AT Protocol](https://atproto.com) that lets you annotate any URL on the internet.

## Project Structure

```
project-agua/
├── lexicons/           # AT Protocol lexicon schemas
│   └── at/margin/
│       ├── annotation.json
│       ├── bookmark.json
│       ├── collection.json
│       └── collectionItem.json
│       └── highlight.json
│       └── like.json
│       └── reply.json
├── backend/            # Go API server
│   ├── cmd/server/
│   └── internal/
├── web/                # React web app
│   └── src/
└── extension/          # Browser extension
    ├── popup/
    ├── content/
    └── background/
```

## Getting Started

### Backend

```bash
cd backend
go mod tidy
go run ./cmd/server
```

Server runs on http://localhost:8080

Server runs on http://localhost:8080

### Docker (Recommended)

Run the full stack (Backend + Postgres) with Docker:

```bash
docker-compose up -d --build
```

### Web App

```bash
cd web
npm install
npm run dev
```

App runs on http://localhost:3000

### Browser Extension

#### Chrome

1. Open Chrome → `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/` folder

#### Firefox

1. Open Firefox → `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select the `manifest.firefox.json` file in the `extension/` folder

## Domain

**Domain**: `margin.at`  
**Lexicon Namespace**: `at.margin.*`

## Tech Stack

- **Backend**: Go + Chi + SQLite / PostgreSQL
- **Frontend**: React 18 + Vite
- **Extension**: Manifest v3
- **Protocol**: AT Protocol (Bluesky)

## License

MIT
