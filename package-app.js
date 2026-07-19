const packager = require('electron-packager');

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

async function bundle() {
  console.log('Starting programmatic packaging...');
  try {
    const appPaths = await packager({
      dir: '.',
      name: 'kiwi-music',
      platform: 'win32',
      arch: 'x64',
      overwrite: true,
      out: './dist'
    });
    console.log(`App packaged successfully! Output folders:`, appPaths);
  } catch (err) {
    console.error('Error during packaging:', err);
  }
}

bundle();
