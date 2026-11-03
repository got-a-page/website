// Run with: node --test tests/checker.test.cjs (no dependencies).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
function extractAppScript(page) {
  const match = page.match(/<script[^>]*\bid="availability-checker"[^>]*>([\s\S]*?)<\/script>/);
  assert.ok(match, 'expected an inline script with id="availability-checker"');
  return match[1];
}
const script = extractAppScript(html);
function setup() {
  const nodes = Object.fromEntries(['checker', 'name', 'result', 'count', '.counter'].map(id => [id, {
    value: '', textContent: '', className: '',
    set innerHTML(value) { this.textContent = value; },
    append(...values) { this.textContent += values.map(v => typeof v === 'string' ? v : v.textContent).join(''); },
    addEventListener(type, callback) { this[type] = callback; },
  }]));
  const state = { fail: false, old: false, statsFail: false };
  vm.runInNewContext(script, {
    AbortSignal,
    document: { getElementById: id => nodes[id], querySelector: id => nodes[id], createElement: () => ({}) },
    fetch: async url => {
      if (url.includes('stats.json')) return { ok: !state.statsFail, json: async () => ({ totalPages: 1 }) };
      if (state.fail) throw Error('Offline');
      return { ok: true, json: async () => state.old ? { pages: {} } : {
        availabilityVersion: 1, pages: { instant: {} }, claimed: ['dhanushnehru', 'instant'], reserved: ['www', 'google', 'casino'],
      } };
    },
  });
  return { nodes, state, async check(value) {
    nodes.name.value = value;
    await nodes.checker.submit({ preventDefault() {} });
    return nodes.result.textContent;
  } };
}
test('point and instant names taken, full domains normalized, reserved unavailable', async () => {
  const app = setup();
  for (const name of ['dhanushnehru', 'instant', ' DhanushNehru.got-a.page ']) assert.match(await app.check(name), /taken/);
  for (const name of ['www', 'google', 'casino']) assert.match(await app.check(name), /reserved/);
  assert.match(await app.check('new-unclaimed-name'), /is free/);
  assert.match(await app.check('a'), /2-40/);
  assert.equal(app.nodes.count.textContent, 1);
});
test('network failures and old data never imply availability; retry recovers', async () => {
  const app = setup();
  app.state.fail = true;
  assert.match(await app.check('dhanushnehru'), /could not be checked/);
  app.state.fail = false; app.state.old = true;
  assert.match(await app.check('dhanushnehru'), /could not be checked/);
  app.state.old = false;
  assert.match(await app.check('dhanushnehru'), /taken/);
});
test('an unrelated inline script does not change which code the tests run', () => {
  const shifted = extractAppScript('<script>window.analyticsLoaded = true;</script>\n' + html);
  assert.match(shifted, /const INDEX_URL/);
});
