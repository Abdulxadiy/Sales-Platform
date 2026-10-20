import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateExpression, canUse } from '../src/utils/workspace.js';

test('calculator respects precedence, grouping, unary signs and decimal commas without executing code', () => {
  assert.equal(calculateExpression('125 000 × 3 + 5000'), 380000);
  assert.equal(calculateExpression('(10 + 5) * -2'), -30);
  assert.equal(calculateExpression('1,5 + .25'), 1.75);
  assert.equal(calculateExpression('10 / 4 / 2'), 1.25);
  assert.equal(calculateExpression('2 - -3'), 5);
  for (const expression of ['alert(1)', '1/0', '2(3)', '(2+3', '1+2)', '', '2**3', 'globalThis.process.exit()']) {
    assert.throws(() => calculateExpression(expression), undefined, expression);
  }
});

test('workspace quick actions use the selected tenant membership', () => {
  assert.equal(canUse(null, 'sales.add_sale'), false);
  assert.equal(canUse({ is_owner: true }, 'sales.add_sale'), true);
  assert.equal(canUse({ permissions: ['*'] }, 'sales.add_sale'), true);
  assert.equal(canUse({ permissions: ['sales.manage_counterparty'] }, 'sales.add_sale'), false);
  assert.equal(canUse({ permissions: ['sales.manage_counterparty'] }, 'catalog.add_product', 'sales.manage_counterparty'), true);
});
