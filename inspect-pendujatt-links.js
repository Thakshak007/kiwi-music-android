const https = require('https');

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
  const url = 'https://pendujatt.org/album/2598902/jaadu';
  console.log('Fetching:', url);
  try {
    const html = await fetchTextUrl(url);
    const regex = /href="([^"]+)"/gi;
    let match;
    const links = [];
    while ((match = regex.exec(html)) !== null) {
      links.push(match[1]);
    }
    
    console.log('Links containing song/download/play:');
    links.forEach(l => {
      if (l.includes('song') || l.includes('download') || l.includes('play')) {
        console.log('  ->', l);
      }
    });
  } catch (e) {
    console.error('Error:', e);
  }
}

run();
