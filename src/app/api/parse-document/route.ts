// src/app/api/parse-document/route.ts

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
    ParsedForm16Data,
    FORM16_EXTRACTION_PROMPT,
    parseGeminiResponse,
} from "@/app/utils/documentParser";

// Ensure Node runtime for Gemini SDK
export const runtime = "nodejs";

// Gemini API setup
const apiKey = process.env.GEMINI_API_KEY;

// Models with vision capability
const visionModelNames = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-pro-vision",
];

export async function POST(req: NextRequest) {
    try {
        // Check API key
        if (!apiKey) {
            return NextResponse.json(
                { success: false, error: "GEMINI_API_KEY not configured" },
                { status: 500 }
            );
        }

        // Parse form data
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json(
                { success: false, error: "No file uploaded" },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = [
            "application/pdf",
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
        ];

        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Invalid file type: ${file.type}. Allowed: PDF, JPG, PNG, WebP`,
                },
                { status: 400 }
            );
        }

        // Check file size (10MB max)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json(
                {
                    success: false,
                    error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum: 10MB`,
                },
                { status: 400 }
            );
        }

        // Convert file to base64
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString("base64");

        // Determine MIME type for Gemini
        const mimeType = file.type === "image/jpg" ? "image/jpeg" : file.type;

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        let model = null;
        let modelName = "";

        // Try vision-capable models
        for (const name of visionModelNames) {
            try {
                model = genAI.getGenerativeModel({ model: name });
                modelName = name;
                console.log(`✅ Using vision model: ${modelName}`);
                break;
            } catch {
                console.warn(`⚠️ Failed to initialize ${name}, trying next...`);
            }
        }

        if (!model) {
            return NextResponse.json(
                { success: false, error: "No vision-capable Gemini model available" },
                { status: 500 }
            );
        }

        // Prepare content for Gemini
        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: mimeType,
            },
        };

        console.log(`📄 Processing ${file.name} (${file.type}, ${(file.size / 1024).toFixed(1)}KB)`);

        // Call Gemini Vision API
        const result = await model.generateContent([
            FORM16_EXTRACTION_PROMPT,
            imagePart,
        ]);

        const responseText = result.response.text();
        console.log("📥 Gemini response:", responseText.substring(0, 500) + "...");

        // Parse the response
        const parsedData: ParsedForm16Data = parseGeminiResponse(responseText);

        // Calculate extraction confidence based on key fields found
        const keyFields = [
            parsedData.grossSalary,
            parsedData.basicSalary,
            parsedData.deduction80c,
        ];
        const foundFields = keyFields.filter((f) => f !== null).length;
        const confidence = Math.round((foundFields / keyFields.length) * 100);

        return NextResponse.json({
            success: true,
            model: modelName,
            fileName: file.name,
            fileType: file.type,
            data: parsedData,
            confidence,
            message:
                confidence >= 66
                    ? "Form 16 parsed successfully"
                    : "Partial extraction - please verify fields",
        });
    } catch (error: unknown) {
        console.error("❌ Document parsing error:", error);

        const errorMessage =
            error instanceof Error ? error.message : "Failed to parse document";

        // Check for specific error types
        if (errorMessage.includes("API_KEY")) {
            return NextResponse.json(
                { success: false, error: "Invalid Gemini API key" },
                { status: 401 }
            );
        }

        if (errorMessage.includes("quota") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
            return NextResponse.json(
                { success: false, error: "API quota exceeded. Please try again later." },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}

// GET handler for testing
export async function GET() {
    return NextResponse.json({
        ok: true,
        message: "POST a Form 16 file to this endpoint for parsing",
        accepts: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
        maxSize: "10MB",
    });
}
