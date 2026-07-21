const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = 3000;

// Downloads folder detection
const DOWNLOADS_DIR = path.join(os.homedir(), 'Downloads');

console.log(`Scanning Downloads directory: ${DOWNLOADS_DIR}`);

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Supported audio extensions
const SUPPORTED_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.ogg', '.flac'];

// Helper to clean up filenames into human-readable Title and Artist
function parseSongName(filename) {
  const ext = path.extname(filename);
  let name = path.basename(filename, ext);

  // Remove common website tags / quality tags / metadata bloat
  name = name
    .replace(/\[isongs\.info\]/gi, '')
    .replace(/\[djpunjab\S*\]/gi, '')
    .replace(/djpunjab\S*/gi, '')
    .replace(/\(pagalworld\S*\)/gi, '')
    .replace(/pagalworld\S*/gi, '')
    .replace(/\(mr-jatt\S*\)/gi, '')
    .replace(/mr-jatt\S*/gi, '')
    .replace(/\[mr-jatt\S*\]/gi, '')
    .replace(/\[sensongsmp3\S*\]/gi, '')
    .replace(/sensongsmp3\S*/gi, '')
    .replace(/_compressed/gi, '')
    .replace(/^\(Audio\)\s*/i, '')
    .replace(/^\d+\s*-\s*/, '') // starting track numbers
    .replace(/^\d+\s+/, '')      // starting numbers
    .replace(/\b(128kbps|320kbps|64kbps|kbps)\b/gi, '')
    .replace(/\b(mp3|m4a|wav|ogg|flac|download|song|songs|video|lyrics|official|audio)\b/gi, '')
    .replace(/[\(\)\[\]]/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let title = name;
  let artist = 'Local Audio';

  if (name.includes('-')) {
    const parts = name.split('-');
    if (parts.length >= 2) {
      title = parts[0].trim();
      artist = parts.slice(1).join('-').trim();
    }
  }

  // Capitalize Title and Artist nicely
  const capitalize = (str) => {
    return str
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
      .trim();
  };

  title = capitalize(title) || 'Unknown Title';
  artist = capitalize(artist) || 'Local Artist';

  return {
    title,
    artist,
    filename: filename
  };
}

// Endpoint to list all downloaded songs
app.get('/api/songs', (req, res) => {
  fs.readdir(DOWNLOADS_DIR, (err, files) => {
    if (err) {
      console.error('Error reading downloads directory:', err);
      return res.status(500).json({ error: 'Unable to scan Downloads folder.' });
    }

    const songs = [];
    files.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        const fullPath = path.join(DOWNLOADS_DIR, file);
        try {
          const stats = fs.statSync(fullPath);
          if (stats.isFile()) {
            const songInfo = parseSongName(file);
            songs.push({
              id: Buffer.from(file).toString('base64url'), // Safe URL ID
              title: songInfo.title,
              artist: songInfo.artist,
              filename: file,
              size: stats.size,
              mtime: stats.mtime
            });
          }
        } catch (e) {
          // Ignore files that fail stat check
        }
      }
    });

    // Sort songs: most recently downloaded/modified first
    songs.sort((a, b) => b.mtime - a.mtime);

    res.json(songs);
  });
});

// Endpoint to stream a song
app.get('/api/songs/stream/:filename', (req, res) => {
  const filename = req.params.filename;
  // Prevent directory traversal
  const safeFilename = path.basename(filename);
  const filepath = path.join(DOWNLOADS_DIR, safeFilename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).send('Song not found.');
  }

  const stat = fs.statSync(filepath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // Support range requests for audio scrubbing
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize) {
      res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
      return;
    }

    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filepath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'audio/mpeg', // Works broad-range for m4a/mp3 in browser players
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'audio/mpeg',
    };
    res.writeHead(200, head);
    fs.createReadStream(filepath).pipe(res);
  }
});

const https = require('https');
const http = require('http');

app.get('/api/proxy', (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('URL is required');
  }

  const client = targetUrl.startsWith('https') ? https : http;
  
  client.get(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  }, (targetRes) => {
    // Copy content-type and content-length headers from target
    res.setHeader('Content-Type', targetRes.headers['content-type'] || 'audio/mpeg');
    if (targetRes.headers['content-length']) {
      res.setHeader('Content-Length', targetRes.headers['content-length']);
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    targetRes.pipe(res);
  }).on('error', (err) => {
    console.error('Proxy error:', err);
    res.status(500).send(err.message);
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
