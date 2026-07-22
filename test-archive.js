const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  const query = 'Mastaaru Mastaaru';
  // Search for audio items on Archive.org
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}+AND+mediatype:audio&fl[]=identifier,title,creator,publicdate&sort[]=downloads+desc&output=json`;
  
  console.log('Fetching Archive.org search:', url);
  try {
    const res = await fetchJson(url);
    const docs = res.response.docs;
    console.log(`Found ${docs.length} matches on Archive.org:`);
    
    for (const doc of docs) {
      console.log(`\nIdentifier: ${doc.identifier}`);
      console.log(`Title: ${doc.title}`);
      console.log(`Creator: ${doc.creator}`);
      
      // Fetch details to get MP3 file paths
      const detailsUrl = `https://archive.org/metadata/${doc.identifier}`;
      const metadata = await fetchJson(detailsUrl);
      const files = metadata.files || [];
      const mp3Files = files.filter(f => f.name.endsWith('.mp3'));
      
      console.log(`MP3 files found (${mp3Files.length}):`);
      mp3Files.forEach(f => {
        const directUrl = `https://archive.org/download/${doc.identifier}/${f.name}`;
        console.log(`  -> URL: ${directUrl}`);
        console.log(`     Size: ${f.size} bytes`);
      });
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

run();
