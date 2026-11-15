/**
 * Immediate donation amount validation utility for the Micro Donation Platform.
 * Rules:
 *  - Minimum donation amount: ₹1.
 *  - Maximum donation amount: ₹500.
 *  - Empty input (or whitespace): invalid for donation submission, but shows NO misleading error while typing.
 *  - Below ₹1 (e.g. 0, negative): 'Minimum donation amount is ₹1.'
 *  - Above ₹500 (e.g. 501, 1000): 'Maximum donation amount is ₹500.'
 *  - Valid amount (1 to 500): valid, error is ''
 */

export function validateDonationAmount(rawInput) {
  if (rawInput === '' || rawInput === null || rawInput === undefined || String(rawInput).trim() === '') {
    return {
      isValid: false,
      error: '',
      isSubmittable: false,
      numericAmount: null,
    };
  }

  const num = Number(rawInput);

  if (isNaN(num)) {
    return {
      isValid: false,
      error: 'Please enter a valid donation amount.',
      isSubmittable: false,
      numericAmount: null,
    };
  }

  if (num < 1) {
    return {
      isValid: false,
      error: 'Minimum donation amount is ₹1.',
      isSubmittable: false,
      numericAmount: num,
    };
  }

  if (num > 500) {
    return {
      isValid: false,
      error: 'Maximum donation amount is ₹500.',
      isSubmittable: false,
      numericAmount: num,
    };
  }

  return {
    isValid: true,
    error: '',
    isSubmittable: true,
    numericAmount: num,
  };
}

