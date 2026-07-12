import fetch from 'node-fetch';

async function run() {
  const ROP_URL = 'https://www.rop.gov.om/OnlineServices/eVisa/en/ApplyforNewVisa.aspx';
  const res = await fetch(ROP_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  
  const m = html.match(/<input[^>]*name="[^"]*txtClearanceNumber[^"]*"[^>]*>/i);
  if (m) console.log(m[0]);
}
run();
