const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const acorn = require('acorn');

const root = path.resolve(__dirname, '../pack/kubejs');
const cleanTree = value => {
  if (Array.isArray(value)) return value.map(cleanTree);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => key !== 'start' && key !== 'end')
      .map(([key, child]) => [key, cleanTree(child)]));
  }
  return value;
};

for (const folder of ['startup_scripts', 'client_scripts', 'server_scripts']) {
  for (const name of fs.readdirSync(path.join(root, folder)).filter(name => name.endsWith('.js'))) {
    const file = path.join(root, folder, name);
    const before = fs.readFileSync(file, 'utf8');
    const comments = [];
    const syntax = acorn.parse(before, { ecmaVersion: 2022, onComment: comments });
    let after = before;
    for (const comment of comments.reverse()) {
      if (/@license|copyright|SPDX-License-Identifier/i.test(comment.value)) continue;
      const replacement = after.slice(comment.start, comment.end).replace(/[^\r\n]/g, ' ');
      after = after.slice(0, comment.start) + replacement + after.slice(comment.end);
    }
    after = after.replace(/[ \t]+$/gm, '').replace(/(?:\r?\n){3,}/g, '\n\n').trim() + '\n';
    assert.deepEqual(cleanTree(acorn.parse(after, { ecmaVersion: 2022 })), cleanTree(syntax), file);
    if (before !== after) fs.writeFileSync(file, after);
  }
}
console.log('Gameplay source formatted; syntax trees preserved.');
