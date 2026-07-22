const { execSync } = require('child_process');
const https = require('https');

function fetchDdgLiteText(query) {
  return new Promise((resolve, reject) => {
    const url = 'https://lite.duckduckgo.com/lite/';
    const postData = `q=${encodeURIComponent(query)}`;
    
    const options = {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 5000
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function run() {
  const song = 'neegda neega payana';
  const query = `${song} site:youtube.com`;
  console.log('Searching DDG Lite for:', query);
  
  try {
    const html = await fetchDdgLiteText(query);
    const regex = /href="(https?:\/\/www\.youtube\.com\/watch\?v=[a-zA-Z0-9_-]+)"/gi;
    let match;
    const ytUrls = [];
    while ((match = regex.exec(html)) !== null) {
      ytUrls.push(match[1]);
    }

    const uniqueYtUrls = [...new Set(ytUrls)];
    console.log('YouTube links found:', uniqueYtUrls);

    if (uniqueYtUrls.length > 0) {
      const targetUrl = uniqueYtUrls[0];
      console.log('\nRunning yt-dlp to get direct stream URL for:', targetUrl);
      
      const start = Date.now();
      const streamUrl = execSync(`"C:\\Users\\csp\\.gemini\\antigravity\\scratch\\voice-music-player\\yt-dlp.exe" -g -f ba "${targetUrl}"`).toString().trim();
      console.log(`Time taken: ${Date.now() - start}ms`);
      console.log('\nDirect Audio Stream URL:');
      console.log(streamUrl);
    } else {
      console.log('No YouTube links found.');
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

run();
