const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'manifest.json'), 'utf8'));

test('manifest icons reference committed icon assets', () => {
  const expectedIcons = {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    64: 'icons/icon-64.png',
    96: 'icons/icon-96.png',
    128: 'icons/icon-128.png',
  };

  assert.deepEqual(manifest.icons, expectedIcons);
  assert.deepEqual(manifest.action.default_icon, {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
  });

  Object.values(expectedIcons).forEach((iconPath) => {
    assert.ok(fs.existsSync(path.join(repoRoot, iconPath)), `${iconPath} should exist`);
  });
});

test('release workflow packages only extension runtime files', () => {
  const workflowPath = path.join(repoRoot, '.github', 'workflows', 'release-zip.yml');
  const workflow = fs.readFileSync(workflowPath, 'utf8');

  assert.match(workflow, /name: Release extension zip/);
  assert.match(workflow, /branches:\s*\n\s*-\s*main/);
  assert.match(workflow, /tags:\s*\n\s*-\s*'v\*'\s*\n\s*-\s*'\*\.\*\.\*'/);
  assert.match(workflow, /include = \['manifest\.json', 'popup', 'src'\]/);
  assert.match(workflow, /files\.extend\(sorted\(\(root \/ 'icons'\)\.glob\('\*\.png'\)\)\)/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
});
