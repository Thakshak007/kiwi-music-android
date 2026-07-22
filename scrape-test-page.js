const https = require('https');

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
  const url = 'https://www.naasongs.to/a/mastaaru-mastaaru-song-download-from-sir-telugu-movie.html';
  console.log('Fetching:', url);
  try {
    const html = await fetchUrl(url);
    const regex = /href="([^"]+\.mp3[^"]*)"/gi;
    const regexSingle = /href='([^']+\.mp3[^']*)'/gi;
    const links = new Set();
    let match;
    while ((match = regex.exec(html)) !== null) {
      links.add(match[1]);
    }
    while ((match = regexSingle.exec(html)) !== null) {
      links.add(match[1]);
    }

    console.log('MP3 links found:');
    links.forEach(l => console.log(l));
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
