// src/utils/taxCalculator.ts

/**
 * Indian Income Tax Calculator Utilities
 *
 * Assumptions / Scope:
 * - Financial Year (FY) 2023–24 / Assessment Year (AY) 2024–25.
 * - Salary income focused. Special-rate incomes (e.g., capital gains) are NOT modeled.
 * - Standard deduction of ₹50,000 is applied for salaried individuals in BOTH regimes.
 * - Old Regime allows common deductions (80C, 80D, 80TTA/80TTB, 80CCD(1B), Sec 24(b) interest) + HRA.
 * - New Regime allows ONLY the standard deduction. Section 87A rebate considered.
 * - Section 87A rebate:
 *    • Old Regime: taxable income ≤ ₹5,00,000 ⇒ income-tax becomes ₹0.
 *    • New Regime: taxable income ≤ ₹7,00,000 ⇒ income-tax becomes ₹0 (and marginal relief applied near the threshold).
 * - Surcharge added for higher incomes (basic implementation; marginal relief on surcharge not implemented).
 * - 4% Health & Education Cess is added on (tax + surcharge).
 */

export interface TaxCalculationInputs {
  grossSalary: number;
  basicSalary: number;
  hraReceived: number;
  rentPaid: number;
  livesInMetro: boolean;
  deduction80c: number;
  deduction80d: number;
  deduction80tta: number;
  homeLoanInterest: number;
  npsContribution: number;
  age: 'below60' | '60to80' | 'above80';
}

export interface TaxResults {
  oldRegimeTax: number;
  newRegimeTax: number;
  savings: number;
  recommendedRegime: 'old' | 'new';
}

// -----------------------------
// Constants (FY 2023–24 / AY 2024–25)
// -----------------------------

const STANDARD_DEDUCTION = 50_000;

const OLD_EXEMPTION_BELOW60 = 250_000;
const OLD_EXEMPTION_60TO80 = 300_000;
const OLD_EXEMPTION_ABOVE80 = 500_000;

const OLD_SLAB2_LIMIT = 500_000;
const OLD_SLAB3_LIMIT = 1_000_000;

const NEW_SLAB1_LIMIT = 300_000;
const NEW_SLAB2_LIMIT = 600_000;
const NEW_SLAB3_LIMIT = 900_000;
const NEW_SLAB4_LIMIT = 1_200_000;
const NEW_SLAB5_LIMIT = 1_500_000;

const REBATE_87A_OLD_THRESHOLD = 500_000;
const REBATE_87A_NEW_THRESHOLD = 700_000;

const CAP_80C = 150_000;
const CAP_80D_BELOW60 = 25_000;
const CAP_80D_SENIOR = 50_000;
const CAP_80TTA = 10_000;
const CAP_80TTB = 50_000;
const CAP_HOME_LOAN_INTEREST = 200_000;
const CAP_NPS_80CCD_1B = 50_000;

type Regime = 'old' | 'new';
function getSurchargeRate(totalIncome: number, regime: Regime): number {
  if (totalIncome <= 5_000_000) return 0;
  if (totalIncome <= 10_000_000) return 0.10;
  if (totalIncome <= 20_000_000) return 0.15;
  if (totalIncome <= 50_000_000) return 0.25;
  return regime === 'new' ? 0.25 : 0.37;
}

const CESS_RATE = 0.04;

// -----------------------------
// HRA Exemption
// -----------------------------

export function calculateHraExemption(
  basicSalary: number,
  hraReceived: number,
  rentPaid: number,
  livesInMetro: boolean
): number {
  const actualHra = Math.max(0, hraReceived || 0);
  const pctOfSalary = (livesInMetro ? 0.5 : 0.4) * Math.max(0, basicSalary || 0);
  const excessRent = Math.max(0, (rentPaid || 0) - 0.1 * Math.max(0, basicSalary || 0));
  const exemption = Math.min(actualHra, pctOfSalary, excessRent);
  return Math.max(0, exemption);
}

// -----------------------------
// Old Regime Tax
// -----------------------------

function getOldRegimeBasicExemption(age: TaxCalculationInputs['age']): number {
  if (age === 'above80') return OLD_EXEMPTION_ABOVE80;
  if (age === '60to80') return OLD_EXEMPTION_60TO80;
  return OLD_EXEMPTION_BELOW60;
}

function calculateOldRegimeSlabTax(taxableIncome: number, age: TaxCalculationInputs['age']): number {
  if (taxableIncome <= REBATE_87A_OLD_THRESHOLD) return 0;

  const basicExemption = getOldRegimeBasicExemption(age);
  let tax = 0;

  if (taxableIncome > basicExemption) {
    const amount = Math.min(taxableIncome, OLD_SLAB2_LIMIT) - basicExemption;
    tax += Math.max(0, amount) * 0.05;
  }

  if (taxableIncome > OLD_SLAB2_LIMIT) {
    const amount = Math.min(taxableIncome, OLD_SLAB3_LIMIT) - OLD_SLAB2_LIMIT;
    tax += Math.max(0, amount) * 0.20;
  }

  if (taxableIncome > OLD_SLAB3_LIMIT) {
    const amount = taxableIncome - OLD_SLAB3_LIMIT;
    tax += Math.max(0, amount) * 0.30;
  }

  return tax;
}

