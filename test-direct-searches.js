const https = require('https');
const http = require('http');
const urlModule = require('url');

function fetchTextUrl(url) {
  return new Promise((resolve, reject) => {
    let parsedUrl;
    try {
      parsedUrl = new urlModule.URL(url);
    } catch (e) {
      return reject(new Error(`Invalid URL: ${url}`));
    }

    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      timeout: 5000
    };

    const protocolHandler = url.startsWith('https') ? https : http;

    protocolHandler.get(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = new urlModule.URL(redirectUrl, url).toString();
        }
        return fetchTextUrl(redirectUrl).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP Error ${res.statusCode}`));
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject)
      .on('timeout', () => reject(new Error('Timeout')));
  });
}

async function run() {
  const query = 'Mastaaru Mastaaru';
  
  // Try Pagalworld search
  const pagalworldUrl = `https://www.pagalworld.us/search.html?keyword=${encodeURIComponent(query)}`;
  console.log('Testing Pagalworld search:', pagalworldUrl);
  try {
    const html = await fetchTextUrl(pagalworldUrl);
    console.log('Pagalworld search succeeded! HTML length:', html.length);
    // Print all links found
    const regex = /href="([^"]+)"/gi;
    let match;
    const links = [];
    while ((match = regex.exec(html)) !== null) {
      if (match[1].includes('song/') || match[1].includes('mastaaru')) {
        links.push(match[1]);
      }
    }
    console.log('Matches:', links.slice(0, 10));
  } catch (e) {
    console.error('Pagalworld search failed:', e.message);
  }

  // Try NaaSongs search
  const naasongsUrl = `https://naasongs.to/?s=${encodeURIComponent(query)}`;
  console.log('\nTesting NaaSongs search:', naasongsUrl);
  try {
    const html = await fetchTextUrl(naasongsUrl);
    console.log('NaaSongs search succeeded! HTML length:', html.length);
    const regex = /href="([^"]+)"/gi;
    let match;
    const links = [];
    while ((match = regex.exec(html)) !== null) {
      if (match[1].includes('song') || match[1].includes('mastaaru')) {
        links.push(match[1]);
      }
    }
    console.log('Matches:', links.slice(0, 10));
  } catch (e) {
    console.error('NaaSongs search failed:', e.message);
  }
}

run();
