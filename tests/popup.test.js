const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const popupHtml = fs.readFileSync(path.join(__dirname, '..', 'popup', 'popup.html'), 'utf8');
const popupScript = fs.readFileSync(path.join(__dirname, '..', 'popup', 'popup.js'), 'utf8');

function createElement(id, initial = {}) {
  return {
    id,
    value: '',
    type: 'text',
    textContent: '',
    attributes: {},
    listeners: {},
    focus() {},
    select() {},
    setSelectionRange() {},
    addEventListener(eventName, handler) {
      this.listeners[eventName] = handler;
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    ...initial,
  };
}

function setupPopup() {
  const elements = {
    domain: createElement('domain'),
    master: createElement('master', { type: 'password' }),
    generated: createElement('generated', { type: 'password', readOnly: true }),
    'toggle-generated': createElement('toggle-generated', { textContent: 'Show' }),
    generate: createElement('generate'),
    copy: createElement('copy'),
    fill: createElement('fill'),
    status: createElement('status'),
  };

  let copiedText = '';
  let fillRequest = null;

  const context = {
    SGP: {
      derivePassword(masterPassword, domain) {
        return `${masterPassword}:${domain}`;
      },
      domainFromUrl() {
        return 'example.com';
      },
    },
    browser: {
      runtime: {
        lastError: null,
      },
      tabs: {
        query(_options, callback) {
          callback([{ id: 7, url: 'https://www.example.com/login' }]);
        },
        sendMessage(tabId, message, callback) {
          fillRequest = { tabId, message };
          callback({ filled: 1 });
        },
      },
    },
    document: {
      getElementById(id) {
        return elements[id];
      },
      execCommand() {
        return true;
      },
    },
    navigator: {
      clipboard: {
        async writeText(text) {
          copiedText = text;
        },
      },
    },
    console,
  };

  vm.runInNewContext(popupScript, context, { filename: 'popup.js' });

  return {
    elements,
    async settle() {
      await Promise.resolve();
      await Promise.resolve();
    },
    async click(id) {
      await elements[id].listeners.click({ preventDefault() {} });
    },
    async keydown(id, key) {
      await elements[id].listeners.keydown({ key, preventDefault() {} });
    },
    getCopiedText() {
      return copiedText;
    },
    getFillRequest() {
      return fillRequest;
    },
  };
}

test('popup markup hides the generated password and exposes a toggle control', () => {
  assert.match(popupHtml, /<input id="generated" type="password" readonly \/>/);
  assert.match(popupHtml, /<button id="toggle-generated" type="button"[^>]*>Show<\/button>/);
});

test('generated password stays hidden by default and can be toggled without regenerating', async () => {
  const popup = setupPopup();
  const { elements } = popup;

  await popup.settle();

  assert.equal(elements.generated.type, 'password');
  assert.equal(elements['toggle-generated'].textContent, 'Show');
  assert.equal(elements.domain.value, 'example.com');

  elements.master.value = 'master-secret';
  await popup.click('generate');

  assert.equal(elements.generated.value, 'master-secret:example.com');
  assert.equal(elements.generated.type, 'password');
  assert.equal(elements['toggle-generated'].textContent, 'Show');
  assert.equal(elements.status.textContent, 'Password generated locally.');

  await popup.click('toggle-generated');
  assert.equal(elements.generated.type, 'text');
  assert.equal(elements['toggle-generated'].textContent, 'Hide');
  assert.equal(elements.generated.value, 'master-secret:example.com');

  await popup.click('toggle-generated');
  assert.equal(elements.generated.type, 'password');
  assert.equal(elements['toggle-generated'].textContent, 'Show');

  await popup.click('copy');
  assert.equal(popup.getCopiedText(), 'master-secret:example.com');
  assert.equal(elements.status.textContent, 'Copied to clipboard.');

  await popup.click('fill');
  assert.equal(popup.getFillRequest().tabId, 7);
  assert.equal(popup.getFillRequest().message.type, 'FILL_PASSWORD');
  assert.equal(popup.getFillRequest().message.password, 'master-secret:example.com');
  assert.equal(elements.status.textContent, 'Filled 1 password field(s).');

  await popup.keydown('master', 'Enter');
  assert.equal(elements.generated.type, 'password');
  assert.equal(elements['toggle-generated'].textContent, 'Show');
});
