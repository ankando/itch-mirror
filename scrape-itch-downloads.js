const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 自动创建目录
const downloadPath = path.resolve('./downloads');
if (!fs.existsSync(downloadPath)) {
  fs.mkdirSync(downloadPath, { recursive: true });
}

// 安全等待函数
const safeWait = async (page, selector, timeout = 10000) => {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (e) {
    console.warn(`Selector ${selector} not found`);
    return false;
  }
};

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--single-process'
    ],
    executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome'
  });

  try {
    const page = await browser.newPage();
    
    // 设置下载行为
    await page._client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadPath
    });

    // 反自动化检测
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    console.log('Loading purchase page...');
    await page.goto('https://anuke.itch.io/mindustry/purchase', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // 处理可能的弹窗
    if (await safeWait(page, 'a.direct_download_btn')) {
      await page.click('a.direct_download_btn');
    }

    console.log('Finding download links...');
    if (await safeWait(page, 'a.download_btn', 15000)) {
      const buttons = await page.$$('a.download_btn');
      console.log(`Found ${buttons.length} download options`);

      for (let i = 0; i < buttons.length; i++) {
        console.log(`Downloading file ${i + 1}/${buttons.length}`);
        await buttons[i].click();
        await new Promise(resolve => setTimeout(resolve, 5000)); // 简单等待
      }
    }

    // 验证下载结果
    const files = fs.readdirSync(downloadPath);
    if (files.length === 0) {
      throw new Error('No files downloaded!');
    }
    console.log(`Download completed. Files saved in ${downloadPath}`);

  } catch (error) {
    console.error('Scraping failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
