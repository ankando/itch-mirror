const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  const downloadLinks = new Set();

  page.on('request', (request) => {
    const url = request.url();
    if (url.match(/\.(zip|jar|apk|exe|tar\.gz|dmg)(\?|$)/)) {
      console.log('Detected download:', url);
      downloadLinks.add(url);
    }
  });

  console.log('Opening purchase page...');
  await page.goto('https://anuke.itch.io/mindustry/purchase?initiator=mobile', {
    waitUntil: 'networkidle2',
  });

  console.log('Clicking "No thanks" button...');
  await page.waitForSelector('a.direct_download_btn');
  await page.click('a.direct_download_btn');

  console.log('Waiting for download buttons...');
  await page.waitForSelector('a.download_btn');
  const buttonsCount = (await page.$$('a.download_btn')).length;
  console.log(`Found ${buttonsCount} download buttons.`);

  for (let i = 0; i < buttonsCount; i++) {
    const buttons = await page.$$('a.download_btn');
    const button = buttons[i];
    if (!button) continue;

    console.log(`Clicking download button ${i + 1}...`);
    try {
      await button.click();
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (e) {
      console.warn(`Failed to click button ${i + 1}:`, e);
    }
  }

  // 保存为 download.sh
  const lines = Array.from(downloadLinks).map((url, i) => {
    const ext = path.extname(url.split('?')[0]);
    return `curl -L "${url}" -o downloads/file${i + 1}${ext}`;
  });

  fs.writeFileSync('download.sh', lines.join('\n'), 'utf8');

  console.log(`Saved ${downloadLinks.size} download URLs to download.sh`);

  await browser.close();
})();
