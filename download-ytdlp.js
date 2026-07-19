const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
const dest = path.join(__dirname, 'yt-dlp.exe');

console.log('Downloading yt-dlp.exe from:', url);
console.log('Saving to:', dest);

function download(downloadUrl) {
  https.get(downloadUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  }, (res) => {
    // Handle redirects
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      console.log('Redirecting to:', res.headers.location);
      return download(res.headers.location);
    }

    if (res.statusCode !== 200) {
      console.error(`Download failed with status: ${res.statusCode}`);
      return;
    }

    const file = fs.createWriteStream(dest);
    res.pipe(file);

    file.on('finish', () => {
      file.close();
      console.log('yt-dlp.exe downloaded successfully!');
      
      // Verify execution
      const { execSync } = require('child_process');
      try {
        const output = execSync(`"${dest}" --version`).toString();
        console.log('yt-dlp version:', output.trim());
      } catch (err) {
        console.error('Failed to run yt-dlp:', err.message);
      }
    });
  }).on('error', (err) => {
    console.error('Download error:', err.message);
  });
}

download(url);
