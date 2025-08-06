const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();

  // 捕获所有下载链接
  const downloadLinks = new Set();

  page.on('request', (request) => {
    const url = request.url();
    if (url.match(/\.(zip|jar|apk|exe|tar\.gz|dmg)(\?|$)/)) {
      console.log('Detected download:', url);
      downloadLinks.add(url);
    }
  });

  console.log('Opening itch purchase page...');
  await page.goto('https://anuke.itch.io/mindustry/purchase?initiator=mobile', {
    waitUntil: 'networkidle2'
  });

  console.log('Clicking "No thanks, take me to downloads"...');
  await page.waitForSelector('a.direct_download_btn');
  await page.click('a.direct_download_btn');

  console.log('Waiting for download buttons...');
  await page.waitForSelector('a.download_btn');

  // 点击所有下载按钮
  const downloadButtons = await page.$$('a.download_btn');
  console.log(`Found ${downloadButtons.length} download buttons.`);

  for (let i = 0; i < downloadButtons.length; i++) {
    const btn = downloadButtons[i];
    try {
      console.log(`Clicking download button ${i + 1}...`);
      await btn.click();
      await page.waitForTimeout(3000); // 等待下载触发
    } catch (e) {
      console.warn(`Failed to click button ${i + 1}:`, e);
    }
  }

  // 写入下载脚本
  fs.writeFileSync(
    'download.sh',
    Array.from(downloadLinks)
      .map((url, i) => `curl -L "${url}" -o downloads/file${i + 1}${path.extname(url.split('?')[0])}`)
      .join('\n')
  );

  await browser.close();

  console.log('Done. Collected download links:', downloadLinks.size);
})();

