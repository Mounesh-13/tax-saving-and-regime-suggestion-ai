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
export const FORM16_EXTRACTION_PROMPT = `
You are an expert Form 16 (Indian income tax) document parser. 
Analyze this Form 16 document image/PDF and extract the following financial data.

CRITICAL INSTRUCTIONS:
1. Return ONLY a valid JSON object - no markdown, no explanations, no code blocks
2. All monetary values must be NUMBERS ONLY (no commas, no ₹ symbol, no "Rs")
3. If a field is not clearly visible or not found, use null
4. Look primarily in PART B of Form 16 for income and deduction details
5. Be precise - double-check numbers against the document

FIELDS TO EXTRACT:
{
  "grossSalary": <number - Look for "Gross Salary" or "Total Salary as per section 17(1)" in Part B>,
  "basicSalary": <number - Look for "Basic Salary" or "Basic/DA" in salary breakup. If not found, estimate as 40-50% of gross>,
  "hraReceived": <number - Look for "House Rent Allowance" or "HRA" in allowances section>,
  "rentPaid": <number - usually not in Form 16, set to null>,
  "deduction80c": <number - Look for "Deduction under Chapter VI-A: 80C/80CCC/80CCD(1)" total>,
  "deduction80d": <number - Look for "80D" (Medical Insurance) in Chapter VI-A deductions>,
  "npsContribution": <number - Look for "80CCD(1B)" or "NPS" in Chapter VI-A deductions>,
  "homeLoanInterest": <number - Look for "Deduction u/s 24" or "Interest on Housing Loan">,
  "deduction80tta": <number - Look for "80TTA" or "80TTB" in Chapter VI-A deductions>,
  "totalTaxDeducted": <number - Look for "Tax Payable" or "Total TDS" at the bottom>,
  "employerName": <string - Company/Employer name from Part A>,
  "employeeName": <string - Employee name>,
  "pan": <string - PAN number of employee>,
  "financialYear": <string - e.g., "2023-24">
}

IMPORTANT LOCATIONS IN FORM 16:
- Part A: Employer/Employee details, TAN, PAN, TDS summary
- Part B: Detailed salary breakup, allowances, deductions under Chapter VI-A

Return ONLY the JSON object, nothing else.
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
        // Clean the response - remove potential markdown code blocks
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

        // Validate and sanitize each field
        return {
            grossSalary: sanitizeNumber(parsed.grossSalary),
            basicSalary: sanitizeNumber(parsed.basicSalary),
            hraReceived: sanitizeNumber(parsed.hraReceived),
            rentPaid: sanitizeNumber(parsed.rentPaid),
            deduction80c: sanitizeNumber(parsed.deduction80c),
            deduction80d: sanitizeNumber(parsed.deduction80d),
            npsContribution: sanitizeNumber(parsed.npsContribution),
            homeLoanInterest: sanitizeNumber(parsed.homeLoanInterest),
            deduction80tta: sanitizeNumber(parsed.deduction80tta),
            totalTaxDeducted: sanitizeNumber(parsed.totalTaxDeducted),
            employerName: sanitizeString(parsed.employerName),
            employeeName: sanitizeString(parsed.employeeName),
            pan: sanitizeString(parsed.pan),
            financialYear: sanitizeString(parsed.financialYear),
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
