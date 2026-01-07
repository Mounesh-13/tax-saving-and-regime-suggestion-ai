// Quick test of the updated models
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config({ path: ".env.local" });

const apiKey = process.env.GEMINI_API_KEY;

const modelNames = [
    "gemini-flash-latest",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-pro-latest",
];

async function testModels() {
    const genAI = new GoogleGenerativeAI(apiKey);

    for (const modelName of modelNames) {
        console.log(`\n🧪 Testing: ${modelName}`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Say 'Hello!' in one word.");
            const response = await result.response;
            const text = response.text();

            console.log(`✅ SUCCESS! Response: ${text.trim()}`);
            console.log(`\n🎉 Working model found: ${modelName}`);
            return;
        } catch (error) {
            console.error(`❌ Failed: ${error.message.substring(0, 100)}...`);
        }
    }
}

testModels();
