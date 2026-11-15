import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDonationAmount } from '../src/utils/donationValidation.js';

test('Immediate Donation Amount Validation (Frontend)', async (t) => {
  await t.test('Case 1: ₹0 entered immediately returns below-minimum error and disables submission', () => {
    const res = validateDonationAmount(0);
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.isSubmittable, false);
    assert.strictEqual(res.error, 'Minimum donation amount is ₹1.');
  });

  await t.test('Case 2: "0" string entered immediately returns below-minimum error and disables submission', () => {
    const res = validateDonationAmount('0');
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.isSubmittable, false);
    assert.strictEqual(res.error, 'Minimum donation amount is ₹1.');
  });

  await t.test('Case 3: Negative amount entered immediately returns below-minimum error', () => {
    const res = validateDonationAmount(-5);
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.isSubmittable, false);
    assert.strictEqual(res.error, 'Minimum donation amount is ₹1.');
  });

  await t.test('Case 4: ₹1 minimum valid boundary amount is accepted and submittable', () => {
    const res = validateDonationAmount(1);
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.isSubmittable, true);
    assert.strictEqual(res.error, '');
    assert.strictEqual(res.numericAmount, 1);
  });

  await t.test('Case 5: "1" string boundary amount is accepted and submittable', () => {
    const res = validateDonationAmount('1');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.isSubmittable, true);
    assert.strictEqual(res.error, '');
    assert.strictEqual(res.numericAmount, 1);
  });

  await t.test('Case 6: ₹500 maximum valid boundary amount is accepted and submittable', () => {
    const res = validateDonationAmount(500);
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.isSubmittable, true);
    assert.strictEqual(res.error, '');
    assert.strictEqual(res.numericAmount, 500);
  });

  await t.test('Case 7: "500" string boundary amount is accepted and submittable', () => {
    const res = validateDonationAmount('500');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.isSubmittable, true);
    assert.strictEqual(res.error, '');
    assert.strictEqual(res.numericAmount, 500);
  });

  await t.test('Case 8: ₹501 above-maximum amount immediately returns above-maximum error', () => {
    const res = validateDonationAmount(501);
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.isSubmittable, false);
    assert.strictEqual(res.error, 'Maximum donation amount is ₹500.');
  });

  await t.test('Case 9: "501" string above-maximum amount immediately returns above-maximum error', () => {
    const res = validateDonationAmount('501');
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.isSubmittable, false);
    assert.strictEqual(res.error, 'Maximum donation amount is ₹500.');
  });

  await t.test('Case 10: Empty string input is not submittable but shows no misleading error while typing', () => {
    const res = validateDonationAmount('');
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.isSubmittable, false);
    assert.strictEqual(res.error, '');
  });

  await t.test('Case 11: Whitespace-only input shows no misleading error while typing', () => {
    const res = validateDonationAmount('   ');
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.isSubmittable, false);
    assert.strictEqual(res.error, '');
  });

  await t.test('Case 12: null and undefined inputs are handled gracefully without error message', () => {
    const res1 = validateDonationAmount(null);
    assert.strictEqual(res1.isValid, false);
    assert.strictEqual(res1.isSubmittable, false);
    assert.strictEqual(res1.error, '');

    const res2 = validateDonationAmount(undefined);
    assert.strictEqual(res2.isValid, false);
    assert.strictEqual(res2.isSubmittable, false);
    assert.strictEqual(res2.error, '');
  });

  await t.test('Case 13: Standard valid amounts (₹50, ₹100, ₹250) are valid and submittable', () => {
    for (const valid of [50, 100, 250]) {
      const res = validateDonationAmount(valid);
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.isSubmittable, true);
      assert.strictEqual(res.error, '');
      assert.strictEqual(res.numericAmount, valid);
    }
  });

  await t.test('Case 14: Non-numeric strings return a clear invalid amount message', () => {
    const res = validateDonationAmount('invalid_amount');
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.isSubmittable, false);
    assert.strictEqual(res.error, 'Please enter a valid donation amount.');
  });
});

