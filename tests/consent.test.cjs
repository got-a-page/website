// Run with: node --test tests/consent.test.cjs (no dependencies).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, '../consent.js'), 'utf8');

function makeNode(tag) {
  return {
    tag, children: [], attrs: {}, listeners: {}, style: {}, parentNode: null,
    textContent: '', innerHTML: '', className: '', id: '', type: '', async: false, src: '',
    setAttribute(name, value) { this.attrs[name] = value; },
    getAttribute(name) { return this.attrs[name] ?? null; },
    appendChild(child) { child.parentNode = this; this.children.push(child); return child; },
    removeChild(child) { this.children = this.children.filter(c => c !== child); child.parentNode = null; },
    addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
    click() { (this.listeners.click || []).forEach(fn => fn()); },
    closest(sel) { return this.attrs['data-cookie-settings'] !== undefined && sel === '[data-cookie-settings]' ? this : null; },
  };
}

function setup({ analytics = true, stored = null, cookies = '', storageThrows = false } = {}) {
  const jar = new Map();
  for (const pair of cookies.split(';').map(s => s.trim()).filter(Boolean)) {
    const [k, v] = pair.split('=');
    jar.set(k, v);
  }
  const head = makeNode('head');
  const body = makeNode('body');
  const docListeners = {};
  const meta = makeNode('meta');
  meta.setAttribute('name', 'gap:analytics');
  meta.setAttribute('content', 'true');
  const document = {
    readyState: 'complete',
    head, body,
    createElement: tag => makeNode(tag),
    getElementById(id) {
      const find = node => node.id === id ? node : node.children.map(find).find(Boolean) || null;
      return find(head) || find(body);
    },
    querySelector: sel => (sel === 'meta[name="gap:analytics"]' && analytics ? meta : null),
    addEventListener(type, fn) { (docListeners[type] = docListeners[type] || []).push(fn); },
  };
  Object.defineProperty(document, 'cookie', {
    get() { return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; '); },
    set(str) {
      const [pair, ...attrs] = str.split(';').map(s => s.trim());
      const [k, v] = pair.split('=');
      const expired = attrs.some(a => a.toLowerCase().startsWith('expires=thu, 01 jan 1970'));
      if (expired) jar.delete(k); else jar.set(k, v ?? '');
    },
  });
  const storage = new Map(stored ? [['gap-consent', stored]] : []);
  const localStorage = storageThrows
    ? { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } }
    : { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) };
  const context = {
    document,
    location: { hostname: 'got-a.page' },
    localStorage,
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(script, context);
  const banner = () => body.children.find(c => c.className === 'consent-banner') || null;
  const loader = () => head.children.find(c => c.id === 'gap-ga-loader') || null;
  const buttons = () => {
    const b = banner();
    if (!b) return {};
    const choices = b.children.find(c => c.className === 'consent-choices');
    return { reject: choices.children[0], accept: choices.children[1] };
  };
  const openSettings = () => {
    const link = makeNode('a');
    link.setAttribute('data-cookie-settings', '');
    const event = { target: link, prevented: false, preventDefault() { this.prevented = true; } };
    (docListeners.click || []).forEach(fn => fn(event));
    return event;
  };
  return { context, storage, jar, banner, loader, buttons, openSettings };
}

test('fresh visit: banner shown, analytics not loaded, no gtag defined', () => {
  const app = setup();
  assert.ok(app.banner(), 'banner should appear without a stored choice');
  assert.equal(app.loader(), null, 'gtag script must not be injected before consent');
  assert.equal(app.context.gtag, undefined, 'gtag must not exist before consent');
  assert.equal(app.context['ga-disable-G-65647ZF3ZZ'], undefined);
});

test('accept: remembers choice, loads GA, removes banner', () => {
  const app = setup();
  app.buttons().accept.click();
  assert.equal(app.storage.get('gap-consent'), 'accepted');
  assert.ok(app.loader(), 'gtag script should load after accept');
  assert.match(app.loader().src, /googletagmanager\.com\/gtag\/js\?id=G-65647ZF3ZZ/);
  assert.equal(typeof app.context.gtag, 'function');
  assert.equal(app.banner(), null);
});

test('reject: remembers choice, keeps analytics off, removes banner', () => {
  const app = setup();
  app.buttons().reject.click();
  assert.equal(app.storage.get('gap-consent'), 'rejected');
  assert.equal(app.loader(), null, 'gtag must not load after reject');
  assert.equal(app.context.gtag, undefined);
  assert.equal(app.banner(), null);
});

test('persisted accept: no banner, analytics loads on the next visit', () => {
  const app = setup({ stored: 'accepted' });
  assert.equal(app.banner(), null);
  assert.ok(app.loader(), 'stored accept should load GA without a banner');
});

test('persisted reject: no banner, analytics stays off and disabled', () => {
  const app = setup({ stored: 'rejected' });
  assert.equal(app.banner(), null);
  assert.equal(app.loader(), null);
  assert.equal(app.context['ga-disable-G-65647ZF3ZZ'], true);
});

test('withdrawal via cookie settings: reopens banner, reject stops collection and clears cookies', () => {
  const app = setup({ stored: 'accepted', cookies: '_ga=abc; _ga_65647ZF3ZZ=def; other=keep' });
  assert.ok(app.loader(), 'previously accepted visit loads GA');
  const event = app.openSettings();
  assert.equal(event.prevented, true, 'settings link should not navigate');
  assert.ok(app.banner(), 'settings link reopens the banner');
  app.buttons().reject.click();
  assert.equal(app.storage.get('gap-consent'), 'rejected');
  assert.equal(app.context['ga-disable-G-65647ZF3ZZ'], true, 'further hits disabled in-session');
  assert.equal(app.jar.has('_ga'), false, 'analytics cookie removed');
  assert.equal(app.jar.has('_ga_65647ZF3ZZ'), false, 'GA4 container cookie removed');
  assert.equal(app.jar.get('other'), 'keep', 'unrelated cookies untouched');
});

test('page without analytics: accept never loads GA there', () => {
  const app = setup({ analytics: false });
  app.buttons().accept.click();
  assert.equal(app.storage.get('gap-consent'), 'accepted');
  assert.equal(app.loader(), null, 'no GA on pages without the analytics meta tag');
});

test('storage blocked: banner still shows, choices still work, nothing crashes', () => {
  const app = setup({ storageThrows: true });
  assert.ok(app.banner(), 'banner should appear when storage is unavailable');
  app.buttons().accept.click();
  assert.ok(app.loader(), 'accept still loads GA even if the choice cannot be stored');
  assert.equal(app.banner(), null);
});

test('repeated accept does not duplicate the gtag tag', () => {
  const app = setup();
  app.buttons().accept.click();
  app.openSettings();
  assert.ok(app.banner(), 'settings reopens after accept');
  app.buttons().accept.click();
  assert.equal(app.context.document.head.children.filter(c => c.id === 'gap-ga-loader').length, 1, 'exactly one gtag loader tag');
});
