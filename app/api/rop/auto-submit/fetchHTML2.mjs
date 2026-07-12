import fetch from 'node-fetch';

async function run() {
  const ROP_URL = 'https://www.rop.gov.om/OnlineServices/eVisa/en/ApplyforNewVisa.aspx';
  const res = await fetch(ROP_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  
  // Find fields related to Sponsor
  const sponsorIdMatch = html.match(/<input[^>]*name="[^"]*Sponsor[^"]*"[^>]*>/gi);
  if (sponsorIdMatch) {
    console.log("Sponsor Inputs:");
    sponsorIdMatch.forEach(m => console.log(m));
  }
}
run();
