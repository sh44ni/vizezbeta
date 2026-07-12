import fetch from 'node-fetch';

async function run() {
  const ROP_URL = 'https://www.rop.gov.om/OnlineServices/eVisa/en/ApplyforNewVisa.aspx';
  const res = await fetch(ROP_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  
  // Find all required fields
  const requiredMatches = html.match(/<input[^>]*class="[^"]*required[^"]*"[^>]*>/gi);
  if (requiredMatches) {
    console.log("Required Inputs:");
    requiredMatches.forEach(m => console.log(m));
  }
}
run();
