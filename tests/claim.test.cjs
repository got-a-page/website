const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../claim/index.html'), 'utf8');
function extractAppScript(page) {
  const match = page.match(/<script[^>]*\bid="claim-form"[^>]*>([\s\S]*?)<\/script>/);
  assert.ok(match, 'expected an inline script with id="claim-form"');
  return match[1];
}
const script = extractAppScript(html);
function setup() {
  const nodes = {};
  const document = { getElementById(id) { return nodes[id] ||= {
    value: '', hidden: true, checked: false, textContent: '',
    addEventListener(type, fn) { this[type] = fn; }, scrollIntoView() {},
  }; } };
  vm.runInNewContext(script, { document, URLSearchParams, location: { search: '' } });
  for (const id of ['cname', 'gh', 'title', 'theme', 'tagline', 'links', 'about', 'showcase', 'hostKind', 'targetValue', 'purpose']) document.getElementById(id);
  nodes.cname.value = 'example-name'; nodes.gh.value = 'example-user';
  return { nodes, submit(mode) { nodes.mode.value = mode; nodes.claimForm.submit({ preventDefault() {} }); return JSON.parse(nodes.jsonOut.textContent); } };
}
test('point confirmation includes the exact domain and host instructions without changing the claim', () => {
  const app = setup(); app.nodes.hostKind.value = 'cname'; app.nodes.targetValue.value = 'example-user.github.io';
  const json = app.submit('point');
  assert.equal(json.records.CNAME, 'example-user.github.io');
  assert.equal(app.nodes.pointNextSteps.hidden, false);
  assert.equal(app.nodes.hostDomain.textContent, 'example-name.got-a.page');
  assert.match(html, /After your PR merges/);
  assert.match(html, /href="\/docs#hosts"/);
});
test('instant confirmation does not show point-only instructions, including after switching mode', () => {
  const app = setup(); app.submit('point');
  assert.equal(app.submit('instant').mode, 'instant');
  assert.equal(app.nodes.pointNextSteps.hidden, true);
});
test('an unrelated inline script does not change which code the tests run', () => {
  const script = extractAppScript('<script>window.analyticsLoaded = true;</script>\n' + html);
  assert.match(script, /document\.getElementById\("mode"\)/);
});
