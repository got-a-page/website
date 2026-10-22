const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const docs = fs.readFileSync(path.join(root, 'docs/index.html'), 'utf8');
const llms = fs.readFileSync(path.join(root, 'llms.txt'), 'utf8');

function structuredData(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(match => JSON.parse(match[1]));
}

test('homepage publishes Organization and WebSite structured data', () => {
  const graph = structuredData(home).flatMap(item => item['@graph'] || [item]);
  assert.ok(graph.some(item => item['@type'] === 'Organization' && item.url === 'https://got-a.page/'));
  assert.ok(graph.some(item => item['@type'] === 'WebSite' && item.url === 'https://got-a.page/'));
});

test('FAQ structured data matches the visible documentation FAQ', () => {
  const faq = structuredData(docs).find(item => item['@type'] === 'FAQPage');
  assert.ok(faq);
  assert.equal(faq.mainEntity.length, 7);
  const visibleText = docs.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '').replace(/<[^>]*>/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').replace(/\s+([.,:;!?])/g, '$1').trim();
  for (const item of faq.mainEntity) {
    assert.ok(visibleText.includes(item.name.replace(/\s+/g, ' ')), 'FAQ question not visible: ' + item.name);
    assert.ok(visibleText.includes(item.acceptedAnswer.text.replace(/\s+/g, ' ')), 'FAQ answer not visible: ' + item.name);
  }
});

test('llms.txt links to canonical pages and describes both modes', () => {
  for (const url of ['https://got-a.page/', 'https://got-a.page/docs', 'https://got-a.page/claim', 'https://github.com/got-a-page/claim']) {
    assert.ok(llms.includes(url), 'Missing canonical URL: ' + url);
  }
  assert.match(llms, /Instant mode/);
  assert.match(llms, /Point mode/);
  assert.match(llms, /DNS propagation and HTTPS certificate issuance/);
});
