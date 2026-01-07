// Test script to verify Gemini API setup
// Run with: node test-gemini.js

const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config({ path: ".env.local" });

const apiKey = process.env.GEMINI_API_KEY;

console.log("🔍 Testing Gemini API Setup...\n");

if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not found in .env.local");
    console.log("\nPlease add your API key to .env.local:");
    console.log("GEMINI_API_KEY=your_api_key_here");
    process.exit(1);
}

console.log("✅ API Key found:", apiKey.substring(0, 10) + "..." + apiKey.substring(apiKey.length - 4));

const modelNames = [
    "gemini-2.0-flash-exp",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
    "gemini-pro",
];

async function testModels() {
    const genAI = new GoogleGenerativeAI(apiKey);

    for (const modelName of modelNames) {
        console.log(`\n🧪 Testing model: ${modelName}`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Say 'Hello, this model works!' in one sentence.");
            const response = await result.response;
            const text = response.text();

            console.log(`✅ SUCCESS with ${modelName}`);
            console.log(`Response: ${text}`);
            console.log(`\n🎉 Recommended model: ${modelName}`);
            return; // Stop after first success
        } catch (error) {
            console.error(`❌ FAILED with ${modelName}`);
            console.error(`Error: ${error.message}`);
        }
    }

    console.error("\n❌ All models failed. Please check:");
    console.error("1. Your API key is valid");
    console.error("2. You have API quota remaining");
    console.error("3. Your region supports these models");
}

testModels().catch(console.error);
