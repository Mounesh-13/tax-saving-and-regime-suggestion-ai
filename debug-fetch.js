
const apiKey = "AIzaSyA3QgHvUq5yJHWDo-2rUqJUa3LzsMhUjUE";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

console.log(`Testing URL: https://generativelanguage.googleapis.com/v1beta/models?key=HIDDEN`);

async function test() {
    try {
        const res = await fetch(url);
        console.log(`Status: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.log("Response Body (first 200 chars):", text.substring(0, 200));

        if (res.ok) {
            try {
                const data = JSON.parse(text);
                console.log("\nModels found:");
                data.models.slice(0, 5).forEach(m => console.log(`- ${m.name}`));
            } catch (e) { console.error("JSON Parse error:", e); }
        }
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

test();
