# NFL TUI

A terminal user interface for viewing live NFL scores using TypeScript and Ink.

## Features

- View live NFL scores
- Navigate through games using arrow keys
- Select a game to see detailed field position and updates
- Automatic refresh for live data
- Visual field position indicator

## Installation

Requires Node.js 26 or later (see `.nvmrc`).

```bash
npm install
```

## Usage

### Development mode
```bash
npm run dev
```

### Build and run
```bash
npm run build
npm start
```

## Controls

- **↑/↓**: Navigate through games
- **Enter**: Select a game to view details
- **ESC**: Go back to game list
- **Ctrl+C**: Exit the application

## API

This application uses the ESPN API to fetch live NFL scores.

This uses ESPN's unofficial, undocumented public endpoints. It is not affiliated with or endorsed by ESPN or the NFL, and the API may change or stop working at any time.

## License

[MIT](LICENSE)
