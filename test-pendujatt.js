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
    
    // Test the old href regex
    const oldRegex = /href=["']([^"']+\.mp3[^"']*)["']/gi;
    const oldMatches = [];
    let match;
    while ((match = oldRegex.exec(html)) !== null) {
      oldMatches.push(match[1]);
    }
    console.log('Old Regex Matches found:', oldMatches.length);
    oldMatches.forEach(m => console.log('  ->', m));

    // Test the new universal text-based URL regex
    const newRegex = /(https?:\/\/[^\s"'`<>]+?\.(?:mp3|m4a|wav|ogg)(?:\?[^\s"'`<>]+)?)/gi;
    const newMatches = new Set();
    while ((match = newRegex.exec(html)) !== null) {
      newMatches.add(match[1]);
    }
    console.log('\nNew Regex Matches found:', newMatches.size);
    newMatches.forEach(m => console.log('  ->', m));

  } catch (e) {
    console.error('Error:', e);
  }
}

run();
