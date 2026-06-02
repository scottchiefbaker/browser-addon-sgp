const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { generateIdenticonHash } = require('../src/sgp-image.js');

function md5Hex(value) {
  return createHash('md5').update(value, 'utf8').digest('hex');
}

function generateExpectedHash(seed) {
  let hash = seed;
  for (let i = 0; i <= 4; i += 1) {
    hash = md5Hex(hash);
  }
  return hash;
}

test('identicon hash uses original five-round md5 behavior', () => {
  const seeds = [
    '',
    'test',
    'correct horse battery staple',
    'Γαζέες καὶ μυρτιὲς',
  ];

  seeds.forEach((seed) => {
    assert.equal(generateIdenticonHash(seed), generateExpectedHash(seed));
  });
});
