const https = require('https');
const fs = require('fs');

const query = 'Mastaaru Mastaaru Telugu mp3 download';
const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
};

https.get(url, options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('bing.html', data);
    console.log('Bing search page saved to bing.html. Status code:', res.statusCode);
    
    // Look for all links containing target directories
    const regex = /href="([^"]+)"/gi;
    let match;
    const links = [];
    while ((match = regex.exec(data)) !== null) {
      links.push(match[1]);
    }
    
    console.log('All links found on Bing search (first 50):');
    const filtered = links.filter(l => l.startsWith('http') && !l.includes('microsoft.com') && !l.includes('bing.com'));
    filtered.slice(0, 50).forEach((l, i) => console.log(`${i+1}: ${l}`));
  });
});
