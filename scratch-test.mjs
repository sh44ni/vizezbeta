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
  console.log('Status:', response.status);
  console.log('Headers:', response.headers);
  console.log('Length:', text.length);
  
  if (text.length < 1000) {
     console.log(text);
  } else {
     console.log(text.substring(0, 500));
  }
  
  const viewStateMatch = text.match(/id="__VIEWSTATE"\s+value="([^"]*)"/);
  console.log('viewStateMatch', !!viewStateMatch);
}

test();
