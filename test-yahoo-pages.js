const https = require('https');
const urlModule = require('url');

function fetchTextUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function run() {
  const query = 'Jaadu Punjabi mp3 download';
  const urls = [
    `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`,
    `https://search.yahoo.com/search?p=${encodeURIComponent(query)}&b=11`,
    `https://search.yahoo.com/search?p=${encodeURIComponent(query)}&b=21`
  ];
  
  console.log('Fetching Yahoo search pages 1, 2, 3...');
  
  const results = await Promise.all(urls.map(url => fetchTextUrl(url)));
  const allLinks = new Set();
  
  results.forEach(html => {
    const hrefRegex = /href="([^"]+)"/gi;
    let match;
    while ((match = hrefRegex.exec(html)) !== null) {
      const u = match[1];
      if (u.includes('r.search.yahoo.com') && u.includes('RU=')) {
        try {
          const parts = u.split('RU=');
          if (parts[1]) {
            const actualUrl = decodeURIComponent(parts[1].split('/RK=')[0]);
            if (!actualUrl.includes('yahoo.com')) {
              allLinks.add(actualUrl);
            }
          }
        } catch (e) {}
      }
    }
  });
  
  console.log(`Discovered ${allLinks.size} unique organic links:`);
  [...allLinks].forEach((l, i) => console.log(`${i+1}: ${l}`));
}

run();
