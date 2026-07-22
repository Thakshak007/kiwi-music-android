const https = require('https');
const http = require('http');
const urlModule = require('url');
const path = require('path');

function fetchTextUrl(url) {
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 6000
    };

    const protocolHandler = url.startsWith('https') ? https : http;

    protocolHandler.get(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = new urlModule.URL(redirectUrl, url).toString();
        }
        return fetchTextUrl(redirectUrl).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP Error ${res.statusCode}`));
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject)
      .on('timeout', () => reject(new Error('Timeout')));
  });
}

function parseAudioHrefs(html, pageUrl, domain) {
  const pageResults = [];
  const foundUrls = new Set();

  const mp3Regex = /href="([^"]+\.mp3[^"]*)"/gi;
  const mp3RegexSingle = /href='([^']+\.mp3[^']*)'/gi;
  let match;
  while ((match = mp3Regex.exec(html)) !== null) { foundUrls.add(match[1]); }
  while ((match = mp3RegexSingle.exec(html)) !== null) { foundUrls.add(match[1]); }

  const base64Regex = /link=([a-zA-Z0-9+/=]{12,})/gi;
  while ((match = base64Regex.exec(html)) !== null) {
    try {
      const decoded = Buffer.from(match[1], 'base64').toString('utf-8');
      if (decoded.startsWith('http') && decoded.toLowerCase().includes('.mp3')) {
        foundUrls.add(decoded);
      }
    } catch (e) {}
  }

  foundUrls.forEach(audioUrl => {
    let absoluteUrl = audioUrl;
    if (!audioUrl.startsWith('http')) {
      try {
        absoluteUrl = new urlModule.URL(audioUrl, pageUrl).toString();
      } catch (e) {
        return;
      }
    }

    const lowerUrl = absoluteUrl.toLowerCase();
    if (lowerUrl.includes('sample') || lowerUrl.includes('promo')) return;

    const urlPathname = urlModule.parse(absoluteUrl).pathname || '';
    const filename = path.basename(urlPathname) || 'song.mp3';
    
    let title = filename.replace(/\.mp3$/i, '');
    title = decodeURIComponent(title).replace(/%20/g, ' ');
    title = title.replace(/\[isongs\.info\]/gi, '');
    title = title.replace(/\[djpunjab\S*\]/gi, '');
    title = title.trim();

    pageResults.push({
      title: title,
      url: absoluteUrl,
      source: domain,
      filename: filename
    });
  });

  return pageResults;
}

async function debugSearch(songName, language) {
  console.log(`\n========================================`);
  console.log(`DEBUG: Searching "${songName}" (${language})`);
  console.log(`========================================`);

  // Exclude streaming-only sites inside search query to force download portals to appear
  const excludeQuery = '-site:jiosaavn.com -site:gaana.com -site:spotify.com -site:wynk.in -site:youtube.com -site:soundcloud.com -site:saregama.com -site:wikipedia.org -site:facebook.com';
  const searchQuery = `${songName} ${language} mp3 download ${excludeQuery}`.trim();
  const yahooUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(searchQuery)}`;
  
  try {
    const searchHtml = await fetchTextUrl(yahooUrl);
    const links = [];
    const hrefRegex = /href="([^"]+)"/gi;
    let match;
    while ((match = hrefRegex.exec(searchHtml)) !== null) {
      const url = match[1];
      if (url.includes('r.search.yahoo.com') && url.includes('RU=')) {
        try {
          const parts = url.split('RU=');
          if (parts[1]) {
            const actualUrl = decodeURIComponent(parts[1].split('/RK=')[0]);
            links.push(actualUrl);
          }
        } catch (e) {}
      }
    }

    const uniqueResultPages = [...new Set(links)]
      .filter(r => !r.includes('yahoo.com'))
      .slice(0, 10); // crawl up to 10 pages for wide coverage

    console.log('Result pages found:', uniqueResultPages);

    const audioResults = [];

    for (const pageUrl of uniqueResultPages) {
      try {
        console.log(`Fetching page: ${pageUrl}`);
        const pageHtml = await fetchTextUrl(pageUrl);
        const domain = new urlModule.URL(pageUrl).hostname;

        const direct = parseAudioHrefs(pageHtml, pageUrl, domain);
        if (direct.length > 0) {
          console.log(`  -> Found ${direct.length} direct links!`);
          audioResults.push(...direct);
        }

        // Subpages
        const subpageLinks = new Set();
        const aHrefRegex = /href="([^"]+)"/gi;
        const subpageKeywords = ['/download', 'download-', '/get/', 'file/', 'download-file', 'mirror'];
        
        let subMatch;
        while ((subMatch = aHrefRegex.exec(pageHtml)) !== null) {
          const l = subMatch[1].toLowerCase();
          if (subpageKeywords.some(keyword => l.includes(keyword)) && !l.includes('.mp3') && !l.includes('.zip')) {
            subpageLinks.add(subMatch[1]);
          }
        }

        const subpagesToFetch = [...subpageLinks].slice(0, 3);
        for (const subpage of subpagesToFetch) {
          let absoluteSubpage = subpage;
          if (!subpage.startsWith('http')) {
            try {
              absoluteSubpage = new urlModule.URL(subpage, pageUrl).toString();
            } catch (e) {
              continue;
            }
          }
          try {
            console.log(`  -> Fetching subpage: ${absoluteSubpage}`);
            const subpageHtml = await fetchTextUrl(absoluteSubpage);
            const subpageAudio = parseAudioHrefs(subpageHtml, absoluteSubpage, domain);
            if (subpageAudio.length > 0) {
              console.log(`     -> Found ${subpageAudio.length} links on subpage!`);
              audioResults.push(...subpageAudio);
            }
          } catch (errSub) {
            console.error(`     -> Subpage failed:`, errSub.message);
          }
        }
      } catch (errPage) {
        console.error(`  -> Page failed:`, errPage.message);
      }
    }

    console.log(`Total unique results extracted: ${audioResults.length}`);
    audioResults.slice(0, 5).forEach((r, i) => {
      console.log(`[${i+1}] Title: ${r.title}\n    URL: ${r.url}\n    Source: ${r.source}`);
    });

  } catch (err) {
    console.error('Search failed:', err);
  }
}

async function run() {
  await debugSearch('Mastaaru Mastaaru', 'Telugu');
  await debugSearch('Jaadu', 'Punjabi');
}

run();
