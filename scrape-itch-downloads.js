const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 自动创建 downloads 文件夹
const downloadPath = path.resolve('./downloads');
if (!fs.existsSync(downloadPath)) {
  fs.mkdirSync(downloadPath);
}

// 封装延迟函数（替代已废弃的 waitForTimeout）
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // 设为 false 可观察下载过程
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 设置下载行为（关键！）
  await page._client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath // 指定下载目录
  });

  // 设置用户代理和视口
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  await page.setViewport({ width: 1280, height: 800 });

  console.log('Opening purchase page...');
  await page.goto('https://anuke.itch.io/mindustry/purchase?initiator=mobile', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  console.log('Clicking "No thanks" button...');
  await page.waitForSelector('a.direct_download_btn', { timeout: 10000 });
  await page.click('a.direct_download_btn');

  console.log('Waiting for download buttons...');
  await page.waitForSelector('a.download_btn', { timeout: 10000 });
  const buttons = await page.$$('a.download_btn');
  console.log(`Found ${buttons.length} download buttons.`);

  // 逐个点击下载按钮
  for (let i = 0; i < buttons.length; i++) {
    console.log(`Clicking download button ${i + 1}...`);
    await buttons[i].hover();
    await delay(500); // 使用自定义延迟函数
    await buttons[i].click();
    
    // 等待下载完成（根据实际需要调整时间）
    await delay(10000); // 等待 10 秒
    console.log(`Download ${i + 1} completed (check ${downloadPath})`);
  }

  console.log('All downloads finished. Closing browser...');
  await browser.close();
})();
