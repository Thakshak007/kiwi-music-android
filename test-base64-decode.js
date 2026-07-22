const fs = require('fs');
const html = fs.readFileSync('naasongs.html', 'utf-8');

const regex = /link=([a-zA-Z0-9+/=]+)/gi;
let match;
const decodedLinks = [];

while ((match = regex.exec(html)) !== null) {
  try {
    const decoded = Buffer.from(match[1], 'base64').toString('utf-8');
    decodedLinks.push(decoded);
  } catch (e) {
    // Ignore
  }
}

console.log('Decoded links found:');
decodedLinks.forEach((l, i) => console.log(`${i+1}: ${l}`));
