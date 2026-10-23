// Run with: node --test tests/gallery.test.cjs (no dependencies).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { render, showcased, makeCard } = require("../gallery/build.cjs");

const MARKED = "<ul><!-- GALLERY:START --><!-- GALLERY:END --></ul>";
const index = {
  pages: {
    wolfiku: { title: "Wolfiku", tagline: "Builder", theme: "plum", showcase: true },
    anubhav: { title: "Notes", tagline: null, theme: "forest", showcase: true },
    dani: { title: "Dani", theme: "ember", showcase: false },
    "Bad_Name": { title: "Bad", theme: "plum", showcase: true }
  }
};

test("showcased keeps only opted-in, valid names, sorted", () => {
  assert.deepEqual(showcased(index), ["anubhav", "wolfiku"]);
  assert.deepEqual(showcased({}), []);
});

test("render makes a card with title, tagline and theme, linked to the live page", () => {
  const { html, count } = render(MARKED, index);
  assert.equal(count, 2);
  assert.match(html, /href="https:\/\/wolfiku\.got-a\.page"/);
  assert.match(html, /<h3>Wolfiku<\/h3>/);
  assert.match(html, /data-theme="plum"/);
  assert.match(html, /class="tagline">Builder</);
  assert.doesNotMatch(html, /dani\.got-a\.page|Bad_Name/);
});

test("a null tagline is skipped", () => {
  assert.equal(render(MARKED, index).html.match(/class="tagline"/g).length, 1);
});

test("makeCard escapes titles and taglines", () => {
  const card = makeCard("example", { title: '<script>x</script>', tagline: "A & B", theme: "forest" });
  assert.ok(card.includes("&lt;script&gt;") && card.includes("A &amp; B"));
  assert.ok(!card.includes("<script>"));
});

test("unknown theme falls back to sunrise", () => {
  assert.match(makeCard("example", { theme: "nope" }), /data-theme="sunrise"/);
});

test("render rejects missing markers and shows an empty state", () => {
  assert.throws(() => render("<ul></ul>", index), /GALLERY markers not found/);
  assert.match(render(MARKED, { pages: {} }).html, /No showcased pages yet/);
});

test("running render twice gives the same result", () => {
  const once = render(MARKED, index).html;
  assert.equal(render(once, index).html, once);
});
