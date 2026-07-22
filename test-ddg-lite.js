const https = require('https');
const fs = require('fs');

const query = 'Mastaaru Mastaaru Telugu mp3 download';
const url = `https://lite.duckduckgo.com/lite/`;

// DuckDuckGo Lite expects a POST request with body "q=query"
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
    fs.writeFileSync('ddg-lite.html', data);
    console.log('DuckDuckGo Lite status:', res.statusCode);
    
    // Parse result links from the HTML page
    // In DDG Lite, results are inside <td class="result-link"><a href="[url]">
    const regex = /class="result-link"\s+href="([^"]+)"/gi;
    let match;
    const links = [];
    while ((match = regex.exec(data)) !== null) {
      links.push(match[1]);
    }
    
    // Fallback: match any href inside <a> tags that looks like search result
    const regexFallback = /<a[^>]*href="([^"]+)"[^>]*>/gi;
    const allLinks = [];
    while ((match = regexFallback.exec(data)) !== null) {
      const u = match[1];
      if (u.startsWith('http') && !u.includes('duckduckgo.com')) {
        allLinks.push(u);
      }
    }

    console.log('Result-link matches found:', links.length);
    links.forEach((l, i) => console.log(`Result ${i+1}: ${l}`));
    
    console.log('\nAll external links found:', allLinks.length);
    allLinks.slice(0, 15).forEach((l, i) => console.log(`Link ${i+1}: ${l}`));
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.write(postData);
req.end();
