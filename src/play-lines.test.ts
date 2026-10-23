import { describe, it, expect } from 'vitest';
import { buildPlayLines, playQuarters, quarterLabel, teamNickname, wrapText } from './play-lines.js';

describe('wrapText', () => {
  it('wraps on word boundaries within the width', () => {
    expect(wrapText('D.Maye pass short middle to H.Henry', 15)).toEqual(['D.Maye pass', 'short middle to', 'H.Henry']);
  });

  it('hard-splits words longer than the width', () => {
    expect(wrapText('abcdefghij xy', 4)).toEqual(['abcd', 'efgh', 'ij', 'xy']);
  });

  it('collapses whitespace and returns one empty line for blank text', () => {
    expect(wrapText('  a   b  ', 10)).toEqual(['a b']);
    expect(wrapText('', 10)).toEqual(['']);
  });
});

describe('teamNickname', () => {
  it('keeps the last word of the team name', () => {
    expect(teamNickname('New England Patriots')).toBe('Patriots');
    expect(teamNickname(undefined)).toBe('-');
  });
});

describe('playQuarters', () => {
  it('lists each quarter once in play order', () => {
    expect(playQuarters([
      { quarter: '1', time: '', description: '' },
      { quarter: '1', time: '', description: '' },
      { quarter: '2', time: '', description: '' },
      { quarter: '5', time: '', description: '' }
    ])).toEqual(['1', '2', '5']);
  });
});

describe('quarterLabel', () => {
  it('names regular quarters and overtime periods', () => {
    expect(quarterLabel('3')).toBe('QUARTER 3');
    expect(quarterLabel('5')).toBe('OVERTIME');
    expect(quarterLabel('6')).toBe('OVERTIME 2');
  });
});

describe('buildPlayLines', () => {
  it('only labels the first wrapped line of each play', () => {
    const lines = buildPlayLines([
      { quarter: '1', time: '15:00', team: 'Chicago Bears', description: 'Kickoff to the end zone' },
      { quarter: '1', time: '9:12', team: 'New England Patriots', description: 'Punt' }
    ], 12);

    expect(lines).toEqual([
      { time: '15:00', team: 'Bears', text: 'Kickoff to' },
      { time: '', team: '', text: 'the end zone' },
      { time: '9:12', team: 'Patriots', text: 'Punt' }
    ]);
  });
});
