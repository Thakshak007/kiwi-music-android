const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kiwiAPI', {
  // Invokes folder scan to return song array
  scanSongs: () => ipcRenderer.invoke('scan-songs'),

  // Listens for system media keys (Play/Pause, Next, Prev) triggered in the background
  onGlobalMediaCmd: (callback) => {
    ipcRenderer.on('global-media-cmd', (event, command) => callback(command));
  },

  // Invokes Yahoo/DDG/Archive search and download page crawlers
  searchOnline: (songName, language) => ipcRenderer.invoke('search-online', { songName, language }),

  // Invokes HTTP download stream or yt-dlp download
  downloadSong: (url, filename) => ipcRenderer.invoke('download-song', { url, filename }),

  // Invokes yt-dlp to retrieve direct stream URL for playback previews
  getYoutubeStream: (youtubeUrl) => ipcRenderer.invoke('get-youtube-stream', { youtubeUrl }),

  // Invokes file deletion from computer disk storage
  deleteSongs: (filePaths) => ipcRenderer.invoke('delete-songs', { filePaths }),

  // Progress callback updates
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (event, data) => callback(data));
  }
});
