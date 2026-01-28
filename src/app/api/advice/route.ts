// src/app/api/advice/route.ts

import { NextResponse } from "next/server";
import {
  calculateTaxes,
  TaxCalculationInputs,
  TaxResults,
} from "@/app/utils/taxCalculator";
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

// Ensure Node runtime (Gemini SDK needs Node APIs)
export const runtime = "nodejs";

// ---- Gemini setup ----
const apiKey = process.env.GEMINI_API_KEY;

const preferredModels = [
  "gemini-3-pro-preview",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash", // User requested
  "gemini-2.0-flash-exp",
  "gemini-1.5-flash", // Reliable fallback
  "gemini-1.5-pro",
];

if (!apiKey) {
  console.warn("⚠️ GEMINI_API_KEY not found in environment variables");
}

// ---- Helpers ----
const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const fmt = (n: number) => `₹${inr.format(Math.max(0, Math.round(n || 0)))}`;

const ageToLabel = (age: TaxCalculationInputs["age"]) =>
  age === "above80"
    ? "Above 80 years (Super Senior Citizen)"
    : age === "60to80"
      ? "60 to 80 years (Senior Citizen)"
      : "Below 60 years";

/** Human-readable summary of every input field */
function summarizeInputs(i: TaxCalculationInputs): string {
  return [
    `Age Group: ${ageToLabel(i.age)}`,
    `Gross Annual Salary: ${fmt(i.grossSalary)}`,
    `—`,
    `Old Regime Deduction Intent:`,
    `• Section 80C: ${fmt(i.deduction80c)} (cap ₹1.5L applies in logic)`,
    `• Section 80D (Medical Insurance): ${fmt(i.deduction80d)} (age-based cap)`,
    `• NPS 80CCD(1B): ${fmt(i.npsContribution)} (cap ₹50k)`,
    `• Home Loan Interest (Sec 24b): ${fmt(i.homeLoanInterest)} (cap ₹2L)`,
    `• Interest from Savings 80TTA/80TTB: ${fmt(i.deduction80tta)} (cap as per age)`,
    `—`,
    `HRA Details:`,
    `• Annual Basic Salary: ${fmt(i.basicSalary)}`,
    `• Total HRA Received Annually: ${fmt(i.hraReceived)}`,
    `• Total Rent Paid Annually: ${fmt(i.rentPaid)}`,
    `• Lives in Metro: ${i.livesInMetro ? "Yes" : "No"}`,
  ].join("\n");
}

// ---- Handlers ----

export async function GET() {
  // JSON response for direct browser hits, avoids HTML error pages
  return NextResponse.json({
    ok: true,
    message: "POST your inputs to this endpoint to get advice.",
    expects: {
      inputs: {
        age: "below60 | 60to80 | above80",
        grossSalary: "number",
        basicSalary: "number",
        hraReceived: "number",
        rentPaid: "number",
        livesInMetro: "boolean",
        deduction80c: "number",
        deduction80d: "number",
        deduction80tta: "number",
        homeLoanInterest: "number",
        npsContribution: "number",
      },
    },
  });
}

/**
 * POST /api/advice
 * Body: { inputs: TaxCalculationInputs }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inputs: TaxCalculationInputs = body?.inputs;

    if (!inputs || typeof inputs !== "object") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'inputs' payload." },
        { status: 400 }
      );
    }

    // 1) Calculate results with your core logic
    const results: TaxResults = calculateTaxes(inputs);

    // 2) Build a strong, structured prompt for Gemini
    const humanReadableInputs = summarizeInputs(inputs);
    const rawInputsJson = JSON.stringify(inputs, null, 2);

    const prompt = `
You are an AI Tax Advisor for Indian salaried users.
Follow these instructions strictly:
- Use ONLY the provided inputs, logic notes, and computed results.
- Do NOT recalculate slabs or invent additional exemptions/sections.
- Be concise, precise, and actionable. Use Indian rupee notation (₹12,34,567).

CONTEXT — USER INPUTS (authoritative):
${humanReadableInputs}

RAW INPUTS JSON (authoritative):
${rawInputsJson}

LOGIC NOTES (authoritative):
- Financial Year/Assessment Year: FY 2023-24 / AY 2024-25
- Computations and caps are already applied in the numeric results from backend logic.
- HRA, 80C (₹1.5L cap), 80D (age-based cap), NPS 80CCD(1B) (₹50k cap), Home Loan Interest 24(b) (₹2L cap), 80TTA/80TTB applied as per age and category.
- Old vs New regime comparison is already computed; do NOT recompute.

CALCULATED RESULTS (authoritative; do not change):
- Old Regime Tax: ${fmt(results.oldRegimeTax)}
- New Regime Tax: ${fmt(results.newRegimeTax)}
- Savings (lower vs higher): ${fmt(results.savings)}
- Recommended Regime: ${results.recommendedRegime.toUpperCase()}

Your tasks:
1) Justify the recommended regime:
   - Explain in 2-4 bullet points WHY this regime is financially better for the user, grounded in the provided numbers (deductions, HRA, slabs already reflected).
   - If the difference is marginal (e.g., < ₹10,000), mention that switching regimes may not materially matter.

2) Personalized tax-saving ideas (within the same FY rules):
   - Give 3-6 targeted, practical actions based on the user’s inputs (age, HRA, rent, metro, 80C/80D/NPS usage, home loan interest, savings interest).
   - Only suggest items that apply to the user’s situation; skip irrelevant sections.
   - Mention applicable limits briefly (e.g., “NPS 80CCD(1B) up to ₹50,000”).
   - If a section is already fully utilized per inputs, acknowledge it and avoid redundant advice.

3) Clear disclaimer:
   - Add a short disclaimer stating this is general guidance based on provided inputs and FY 2023-24 rules, and that final liability depends on complete financial data and official provisions.

Output format (exactly):
### Recommendation Rationale
- …

### Ways You Could Save More
- …

### Disclaimer
This guidance is based on the provided inputs and FY 2023-24 (AY 2024-25) rules. It is general information and not professional advice. Final tax liability depends on complete financial details, proofs, category, and official provisions. Please consult a qualified tax professional if needed.
`.trim();

    // 3) Call Gemini safely
    // 3) Call Gemini safely with fallback
    let advice = "No AI advice available (Gemini API key missing or all models failed).";
    let usedModelName = null;

    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);

      for (const name of preferredModels) {
        try {
          console.log(`🤖 Attempting to generate advice with model: ${name}`);
          const model = genAI.getGenerativeModel({ model: name });
          const response = await model.generateContent(prompt);

          advice = response.response.text();
          usedModelName = name;
          console.log(`✅ Success with model: ${name}`);
          break; // Stop loop on success
        } catch (err: unknown) {
          console.warn(`⚠️ Model ${name} failed:`, err instanceof Error ? err.message : String(err));
          // Continue to next model
        }
      }
    }

    // 4) Always return JSON (never HTML)
    return NextResponse.json({
      success: true,
      model: usedModelName || "none",
      inputs,
      results,
      advice,
    });
  } catch (error: unknown) {
    console.error("Error in /api/advice:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate advice",
      },
      { status: 500 }
    );
  }
}
