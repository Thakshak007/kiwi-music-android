const https = require('https');
const urlModule = require('url');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function test() {
  const query = 'site:pagalworld.us OR site:pagalnew.com OR site:naasongs.co OR site:naasongs.to OR site:djpunjab.fm OR site:mr-jatt.im Maleye Maleye Kannada';
  const url = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;
  
  console.log('Fetching:', url);
  try {
    const html = await fetchUrl(url);
    const regex = /<a\s+[^>]*href="([^"]+)"[^>]*>/gi;
    let match;
    const links = [];
    while ((match = regex.exec(html)) !== null) {
      links.push(match[1]);
    }
    
    const results = [];
    links.forEach(link => {
      if (link.includes('r.search.yahoo.com') && link.includes('RU=')) {
        const parts = link.split('RU=');
        if (parts[1]) {
          const actualUrl = decodeURIComponent(parts[1].split('/RK=')[0]);
          results.push(actualUrl);
        }
      }
    });

    console.log('Target site links found:');
    const uniqueResults = [...new Set(results)].filter(r => !r.includes('yahoo.com'));
    uniqueResults.forEach((r, i) => console.log(`${i+1}: ${r}`));
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
