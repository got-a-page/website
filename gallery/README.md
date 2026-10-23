# Wall of Pages gallery

A gallery of pages claimed on [got-a.page](https://got-a.page) that have opted in
to the showcase. Each card shows the page's name, title, tagline and theme
colour, and links to the live page.

## How it works

`build.cjs` reads the published index
(`https://got-a-page.github.io/claim/index.json`) **at build time** and writes
one static card into `index.html` for every page with `"showcase": true`, between
the `GALLERY:START` and `GALLERY:END` markers. The page itself has no
JavaScript and makes no requests when opened. Styling is plain CSS in
`style.css` and reuses the site's colour variables, so light and dark mode work.

## Update the gallery

Requires Node.js 18 or newer and no dependencies. From the repository root:

    node gallery/build.cjs

Then commit the updated `gallery/index.html`.

## Test

    node --test tests/gallery.test.cjs

## Preview locally

Open `gallery/index.html` in a browser.

## Notes

- Only pages with `"showcase": true` in the published index are shown.
- Cards are sorted alphabetically by page name.
- Supported themes: sunrise, forest, ember, slate, lagoon and plum. An unknown
  theme falls back to sunrise.
- Theme colours in `style.css` are approximate.