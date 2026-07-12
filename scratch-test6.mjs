import https from 'https';

async function test() {
  const ROP_URL = 'https://www.rop.gov.om/OnlineServices/eVisa/en/ApplyforNewVisa.aspx';
  const response = await fetch(ROP_URL, {
    redirect: 'manual',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
  });

  const text = await response.text();
  
  const ddlNatMatch = text.match(/<select name="ddlNationality"[^>]*>([\s\S]*?)<\/select>/i);
  if (ddlNatMatch) {
    const optionsHtml = ddlNatMatch[1];
    const map = {};
    const regex = /<option(?:[^>]*)value="([^"]+)"[^>]*>([^<]+)<\/option>/gi;
    let match;
    while ((match = regex.exec(optionsHtml)) !== null) {
      if (match[1] !== '0') {
        map[match[2].trim().toUpperCase()] = match[1];
      }
    }
    console.log(JSON.stringify(map, null, 2));
  } else {
    console.log('ddlNationality not found');
  }
}

test();