export function calculateOldRegimeTax(inputs: TaxCalculationInputs): number {
  const {
    grossSalary,
    basicSalary,
    hraReceived,
    rentPaid,
    livesInMetro,
    deduction80c,
    deduction80d,
    deduction80tta,
    homeLoanInterest,
    npsContribution,
    age,
  } = inputs;

  const standardDeduction = STANDARD_DEDUCTION;
  const hraExemption = calculateHraExemption(basicSalary, hraReceived, rentPaid, livesInMetro);

  const capped80c = Math.min(Math.max(0, deduction80c || 0), CAP_80C);
  const capped80d =
    age === 'below60'
      ? Math.min(Math.max(0, deduction80d || 0), CAP_80D_BELOW60)
      : Math.min(Math.max(0, deduction80d || 0), CAP_80D_SENIOR);

  const cappedSavingsInterest =
    age === 'below60'
      ? Math.min(Math.max(0, deduction80tta || 0), CAP_80TTA)
      : Math.min(Math.max(0, deduction80tta || 0), CAP_80TTB);

  const cappedHomeLoan = Math.min(Math.max(0, homeLoanInterest || 0), CAP_HOME_LOAN_INTEREST);
  const cappedNps = Math.min(Math.max(0, npsContribution || 0), CAP_NPS_80CCD_1B);

  const totalDeductions =
    standardDeduction +
    hraExemption +
    capped80c +
    capped80d +
    cappedSavingsInterest +
    cappedHomeLoan +
    cappedNps;

  const taxableIncome = Math.max(0, (grossSalary || 0) - totalDeductions);

  const incomeTax = calculateOldRegimeSlabTax(taxableIncome, age);

  const surchargeRate = getSurchargeRate(taxableIncome, 'old');
  const surcharge = incomeTax * surchargeRate;

  const cess = (incomeTax + surcharge) * CESS_RATE;

  const finalTax = Math.round(incomeTax + surcharge + cess);
  return finalTax;
}

// -----------------------------
// New Regime Tax
// -----------------------------

function calculateNewRegimeSlabTax(taxableIncome: number): number {
  if (taxableIncome <= REBATE_87A_NEW_THRESHOLD) return 0;

  let tax = 0;

  if (taxableIncome > NEW_SLAB1_LIMIT) {
    const amt = Math.min(taxableIncome, NEW_SLAB2_LIMIT) - NEW_SLAB1_LIMIT;
    tax += Math.max(0, amt) * 0.05;
  }

  if (taxableIncome > NEW_SLAB2_LIMIT) {
    const amt = Math.min(taxableIncome, NEW_SLAB3_LIMIT) - NEW_SLAB2_LIMIT;
    tax += Math.max(0, amt) * 0.10;
  }

  if (taxableIncome > NEW_SLAB3_LIMIT) {
    const amt = Math.min(taxableIncome, NEW_SLAB4_LIMIT) - NEW_SLAB3_LIMIT;
    tax += Math.max(0, amt) * 0.15;
  }

  if (taxableIncome > NEW_SLAB4_LIMIT) {
    const amt = Math.min(taxableIncome, NEW_SLAB5_LIMIT) - NEW_SLAB4_LIMIT;
    tax += Math.max(0, amt) * 0.20;
  }

  if (taxableIncome > NEW_SLAB5_LIMIT) {
    const amt = taxableIncome - NEW_SLAB5_LIMIT;
    tax += Math.max(0, amt) * 0.30;
  }

  return tax;
}

function applyNewRegimeMarginalRelief(taxableIncome: number, computedTax: number): number {
  if (taxableIncome <= REBATE_87A_NEW_THRESHOLD) return 0;

  const excess = taxableIncome - REBATE_87A_NEW_THRESHOLD;
  return computedTax > excess ? excess : computedTax;
}

export function calculateNewRegimeTax(inputs: TaxCalculationInputs): number {
  const { grossSalary } = inputs;

  const taxableIncome = Math.max(0, (grossSalary || 0) - STANDARD_DEDUCTION);

  const slabTax = calculateNewRegimeSlabTax(taxableIncome);

  const taxAfterRelief = applyNewRegimeMarginalRelief(taxableIncome, slabTax);

  const surchargeRate = getSurchargeRate(taxableIncome, 'new');
  const surcharge = taxAfterRelief * surchargeRate;

  const cess = (taxAfterRelief + surcharge) * CESS_RATE;

  const finalTax = Math.round(taxAfterRelief + surcharge + cess);
  return finalTax;
}

// -----------------------------
// Main
// -----------------------------

export function calculateTaxes(inputs: TaxCalculationInputs): TaxResults {
  const oldRegimeTax = calculateOldRegimeTax(inputs);
  const newRegimeTax = calculateNewRegimeTax(inputs);

  const savings = Math.abs(oldRegimeTax - newRegimeTax);
  const recommendedRegime: 'old' | 'new' = oldRegimeTax < newRegimeTax ? 'old' : 'new';

  return {
    oldRegimeTax,
    newRegimeTax,
    savings,
    recommendedRegime,
  };
}
