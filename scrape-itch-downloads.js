const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  console.log('Opening itch page...');
  await page.goto('https://anuke.itch.io/mindustry?download', { waitUntil: 'networkidle2' });

  console.log('Waiting for download panel...');
  await page.waitForSelector('.upload_list .upload');

  const links = await page.$$eval('.upload_list .upload a.button', anchors =>
    anchors.map(a => a.href).filter(href => href.startsWith('https://')));

  console.log('Download links:', links);

  fs.writeFileSync('download.sh',
    links.map((link, i) => `curl -L "${link}" -o downloads/file${i}`).join('\n'),
    'utf-8'
  );

  await browser.close();
})();
