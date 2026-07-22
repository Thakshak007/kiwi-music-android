const fs = require('fs');
const html = fs.readFileSync('yahoo-youtube.html', 'utf8');

function parseYahooResults(html) {
  const results = [];
  // Find all hrefs matching Yahoo redirect links
  const hrefRegex = /href="([^"]*r\.search\.yahoo\.com[^"]*RU=([^"]+))"/gi;
  
  let match;
  while ((match = hrefRegex.exec(html)) !== null) {
    const fullHref = match[1];
    let actualUrl = '';
    try {
      const parts = fullHref.split('RU=');
      if (parts[1]) {
        actualUrl = decodeURIComponent(parts[1].split('/RK=')[0]);
      }
    } catch (e) {
      continue;
    }
    
    // Find the next h3 tag starting from the href match index
    const startIndex = match.index;
    const block = html.substring(startIndex, startIndex + 1500);
    
    // Check if there is an h3 class="title" or similar header tag in this block
    const titleRegex = /<h3[^>]*>([\s\S]*?)<\/h3>/i;
    const titleMatch = block.match(titleRegex);
    
    if (titleMatch) {
      let rawTitle = titleMatch[1];
      let title = rawTitle.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
      
      // Filter out utility links or duplicates
      if (actualUrl && !actualUrl.includes('yahoo.com') && !results.some(r => r.url === actualUrl)) {
        results.push({
          title: title,
          url: actualUrl
        });
      }
    }
  }
  return results;
}

const parsed = parseYahooResults(html);
console.log(`Parsed ${parsed.length} results:`);
parsed.forEach((p, i) => {
  console.log(`${i+1}: ${p.title}\n   ${p.url}`);
});
