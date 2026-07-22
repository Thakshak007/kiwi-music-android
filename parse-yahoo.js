const fs = require('fs');
const html = fs.readFileSync('yahoo.html', 'utf-8');

console.log('Total characters:', html.length);

// Look for a tags
const regex = /<a\s+[^>]*href="([^"]+)"[^>]*>/gi;
let match;
const links = [];
while ((match = regex.exec(html)) !== null) {
  links.push(match[1]);
}

console.log('Total links found:', links.length);

// Filter links that look like search results (not yahoo links)
const searchResults = links.filter(link => {
  return link.includes('r.search.yahoo.com') || (!link.includes('yahoo.com') && link.startsWith('http'));
});

console.log('Search result links (first 20):');
searchResults.slice(0, 20).forEach((link, idx) => {
  let decoded = link;
  if (link.includes('RU=')) {
    const parts = link.split('RU=');
    if (parts[1]) {
      decoded = decodeURIComponent(parts[1].split('/RK=')[0]);
    }
  }
  console.log(`${idx + 1}: ${decoded}`);
});
