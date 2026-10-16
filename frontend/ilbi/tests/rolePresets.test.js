import test from 'node:test';
import assert from 'node:assert/strict';
import { ROLE_PRESETS } from '../src/components/employees/rolePresets.js';

test('ROLE_PRESETS defines all standard roles with required properties', () => {
  assert.equal(ROLE_PRESETS.length, 8, 'There should be 8 role presets');
  const expectedKeys = [
    'kassir',
    'katta_kassir',
    'omborchi',
    'bosh_omborchi',
    'menejer',
    'buxgalter',
    'operator',
    'administrator',
  ];

  for (const key of expectedKeys) {
    const preset = ROLE_PRESETS.find((p) => p.key === key);
    assert.ok(preset, `Preset ${key} should exist`);
    assert.ok(preset.label, `Preset ${key} should have a label`);
    assert.ok(preset.description, `Preset ${key} should have a description`);
    assert.ok(Array.isArray(preset.permissions) && preset.permissions.length > 0, `Preset ${key} should have permissions`);
  }
});

test('menejer preset includes management permissions', () => {
  const menejer = ROLE_PRESETS.find((p) => p.key === 'menejer');
  assert.equal(menejer.label, 'Menejer');
  assert.ok(menejer.permissions.includes('view_dashboard'));
  assert.ok(menejer.permissions.includes('view_reports'));
  assert.ok(menejer.permissions.includes('void_sale'));
  assert.ok(menejer.permissions.includes('manage_counterparty'));
});

test('administrator preset includes all 25 permissions', () => {
  const admin = ROLE_PRESETS.find((p) => p.key === 'administrator');
  assert.equal(admin.label, 'Administrator');
  assert.equal(admin.permissions.length, 25);
});
