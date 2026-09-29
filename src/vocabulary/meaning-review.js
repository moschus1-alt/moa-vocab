import {identity} from './model.js';

export function needsMeaningReview(senses = []) {
  return senses.length >= 10 || senses.some(s => String(s.meaning || '').length >= 500);
}

export function reviewSave(word, existing = [], editing = false, original = []) {
  const old = editing ? null : existing.find(w => identity(w) === identity(word));
  const combined = [...(old?.senses || [])];
  for (const sense of word.senses) {
    if (!combined.some(s => s.meaning === sense.meaning && s.pos === sense.pos)) combined.push(sense);
  }
  return { count: combined.length, required: needsMeaningReview(original) || needsMeaningReview(combined) };
}
