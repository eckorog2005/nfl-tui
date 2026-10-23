import type { PlayByPlayEvent } from './types.js';

export interface PlayLine {
  time: string;
  team: string;
  text: string;
}

export function wrapText(text: string, width: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (width < 1 || words.length === 0) return [''];

  const lines: string[] = [];
  let current = '';
  for (let word of words) {
    while (word.length > width) {
      if (current) {
        lines.push(current);
        current = '';
      }
      lines.push(word.slice(0, width));
      word = word.slice(width);
    }
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= width) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Full names like "New England Patriots" overflow a narrow column; the nickname is enough to tell teams apart.
export function teamNickname(team?: string): string {
  if (!team) return '-';
  const words = team.trim().split(/\s+/);
  return words[words.length - 1] || '-';
}

export function quarterLabel(quarter: string): string {
  const period = Number(quarter);
  if (!period) return 'OTHER';
  if (period === 5) return 'OVERTIME';
  if (period > 5) return `OVERTIME ${period - 4}`;
  return `QUARTER ${period}`;
}

export function playQuarters(plays: PlayByPlayEvent[]): string[] {
  return [...new Set(plays.map((play) => play.quarter))];
}

export function buildPlayLines(plays: PlayByPlayEvent[], descriptionWidth: number): PlayLine[] {
  return plays.flatMap((play) => wrapText(play.description, descriptionWidth).map((text, index) => (index === 0
    ? { time: play.time, team: teamNickname(play.team), text }
    : { time: '', team: '', text })));
}
