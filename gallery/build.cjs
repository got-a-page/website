
const fs = require("fs");
const path = require("path");

const INDEX_URL = "https://got-a-page.github.io/claim/index.json";
const FILE = path.join(__dirname, "index.html");

const START = "<!-- GALLERY:START -->";
const END = "<!-- GALLERY:END -->";

const THEMES = ["sunrise", "forest", "ember", "slate", "lagoon", "plum"];

function esc(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function makeCard(name, page = {}) {
  const theme = THEMES.includes(page.theme) ? page.theme : "sunrise";
  const tagline = page.tagline
    ? `<p class="tagline">${esc(page.tagline)}</p>`
    : "";

  return `
      <li>
        <a class="page-card" data-theme="${theme}" href="https://${name}.got-a.page">
          <span class="name">${name}.got-a.page</span>
          <h3>${esc(page.title || name)}</h3>
          ${tagline}
          <span class="theme"><span class="swatch"></span>${theme}</span>
        </a>
      </li>`;
}

// Names of pages that opted in with "showcase": true (valid subdomains only).
function showcased(index) {
  const pages = (index && index.pages) || {};
  return Object.keys(pages)
    .filter(name => pages[name] && pages[name].showcase === true)
    .filter(name => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(name))
    .sort();
}

function render(html, index) {
  const names = showcased(index);
  const cards = names.length
    ? names.map(name => makeCard(name, index.pages[name])).join("")
    : '\n      <li class="empty">No showcased pages yet. Yours could be first!</li>';

  const start = html.indexOf(START);
  const end = html.indexOf(END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error("GALLERY markers not found in index.html");
  }

  return {
    html: html.slice(0, start + START.length) + cards + "\n      " + html.slice(end),
    count: names.length
  };
}

async function main() {
  const response = await fetch(INDEX_URL);
  if (!response.ok) {
    throw new Error("Could not fetch index.json (HTTP " + response.status + ")");
  }
  const index = await response.json();
  const result = render(fs.readFileSync(FILE, "utf8"), index);
  fs.writeFileSync(FILE, result.html);
  console.log("Done:", result.count, "card(s)");
}

if (require.main === module) {
  main().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { render, showcased, makeCard };
