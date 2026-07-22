const https = require('https');
const fs = require('fs');

const url = 'https://www.naasongs.to/a/mastaaru-mastaaru-song-download-from-sir-telugu-movie.html';
const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
};

https.get(url, options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('naasongs.html', data);
    console.log('Saved page HTML. Total characters:', data.length);
    
    // Look for all links
    const regex = /href="([^"]+)"/gi;
    let match;
    const links = [];
    while ((match = regex.exec(data)) !== null) {
      links.push(match[1]);
    }
    
    console.log('All links found (first 50):');
    links.slice(0, 50).forEach((l, i) => console.log(`${i+1}: ${l}`));
  });
});
