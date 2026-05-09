// Run this to check the API format
const res = await fetch("https://jlpt-vocab-api.vercel.app/api/words/all?level=n5");
const data = await res.json();
const sample = Array.isArray(data) ? data.slice(0, 3) : data?.words?.slice(0, 3) ?? data;
console.log("Total:", Array.isArray(data) ? data.length : "not array");
console.log("Sample:", JSON.stringify(sample, null, 2));
