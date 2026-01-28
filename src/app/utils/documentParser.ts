// src/app/utils/documentParser.ts
/**
 * Utility functions for Form 16 document parsing
 */

export interface ParsedForm16Data {
    grossSalary: number | null;
    basicSalary: number | null;
    hraReceived: number | null;
    rentPaid: number | null;
    deduction80c: number | null;
    deduction80d: number | null;
    npsContribution: number | null;
    homeLoanInterest: number | null;
    deduction80tta: number | null;
    totalTaxDeducted: number | null;
    employerName: string | null;
    employeeName: string | null;
    pan: string | null;
    financialYear: string | null;
}

// Allowed file types for upload
export const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
];

// Maximum file size: 10MB
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Validates the uploaded file type and size
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: `Invalid file type: ${file.type}. Allowed: PDF, JPG, PNG, WebP`,
        };
    }

    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum: 10MB`,
        };
    }

    return { valid: true };
}

/**
 * Converts a File to base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // Remove the data URL prefix (e.g., "data:image/png;base64,")
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

/**
 * Gets the MIME type for Gemini API
 */
export function getMimeType(file: File): string {
    // Map common types to Gemini-compatible MIME types
    const mimeMap: Record<string, string> = {
        'application/pdf': 'application/pdf',
        'image/jpeg': 'image/jpeg',
        'image/jpg': 'image/jpeg',
        'image/png': 'image/png',
        'image/webp': 'image/webp',
    };
    return mimeMap[file.type] || file.type;
}

/**
 * Gemini prompt for extracting Form 16 data
 * This prompt is carefully crafted to extract accurate values from Indian Form 16
 */
/**
 * Gemini prompt for extracting Form 16 data
 * This prompt is carefully crafted to extract accurate values from Indian Form 16
 * It uses "Chain of Verification" by asking for evidence (text found near the value).
 */
export const FORM16_EXTRACTION_PROMPT = `
You are an expert Form 16 (Indian income tax) document parser. 
Analyze this Form 16 document image/PDF and extract the following financial data.

CRITICAL INSTRUCTIONS:
1. You must return a valid JSON object.
2. For every field, you must provide:
   - "value": The extracted number (or string for names/PAN).
   - "evidence": The exact text verification found near the value on the document.
3. All monetary "value" fields must be NUMBERS ONLY (no commas, no ₹).
4. If a field is not found, set "value" to null.

FIELDS TO EXTRACT:
{
  "grossSalary": {
    "value": <number>,
    "evidence": <string - Look for "Gross Salary", "Gross Total Income", or "Section 17(1)". Value is usually in the outer column.>
  },
  "basicSalary": {
    "value": <number>,
    "evidence": <string - Look for "Basic Salary", "Basic/DA". If not found, look for "Section 10" exemptions that might hint at it.>
  },
  "hraReceived": {
    "value": <number>,
    "evidence": <string - Look for "House Rent Allowance", "HRA", or "Section 10(13A)">
  },
  "rentPaid": {
    "value": <number|null>,
    "evidence": <string - usually not in Form 16, set null unless explicitly visible>
  },
  "deduction80c": {
    "value": <number>,
    "evidence": <string - Look for "Chapter VI-A", "Section 80C", "80CCC", "80CCD(1)". Sum them if multiple.>
  },
  "deduction80d": {
    "value": <number>,
    "evidence": <string - Look for "Section 80D" (Medical Insurance)>
  },
  "npsContribution": {
    "value": <number>,
    "evidence": <string - Look for "Section 80CCD(1B)" or "NPS" (up to 50k usually)>
  },
  "homeLoanInterest": {
    "value": <number>,
    "evidence": <string - Look for "Section 24(b)", "Interest on Housing Loan", "Loss from House Property">
  },
  "deduction80tta": {
    "value": <number>,
    "evidence": <string - Look for "Section 80TTA", "80TTB" (Savings Interest deductions)>
  },
  "totalTaxDeducted": {
    "value": <number>,
    "evidence": <string - Look for "Total Tax Payable", "Total TDS Deducted", "Net Tax Payable">
  },
  "employerName": {
    "value": <string>,
    "evidence": <string - Name of employer from Part A>
  },
  "employeeName": {
    "value": <string>,
    "evidence": <string - Name of employee>
  },
  "pan": {
    "value": <string>,
    "evidence": <string - PAN number of employee>
  },
  "financialYear": {
    "value": <string>,
    "evidence": <string - Assessment Year or Financial Year>
  }
}

