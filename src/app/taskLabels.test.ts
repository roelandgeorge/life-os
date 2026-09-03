import { describe, expect, it } from 'vitest';
import { getDomain } from '../core/domains';
import { MAX_LABEL_LENGTH, defaultTaskLabel, taskLabel, withTaskLabel } from './taskLabels';

const SLEEP = getDomain('SLEEP');

describe('withTaskLabel', () => {
  it('keeps a trailing space, so the next word can be typed', () => {
    // The regression this file exists for: trimming on every keystroke made
    // the space vanish as it was typed, and multi-word labels impossible.
    const afterFirstWord = withTaskLabel({}, 'SLEEP', 'Went ');
    expect(afterFirstWord.SLEEP).toBe('Went ');

    const afterSecond = withTaskLabel(afterFirstWord, 'SLEEP', 'Went to bed before 22:30');
    expect(afterSecond.SLEEP).toBe('Went to bed before 22:30');
  });

  it('drops the key when the field is cleared, so the default returns', () => {
    const set = withTaskLabel({}, 'SLEEP', 'Lights out by ten');
    expect(withTaskLabel(set, 'SLEEP', '').SLEEP).toBeUndefined();
  });

  it('caps the length rather than letting a label run off the row', () => {
    const long = 'x'.repeat(MAX_LABEL_LENGTH + 40);
    expect(withTaskLabel({}, 'SLEEP', long).SLEEP).toHaveLength(MAX_LABEL_LENGTH);
  });

  it('leaves the other domains alone', () => {
    const labels = withTaskLabel({ FOOD: 'Ate well' }, 'SLEEP', 'Slept');
    expect(labels.FOOD).toBe('Ate well');
  });
});

describe('taskLabel', () => {
  it('falls back to the default when unset', () => {
    expect(taskLabel(SLEEP, {})).toBe(defaultTaskLabel(SLEEP));
    expect(taskLabel(SLEEP, undefined)).toBe(defaultTaskLabel(SLEEP));
  });

  it('falls back when the stored label is only whitespace', () => {
    expect(taskLabel(SLEEP, { SLEEP: '   ' })).toBe(defaultTaskLabel(SLEEP));
  });

  it('trims for display, so a half-typed label still reads cleanly', () => {
    expect(taskLabel(SLEEP, { SLEEP: 'Went to bed early  ' })).toBe('Went to bed early');
  });
});
