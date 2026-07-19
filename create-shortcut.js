const { exec } = require('child_process');
const path = require('path');

const targetPath = path.join(__dirname, 'dist', 'kiwi-music-win32-x64', 'kiwi-music.exe');
const workingDir = path.join(__dirname, 'dist', 'kiwi-music-win32-x64');

// PowerShell script to create Windows shortcut on Desktop
const psScript = `
$wsh = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcut = $wsh.CreateShortcut($desktop + '\\kiwi Music.lnk')
$shortcut.TargetPath = '${targetPath.replace(/\\/g, '\\\\')}'
$shortcut.WorkingDirectory = '${workingDir.replace(/\\/g, '\\\\')}'
$shortcut.Save()
`;

console.log('Creating Windows Desktop shortcut...');

exec(`powershell -NoProfile -Command "${psScript.replace(/\n/g, '; ').replace(/"/g, '\\"')}"`, (err, stdout, stderr) => {
  if (err) {
    console.error('Failed to create shortcut:', err);
    console.error('Stderr:', stderr);
    process.exit(1);
  }
  console.log('Shortcut "kiwi Music" successfully created on your Desktop!');
  process.exit(0);
});