IMPORTANT LOCATIONS:
- Part B is the most important for figures.
- Verify column headers. amounts are often in the last "Amount" column.
- Do not confirm a value unless you see the label next to it (or in the header row).

Return ONLY the JSON.
`;

/**
 * Parses the Gemini response to extract Form 16 data
 */
export function parseGeminiResponse(responseText: string): ParsedForm16Data {
    // Default values
    const defaultData: ParsedForm16Data = {
        grossSalary: null,
        basicSalary: null,
        hraReceived: null,
        rentPaid: null,
        deduction80c: null,
        deduction80d: null,
        npsContribution: null,
        homeLoanInterest: null,
        deduction80tta: null,
        totalTaxDeducted: null,
        employerName: null,
        employeeName: null,
        pan: null,
        financialYear: null,
    };

    try {
        // Clean the response
        let cleanResponse = responseText.trim();
        // Remove markdown code block if present
        if (cleanResponse.startsWith('```json')) {
            cleanResponse = cleanResponse.slice(7);
        } else if (cleanResponse.startsWith('```')) {
            cleanResponse = cleanResponse.slice(3);
        }
        if (cleanResponse.endsWith('```')) {
            cleanResponse = cleanResponse.slice(0, -3);
        }
        cleanResponse = cleanResponse.trim();

        const parsed = JSON.parse(cleanResponse);

        // Helper to extract value whether it's nested (Chain of Verification) or flat
        const extractValue = (field: any) => {
            if (field === null || field === undefined) return null;
            if (typeof field === 'object' && field !== null && 'value' in field) {
                // Log evidence for debugging if needed
                // console.log(`Evidence for field: ${field.evidence}`);
                return field.value;
            }
            return field;
        };

        // Extract values
        const grossSalary = extractValue(parsed.grossSalary);
        const basicSalary = extractValue(parsed.basicSalary);
        const hraReceived = extractValue(parsed.hraReceived);
        const rentPaid = extractValue(parsed.rentPaid);
        const deduction80c = extractValue(parsed.deduction80c);
        const deduction80d = extractValue(parsed.deduction80d);
        const npsContribution = extractValue(parsed.npsContribution);
        const homeLoanInterest = extractValue(parsed.homeLoanInterest);
        const deduction80tta = extractValue(parsed.deduction80tta);
        const totalTaxDeducted = extractValue(parsed.totalTaxDeducted);
        const employerName = extractValue(parsed.employerName);
        const employeeName = extractValue(parsed.employeeName);
        const pan = extractValue(parsed.pan);
        const financialYear = extractValue(parsed.financialYear);

        return {
            grossSalary: sanitizeNumber(grossSalary),
            basicSalary: sanitizeNumber(basicSalary),
            hraReceived: sanitizeNumber(hraReceived),
            rentPaid: sanitizeNumber(rentPaid),
            deduction80c: sanitizeNumber(deduction80c),
            deduction80d: sanitizeNumber(deduction80d),
            npsContribution: sanitizeNumber(npsContribution),
            homeLoanInterest: sanitizeNumber(homeLoanInterest),
            deduction80tta: sanitizeNumber(deduction80tta),
            totalTaxDeducted: sanitizeNumber(totalTaxDeducted),
            employerName: sanitizeString(employerName),
            employeeName: sanitizeString(employeeName),
            pan: sanitizeString(pan),
            financialYear: sanitizeString(financialYear),
        };
    } catch (error) {
        console.error('Failed to parse Gemini response:', error);
        console.error('Raw response:', responseText);
        return defaultData;
    }
}

/**
 * Sanitizes a number value from Gemini response
 */
function sanitizeNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    // If it's already a number, return it
    if (typeof value === 'number' && !isNaN(value)) {
        return Math.round(value);
    }

    // If it's a string, try to parse it
    if (typeof value === 'string') {
        // Remove commas, ₹, Rs, and other non-numeric characters except decimal
        const cleaned = value.replace(/[₹,Rs.\s]/gi, '').trim();
        const parsed = parseFloat(cleaned);
        if (!isNaN(parsed)) {
            return Math.round(parsed);
        }
    }

    return null;
}

/**
 * Sanitizes a string value from Gemini response
 */
function sanitizeString(value: unknown): string | null {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        return value.trim();
    }
    return null;
}
