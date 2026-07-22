const https = require('https');
const urlModule = require('url');

// Custom fetch helper that supports redirects and User-Agent
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    let parsedUrl;
    try {
      parsedUrl = new urlModule.URL(url);
    } catch (e) {
      return reject(new Error(`Invalid URL: ${url}`));
    }

    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 10000
    };

    https.get(options, (res) => {
      // Follow redirects (HTTP 301, 302, 303, 307, 308)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = new urlModule.URL(redirectUrl, url).toString();
        }
        return fetchUrl(redirectUrl).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch: HTTP ${res.statusCode}`));
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject)
      .on('timeout', () => reject(new Error('Request timed out')));
  });
}

// Scrape Yahoo Search for song page links
async function searchSongPages(songName, language) {
  const searchQuery = `${songName} ${language} mp3 download`;
  const yahooUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(searchQuery)}`;
  
  console.log(`Searching Yahoo: ${yahooUrl}`);
  
  try {
    const html = await fetchUrl(yahooUrl);
    
    // Parse Yahoo search result links
    const results = [];
    // Yahoo search results usually look like: <a class=" d-ib fz-20 lh-26 td-hu tc-va" href="RU=.../RK=..."
    // Or we can find links from anchor tags inside h3 with class title
    const linkRegex = /<h3[^>]*class="[^"]*title[^"]*"[^>]*><a[^>]*href="([^"]+)"/g;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      let url = match[1];
      
      // Yahoo redirects look like: https://r.search.yahoo.com/_ylt=.../RU=https://www.pagalworld.us/.../RK=2/RS=...
      if (url.includes('RU=')) {
        const parts = url.split('RU=');
        if (parts[1]) {
          url = decodeURIComponent(parts[1].split('/RK=')[0]);
        }
      }
      results.push(url);
    }
    
    return results.slice(0, 5); // Limit to top 5 results
  } catch (err) {
    console.error('Yahoo search error:', err);
    return [];
  }
}

// Scrape direct MP3/M4A download links from a song page
async function scrapeDownloadLinks(pageUrl) {
  console.log(`Scraping page: ${pageUrl}`);
  try {
    const html = await fetchUrl(pageUrl);
    const domain = new urlModule.URL(pageUrl).hostname;
    
    // Regex for MP3 or M4A download links
    const mp3Regex = /href="([^"]+\.mp3[^"]*)"/gi;
    const mp3RegexSingle = /href='([^']+\.mp3[^']*)'/gi;
    
    const links = new Set();
    let match;
    
    while ((match = mp3Regex.exec(html)) !== null) {
      links.add(match[1]);
    }
    while ((match = mp3RegexSingle.exec(html)) !== null) {
      links.add(match[1]);
    }

    const cleanedLinks = [];
    links.forEach(link => {
      // Resolve relative links
      let absoluteLink = link;
      if (!link.startsWith('http')) {
        try {
          absoluteLink = new urlModule.URL(link, pageUrl).toString();
        } catch (e) {
          return;
        }
      }

      // Check if it looks like a direct download link
      const lower = absoluteLink.toLowerCase();
      // Ignore sample/ad files if any
      if (lower.includes('sample') || lower.includes('promo')) return;

      cleanedLinks.push({
        url: absoluteLink,
        domain: domain,
        filename: path.basename(urlModule.parse(absoluteLink).pathname || 'song.mp3')
      });
    });

    return cleanedLinks;
  } catch (err) {
    console.error(`Failed to scrape page ${pageUrl}:`, err.message);
    return [];
  }
}

const path = require('path');

async function test() {
  const songName = 'Maleye Maleye';
  const language = 'Kannada';
  console.log(`TEST: Searching for "${songName}" (${language})...`);
  
  const pages = await searchSongPages(songName, language);
  console.log('Found song pages:', pages);
  
  for (const page of pages) {
    const links = await scrapeDownloadLinks(page);
    if (links.length > 0) {
      console.log('Found direct download links:', links);
      break;
    }
  }
}

test();
