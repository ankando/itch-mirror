const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();

  // 存储 {filename => downloadUrl}
  const downloads = new Map();

  // 监听所有请求，找到符合下载链接的
  page.on('request', request => {
    const url = request.url();
    // 你给的示例下载链接格式示意，匹配特征可调整
    if (url.includes('itchio-mirror') && url.includes('archive-default')) {
      console.log('Captured download URL:', url);
      // 先放到数组后面再关联文件名
      downloads.set('pending', url);
    }
  });

  console.log('Opening page...');
  await page.goto('https://anuke.itch.io/mindustry/purchase?initiator=mobile', { waitUntil: 'networkidle2' });

  console.log('Clicking "No thanks" button...');
  await page.waitForSelector('a.direct_download_btn');
  await page.click('a.direct_download_btn');

  await page.waitForTimeout(3000);

  // 获取所有下载文件名和按钮句柄
  const entries = await page.$$eval('div.upload', nodes => nodes.map(node => {
    const name = node.querySelector('.upload_name .name')?.textContent.trim() || 'unknown.file';
    return name;
  }));

  const buttons = await page.$$('a.download_btn');

  for (let i = 0; i < buttons.length; i++) {
    const filename = entries[i] || `file${i + 1}`;
    console.log(`Clicking download button ${i + 1} for file: ${filename}`);

    // 清空旧的 pending 下载链接
    downloads.delete('pending');

    try {
      await buttons[i].click();
    } catch (e) {
      console.warn(`Failed clicking button ${i + 1}`, e);
      continue;
    }

    // 等几秒让下载请求发起
    await page.waitForTimeout(3000);

    // 读取刚捕获的下载链接
    const downloadUrl = downloads.get('pending');
    if (downloadUrl) {
      downloads.set(filename, downloadUrl);
      downloads.delete('pending');
      console.log(`Captured URL for ${filename}: ${downloadUrl}`);
    } else {
      console.warn(`No download URL captured for ${filename}`);
    }
  }

  // 生成下载脚本
  const lines = [];
  for (const [filename, url] of downloads) {
    if (filename === 'pending') continue;
    lines.push(`curl -L "${url}" -o "downloads/${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"`);
  }

  fs.writeFileSync('download.sh', lines.join('\n') + '\n');
  console.log(`Saved ${lines.length} download URLs to download.sh`);

  await browser.close();
})();
