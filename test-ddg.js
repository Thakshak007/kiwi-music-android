const https = require('https');
const fs = require('fs');

const query = 'Mastaaru Mastaaru Telugu mp3 download';
const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
};

https.get(url, options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('ddg.html', data);
    console.log('DuckDuckGo status:', res.statusCode);
    
    const regex = /href="([^"]+)"/gi;
    let match;
    const links = [];
    while ((match = regex.exec(data)) !== null) {
      links.push(match[1]);
    }
    
    console.log('Total links found:', links.length);
    const filtered = links.filter(l => l.startsWith('http') && !l.includes('duckduckgo.com'));
    filtered.slice(0, 30).forEach((l, i) => console.log(`${i+1}: ${l}`));
  });
});
