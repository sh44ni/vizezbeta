import fetch from 'node-fetch';

async function run() {
  const ROP_URL = 'https://www.rop.gov.om/OnlineServices/eVisa/en/ApplyforNewVisa.aspx';
  const res = await fetch(ROP_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  
  // Extract ddlIDType select block
  const match = html.match(/<select[^>]*name="[^"]*ddlIDType[^"]*"[^>]*>([\s\S]*?)<\/select>/i);
  if (match) {
    console.log("ddlIDType Options:");
    console.log(match[1]);
  } else {
    console.log("ddlIDType not found!");
  }

  // Extract ddlSponsorType select block
  const matchSponsor = html.match(/<select[^>]*name="[^"]*ddlSponsorType[^"]*"[^>]*>([\s\S]*?)<\/select>/i);
  if (matchSponsor) {
    console.log("ddlSponsorType Options:");
    console.log(matchSponsor[1]);
  }
}
run();
