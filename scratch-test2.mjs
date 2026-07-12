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
  
  const viewStateMatch = text.match(/id="__VIEWSTATE"\s+value="([^"]*)"/);
  console.log('viewStateMatch', !!viewStateMatch);
  const captchaTokenMatch = text.match(/id="LBD_VCID_c_en_applyfornewvisa_samplecaptcha"\s+value="([^"]*)"/);
  console.log('captchaTokenMatch', !!captchaTokenMatch);
  const captchaImageSrcMatch = text.match(/<img\s+id="c_en_applyfornewvisa_samplecaptcha_CaptchaImage"[^>]+src="([^"]+)"/);
  console.log('captchaImageSrcMatch', !!captchaImageSrcMatch);
}

test();
