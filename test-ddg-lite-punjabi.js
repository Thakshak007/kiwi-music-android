const https = require('https');

const query = 'Jaadu Punjabi mp3 download';
const url = `https://lite.duckduckgo.com/lite/`;
const postData = `q=${encodeURIComponent(query)}`;

const options = {
  method: 'POST',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(url, options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const regex = /<a[^>]*href="([^"]+)"[^>]*>/gi;
    let match;
    const links = [];
    while ((match = regex.exec(data)) !== null) {
      const u = match[1];
      if (u.startsWith('http') && !u.includes('duckduckgo.com')) {
        links.push(u);
      }
    }
    console.log(`DuckDuckGo Lite found ${links.length} results for Punjabi query:`);
    links.forEach((l, i) => console.log(`${i+1}: ${l}`));
  });
});

req.write(postData);
req.end();
