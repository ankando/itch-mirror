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

  // 监听下载请求
  page.on('response', async (response) => {
    const url = response.url();
    if (url.match(/\.(zip|jar|apk|exe|tar\.gz|dmg)(\?|$)/)) {
      console.log('Detected download:', url);
      downloadLinks.add(url);
    }
  });

  console.log('Opening purchase page...');
  await page.goto('https://anuke.itch.io/mindustry/purchase?initiator=mobile', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  console.log('Clicking "No thanks" button...');
  await page.waitForSelector('a.direct_download_btn', {timeout: 10000});
  await page.click('a.direct_download_btn');

  console.log('Waiting for download buttons...');
  await page.waitForSelector('a.download_btn', {timeout: 10000});
  const buttons = await page.$$('a.download_btn');
  console.log(`Found ${buttons.length} download buttons.`);

  // 逐个点击下载按钮并等待下载请求
  for (let i = 0; i < buttons.length; i++) {
    console.log(`Clicking download button ${i + 1}...`);
    
    // 点击按钮前清除之前的下载链接
    downloadLinks.clear();
    
    // 点击按钮
    await buttons[i].click();
    
    // 等待可能的下载请求
    try {
      await page.waitForResponse(
        response => response.url().match(/\.(zip|jar|apk|exe|tar\.gz|dmg)(\?|$)/), 
        {timeout: 5000}
      );
    } catch (e) {
      console.warn(`No download response for button ${i + 1} within timeout`);
    }
    
    // 给页面一点时间处理
    await page.waitForTimeout(1000);
    
    // 如果有捕获到下载链接，打印出来
    if (downloadLinks.size > 0) {
      console.log(`Captured ${downloadLinks.size} download links for button ${i + 1}`);
    } else {
      console.warn(`No download links captured for button ${i + 1}`);
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
