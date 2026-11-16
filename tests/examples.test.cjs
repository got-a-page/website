const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const home = fs.readFileSync('index.html', 'utf8');
const gallery = fs.readFileSync('gallery/index.html', 'utf8');
const docs = fs.readFileSync('docs/index.html', 'utf8');
const {render} = require('../gallery/build.cjs');
const sample = JSON.parse(home.match(/<pre id="instant-example">([\s\S]*?)<\/pre>/)[1]);
test('complete homepage example uses supported Instant fields and stays opt-out', () => {
  assert.equal(sample.mode, 'instant');
  assert.equal(sample.showcase, false);
  assert.equal(sample.page.type, 'person');
  assert.equal(sample.page.theme, 'sunrise');
  assert.ok(sample.owner.github);
  assert.ok(sample.page.links.every(link => link.url.startsWith('https://')));
  assert.ok(sample.page.sections.every(section => section.heading && section.text));
  assert.equal(sample.page.about, undefined);
});
test('illustrative preview text matches its JSON, with no fake live claim', () => {
  const preview = home.match(/<figure class="example-preview">([\s\S]*?)<\/figure>/)[1];
  for(const text of [sample.page.title, sample.page.tagline, sample.page.links[0].label, sample.page.sections[0].heading, sample.page.sections[0].text]) {
    assert.ok(preview.includes(text));
  }
  assert.match(home, /illustrative example, not a claimed address/);
  assert.match(preview, /non-interactive example/);
  assert.doesNotMatch(preview, /href=/);
});
test('gallery context survives regeneration and opt-in rules still apply', () => {
  const updated = render(gallery, {pages:{hidden:{showcase:false}, public:{showcase:true,title:'Public'}}}).html;
  assert.ok(updated.includes('A few ways to make it yours'));
  assert.ok(updated.includes('not a directory of every claim'));
  const generated = updated.split('<!-- GALLERY:START -->')[1].split('<!-- GALLERY:END -->')[0];
  assert.doesNotMatch(generated, /hidden.got-a.page/);
  assert.match(generated, /public.got-a.page/);
});
test('docs link to the live gallery without the obsolete roadmap promise', () => {
  assert.doesNotMatch(docs, /gallery \(coming in Phase 2\)/);
  assert.match(docs, /href="\/gallery\/">Wall of Pages gallery/);
});
