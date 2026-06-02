const test = require('node:test');
const assert = require('node:assert/strict');
const { derivePassword, domainFromUrl } = require('../src/sgp-core.js');

const vectors = [
  ['w9UbG0NEk7', 'test', 'example.com'],
  ['vBKDNdjhhL6dBfgDSRxZxAAA', 'test', 'example.com', { length: 24 }],
  ['nCa5tyHdOQ', 'test', 'example.com', { hashRounds: 50 }],
  ['aRFG84Gim9', 'test', 'example.co.uk'],
  ['hSF8nTst4A', 'test', 'example.gov.ac'],
  ['ft8iv4t5sX', 'Γαζέες καὶ μυρτιὲς δὲν θὰ βρῶ πιὰ στὸ χρυσαφὶ ξέφωτο', 'example.com']
];

test('classic SGP generation compatibility vectors', () => {
  vectors.forEach(([expected, masterPassword, domain, options]) => {
    assert.equal(derivePassword(masterPassword, domain, options), expected);
  });
});

test('domain canonicalization keeps common ccTLD structures', () => {
  assert.equal(domainFromUrl('https://www.example.co.uk/login'), 'example.co.uk');
  assert.equal(domainFromUrl('https://foo.bar.example.com/login'), 'example.com');
  assert.equal(domainFromUrl('https://192.168.1.10/login'), '192.168.1.10');
});
