const assert = require('node:assert/strict');
global.window = {};
require('../service-assistant.js');
const { recommend } = window.MunjizServiceAssistant;
const cases = [
  ['document', 'language', undefined, 'proofreading'],
  ['document', 'format', 'report', 'report-format'],
  ['document', 'format', 'thesis', 'thesis-format'],
  ['document', 'references', undefined, 'references'],
  ['research', 'methodology', undefined, 'methodology'],
  ['research', 'statistics', undefined, 'statistics'],
  ['publication', 'journal', undefined, 'journal'],
  ['publication', 'promotion', undefined, 'promotion'],
  ['communication', 'presentation', undefined, 'presentation'],
  ['communication', 'training', undefined, 'training'],
];
for (const [goal, need, document, service] of cases) {
  assert.equal(recommend({ audience: 'all', goal, need, document }), service);
}
assert.equal(new Set(cases.map(item => item[3])).size, 10);
for (const invalid of [{}, { goal: 'research', need: 'journal' }, { goal: 'document', need: 'format' }]) {
  assert.throws(() => recommend(invalid));
}
console.log('PASS: all ten existing services mapped correctly; incomplete/incompatible choices rejected.');
