const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  const downloadLinks = new Map();

  console.log('Opening purchase page...');
  await page.goto('https://anuke.itch.io/mindustry/purchase?initiator=mobile', {
    waitUntil: 'networkidle2',
  });

  console.log('Clicking "No thanks" button...');
  await page.waitForSelector('a.direct_download_btn');
  await page.click('a.direct_download_btn');

  console.log('Waiting for download buttons...');
  await page.waitForSelector('a.download_btn');

  // 提取页面上所有含 href 的按钮，并过滤出真实下载链接
  const links = await page.$$eval('a.download_btn', anchors =>
    anchors
      .map(a => {
        const href = a.getAttribute('href');
        const text = a.innerText.trim();
        return {
          href,
          filename: href?.split('/').pop()?.split('?')[0] || text || 'downloaded.file',
        };
      })
      .filter(a => a.href && /\.(zip|jar|apk|exe|tar\.gz|dmg)$/.test(a.href.split('?')[0]))
  );

  for (const { href, filename } of links) {
    console.log('Found download:', href, '→', filename);
    downloadLinks.set(href, filename);
  }

  // 写入 download.sh
  const lines = Array.from(downloadLinks.entries()).map(
    ([url, filename]) => `curl -L "${url}" -o "downloads/${filename}"`
  );

  fs.writeFileSync('download.sh', lines.join('\n') + '\n', 'utf8');
  console.log(`Saved ${downloadLinks.size} download URLs to download.sh`);

  await browser.close();
})();
