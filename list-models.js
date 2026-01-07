// List all available Gemini models
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config({ path: ".env.local" });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not found");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        console.log("📋 Fetching available models...\n");

        // Use the REST API to list models
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        console.log("✅ Available models:\n");

        data.models.forEach((model) => {
            console.log(`📦 ${model.name}`);
            console.log(`   Display Name: ${model.displayName}`);
            console.log(`   Supported Methods: ${model.supportedGenerationMethods?.join(", ") || "N/A"}`);
            console.log("");
        });

        console.log("\n💡 Recommended models for generateContent:");
        const contentModels = data.models.filter(m =>
            m.supportedGenerationMethods?.includes("generateContent")
        );

        contentModels.forEach(m => {
            const modelId = m.name.replace("models/", "");
            console.log(`   - ${modelId}`);
        });

    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

listModels();
