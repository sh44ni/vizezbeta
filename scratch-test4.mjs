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
  
  const idx = text.indexOf('CaptchaImageDiv');
  if (idx !== -1) {
    console.log(text.substring(idx - 50, idx + 500));
  } else {
    console.log('CaptchaImage not found in text');
  }
}

test();
