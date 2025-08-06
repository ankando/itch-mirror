const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 自动创建 downloads 文件夹
const downloadPath = path.resolve('./downloads');
if (!fs.existsSync(downloadPath)) {
  fs.mkdirSync(downloadPath, { recursive: true });
}

// 封装延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--single-process'
    ],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH // 兼容 CI 环境
  });

  try {
    const page = await browser.newPage();
    
    // 设置下载行为
    await page._client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadPath
    });

    // 反检测配置
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    console.log('Navigating to purchase page...');
    await page.goto('https://anuke.itch.io/mindustry/purchase?initiator=mobile', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('Bypassing donation prompt...');
    await page.waitForSelector('a.direct_download_btn', { timeout: 10000 });
    await page.click('a.direct_download_btn');

    console.log('Locating download buttons...');
    await page.waitForSelector('a.download_btn', { timeout: 15000 });
    const buttons = await page.$$('a.download_btn');
    console.log(`Found ${buttons.length} download variants`);

    // 并行下载（限制并发数）
    const MAX_CONCURRENT = 3;
    for (let i = 0; i < buttons.length; i += MAX_CONCURRENT) {
      const batch = buttons.slice(i, i + MAX_CONCURRENT);
      await Promise.all(batch.map(async (btn, idx) => {
        const pos = i + idx + 1;
        console.log(`[${pos}/${buttons.length}] Initiating download...`);
        await btn.click();
        await delay(8000); // 等待下载开始
      }));
      await delay(15000); // 等待批次完成
    }

    console.log('Verifying downloads...');
    const downloadedFiles = fs.readdirSync(downloadPath);
    if (downloadedFiles.length === 0) {
      throw new Error('No files were downloaded!');
    }
    console.log(`Successfully downloaded ${downloadedFiles.length} files`);
    
  } finally {
    await browser.close();
  }
})();
