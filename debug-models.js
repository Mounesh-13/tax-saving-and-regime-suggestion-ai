const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config({ path: ".env.local" });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ No API key found in .env.local");
    process.exit(1);
}

console.log(`🔑 Using API Key: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)} (Length: ${apiKey.length})`);

const modelsToTest = ["models/gemini-1.5-flash", "gemini-1.5-flash", "gemini-pro"];

async function checkModels() {
    const genAI = new GoogleGenerativeAI(apiKey);

    console.log("\n📡 Testing connectivity and model availability...");

    for (const modelName of modelsToTest) {
        process.stdout.write(`Testing ${modelName.padEnd(20)} ... `);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            // Minimal token generation to prove access
            const result = await model.generateContent("Test");
            const response = await result.response;
            console.log("✅ AVAILABLE");
        } catch (error) {
            //   console.log(error)
            if (error.message.includes("404") || error.message.includes("not found")) {
                console.log("❌ NOT FOUND (404)");
            } else if (error.message.includes("403") || error.message.includes("permission")) {
                console.log("🚫 PERMISSION DENIED (403) - Check API enablement");
            } else {
                console.log(`⚠️ ERROR: ${error.message.split("\n")[0]}`); // Print first line of error
            }
        }
    }
}

checkModels();
