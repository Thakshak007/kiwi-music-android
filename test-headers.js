const https = require('https');
const fs = require('fs');

const url = 'https://pendujatt.org/album/2598902/jaadu';
const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
};

https.get(url, options, (res) => {
  console.log('Status code:', res.statusCode);
  console.log('Headers:', res.headers);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('pendujatt.html', data);
    console.log('Saved. Total characters:', data.length);
  });
}).on('error', e => console.error(e));
