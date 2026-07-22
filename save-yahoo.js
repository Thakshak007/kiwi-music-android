const https = require('https');
const fs = require('fs');

const url = 'https://search.yahoo.com/search?p=Maleye+Maleye+Kannada+mp3+download';
const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
};

https.get(url, options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('yahoo.html', data);
    console.log('Yahoo search page saved to yahoo.html. Status code:', res.statusCode);
  });
});
