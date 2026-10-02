import React from 'react';
import { render } from 'ink';
import { App } from './App.js';
import { isatty } from 'tty';

if (!isatty(0)) {
  console.error('Error: This application requires a terminal (TTY) to run.');
  console.error('Please run this in a proper terminal, not in an IDE or background process.');
  process.exit(1);
}

render(<App />);
