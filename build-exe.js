const fs = require('fs');
const path = require('path');

const srcElectronDist = path.join(__dirname, 'node_modules', 'electron', 'dist');
const destDir = path.join(__dirname, 'dist', 'kiwi-music-win32-x64');
const destAppDir = path.join(destDir, 'resources', 'app');

console.log('Starting custom Kiwi Music package builder...');

try {
  // 1. Create clean output directory
  if (fs.existsSync(path.join(__dirname, 'dist'))) {
    fs.rmSync(path.join(__dirname, 'dist'), { recursive: true, force: true });
  }
  fs.mkdirSync(destAppDir, { recursive: true });
  console.log('[1/4] Created output directories.');

  // 2. Copy prebuilt Electron binaries
  console.log('[2/4] Copying Electron binaries (this might take a few seconds)...');
  fs.cpSync(srcElectronDist, destDir, { recursive: true });
  
  // Rename electron.exe to kiwi-music.exe
  fs.renameSync(
    path.join(destDir, 'electron.exe'),
    path.join(destDir, 'kiwi-music.exe')
  );
  console.log('Renamed executable to kiwi-music.exe');

  // Delete default_app.asar to force Electron to boot our resources/app folder directly
  const defaultAppAsar = path.join(destDir, 'resources', 'default_app.asar');
  if (fs.existsSync(defaultAppAsar)) {
    fs.unlinkSync(defaultAppAsar);
    console.log('Deleted default_app.asar successfully.');
  }

  // 3. Copy source files into resources/app
  console.log('[3/4] Copying application source files...');
  
  // package.json for Electron
  const pkgData = {
    name: 'kiwi-music',
    version: '1.0.0',
    main: 'main.js'
  };
  fs.writeFileSync(
    path.join(destAppDir, 'package.json'),
    JSON.stringify(pkgData, null, 2)
  );

  fs.copyFileSync(
    path.join(__dirname, 'main.js'),
    path.join(destAppDir, 'main.js')
  );
  
  fs.copyFileSync(
    path.join(__dirname, 'preload.js'),
    path.join(destAppDir, 'preload.js')
  );

  // Bundle yt-dlp.exe binary inside packaged app folder
  console.log('Bundling yt-dlp.exe...');
  fs.copyFileSync(
    path.join(__dirname, 'yt-dlp.exe'),
    path.join(destAppDir, 'yt-dlp.exe')
  );

  // Copy public folder
  fs.cpSync(
    path.join(__dirname, 'public'),
    path.join(destAppDir, 'public'),
    { recursive: true }
  );

  console.log('[4/4] Package assembly completed successfully!');
  console.log(`Kiwi Music desktop application is ready at:\n${destDir}`);
} catch (err) {
  console.error('Packaging failed with error:', err);
}
