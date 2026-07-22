import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:just_audio/just_audio.dart';
import 'package:on_audio_query/on_audio_query.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:provider/provider.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    ChangeNotifierProvider(
      create: (_) => KiwiMusicProvider()..init(),
      child: const KiwiMusicApp(),
    ),
  );
}

class KiwiMusicApp extends StatelessWidget {
  const KiwiMusicApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'kiwi Music',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF080A10),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF00F2FE),
          secondary: Color(0xFFF35588),
          surface: Color(0xFF101424),
        ),
        useMaterial3: true,
      ),
      home: const MainHomeScreen(),
    );
  }
}

// ----------------------------------------------------
// Models
// ----------------------------------------------------
class LocalTrack {
  final String id;
  final String title;
  final String artist;
  final String uri;
  final String category; // 'music' or 'speech'
  final int size;
  final String folder;

  LocalTrack({
    required this.id,
    required this.title,
    required this.artist,
    required this.uri,
    required this.category,
    required this.size,
    required this.folder,
  });
}

class SearchResultItem {
  final String title;
  final String url;
  final String source;
  final String filename;

  SearchResultItem({
    required this.title,
    required this.url,
    required this.source,
    required this.filename,
  });
}

// ----------------------------------------------------
// State Management & Audio Controller
// ----------------------------------------------------
class KiwiMusicProvider extends ChangeNotifier {
  final OnAudioQuery _audioQuery = OnAudioQuery();
  final AudioPlayer _player = AudioPlayer();

  List<LocalTrack> _tracks = [];
  List<LocalTrack> _queue = [];
  String _category = 'music'; // 'music' or 'speech'
  String _searchQuery = '';
  int _currentIndex = -1;

  bool _isPlaying = false;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;
  bool _isLoading = false;

  // Online Downloader state
  List<SearchResultItem> _searchResults = [];
  bool _isSearchingOnline = false;
  Map<String, double> _downloadProgress = {};

  // Getters
  List<LocalTrack> get tracks => _tracks;
  List<LocalTrack> get queue => _queue;
  String get category => _category;
  int get currentIndex => _currentIndex;
  bool get isPlaying => _isPlaying;
  Duration get position => _position;
  Duration get duration => _duration;
  bool get isLoading => _isLoading;
  List<SearchResultItem> get searchResults => _searchResults;
  bool get isSearchingOnline => _isSearchingOnline;
  Map<String, double> get downloadProgress => _downloadProgress;

  LocalTrack? get currentTrack =>
      (_currentIndex >= 0 && _currentIndex < _tracks.length)
          ? _tracks[_currentIndex]
          : null;

  void init() {
    _player.playerStateStream.listen((state) {
      _isPlaying = state.playing;
      if (state.processingState == ProcessingState.completed) {
        playNext();
      }
      notifyListeners();
    });

    _player.positionStream.listen((pos) {
      _position = pos;
      notifyListeners();
    });

    _player.durationStream.listen((dur) {
      _duration = dur ?? Duration.zero;
      notifyListeners();
    });

    scanDeviceAudio();
  }

  // Scan Native Android MediaStore
  Future<void> scanDeviceAudio() async {
    _isLoading = true;
    notifyListeners();

    try {
      if (Platform.isAndroid) {
        var status = await Permission.storage.request();
        var audioStatus = await Permission.audio.request();
        if (!status.isGranted && !audioStatus.isGranted) {
          await Permission.manageExternalStorage.request();
        }
      }

      List<SongModel> songs = await _audioQuery.querySongs(
        sortType: null,
        orderType: OrderType.ASC_OR_SMALLER,
        uriType: UriType.EXTERNAL,
        ignoreCase: true,
      );

      List<LocalTrack> temp = [];
      for (var s in songs) {
        String cleanTitle = cleanMetadata(s.title);
        String cleanArtist = (s.artist == '<unknown>') ? 'Local Audio' : cleanMetadata(s.artist ?? '');
        String category = classifyAudio(s.title);

        temp.add(LocalTrack(
          id: s.id.toString(),
          title: cleanTitle.isEmpty ? s.title : cleanTitle,
          artist: cleanArtist.isEmpty ? 'Local Audio' : cleanArtist,
          uri: s.data,
          category: category,
          size: s.size,
          folder: s.displayName.split('.').last,
        ));
      }

      _tracks = temp;
    } catch (e) {
      debugPrint('Scan device audio failed: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  // Clean metadata titles & artists
  String cleanMetadata(String input) {
    return input
        .replaceAll(RegExp(r'\[isongs\.info\]', caseSensitive: false), '')
        .replaceAll(RegExp(r'\[djpunjab\S*\]', caseSensitive: false), '')
        .replaceAll(RegExp(r'djpunjab\S*', caseSensitive: false), '')
        .replaceAll(RegExp(r'\(pagalworld\S*\)', caseSensitive: false), '')
        .replaceAll(RegExp(r'_compressed', caseSensitive: false), '')
        .replaceAll(RegExp(r'^\(Audio\)\s*', caseSensitive: false), '')
        .replaceAll(RegExp(r'^\d+\s*-\s*'), '')
        .replaceAll(RegExp(r'\b(128kbps|320kbps|64kbps|kbps)\b', caseSensitive: false), '')
        .replaceAll(RegExp(r'[\(\)\[\]]'), ' ')
        .replaceAll('_', ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  String classifyAudio(String title) {
    String lower = title.toLowerCase();
    List<String> keywords = [
      'meeting', 'zoom', 'call', 'lecture', 'recording', 'voice', 'speech',
      'interview', 'audio note', 'whatsapp', 'lesson', 'podcast', 'audiobook'
    ];
    for (var k in keywords) {
      if (lower.contains(k)) return 'speech';
    }
    return 'music';
  }

  List<LocalTrack> get filteredTracks {
    List<LocalTrack> catFiltered = _tracks.where((t) => t.category == _category).toList();
    if (_searchQuery.isEmpty) return catFiltered;

    String query = _searchQuery.toLowerCase().trim();
    return catFiltered.where((t) {
      return t.title.toLowerCase().contains(query) ||
             t.artist.toLowerCase().contains(query);
    }).toList();
  }

  void setCategory(String cat) {
    _category = cat;
    notifyListeners();
  }

  void setSearchQuery(String q) {
    _searchQuery = q;
    notifyListeners();
  }

  // Playback Operations
  Future<void> playTrack(int index) async {
    if (index < 0 || index >= _tracks.length) return;
    _currentIndex = index;
    var track = _tracks[_currentIndex];

    try {
      await _player.setFilePath(track.uri);
      _player.play();
      _isPlaying = true;
    } catch (e) {
      debugPrint('Playback error: $e');
    }
    notifyListeners();
  }

  void togglePlay() {
    if (_isPlaying) {
      _player.pause();
    } else {
      if (_currentIndex == -1 && _tracks.isNotEmpty) {
        playTrack(0);
        return;
      }
      _player.play();
    }
    _isPlaying = !_isPlaying;
    notifyListeners();
  }

  void playNext() {
    if (_queue.isNotEmpty) {
      var nextTrack = _queue.removeAt(0);
      int idx = _tracks.indexWhere((t) => t.id == nextTrack.id);
      if (idx != -1) {
        playTrack(idx);
        return;
      }
    }
    if (_tracks.isEmpty) return;
    int next = _currentIndex + 1;
    if (next >= _tracks.length) next = 0;
    playTrack(next);
  }

  void playPrevious() {
    if (_tracks.isEmpty) return;
    int prev = _currentIndex - 1;
    if (prev < 0) prev = _tracks.length - 1;
    playTrack(prev);
  }

  void seek(Duration pos) {
    _player.seek(pos);
  }

  void addToQueue(LocalTrack track) {
    _queue.add(track);
    notifyListeners();
  }

  void removeFromQueue(int index) {
    if (index >= 0 && index < _queue.length) {
      _queue.removeAt(index);
      notifyListeners();
    }
  }

  void clearQueue() {
    _queue.clear();
    notifyListeners();
  }

  // Online Crawler & Search Engine (Yahoo + Cobalt API)
  Future<void> searchOnline(String songName, String language) async {
    _isSearchingOnline = true;
    _searchResults = [];
    notifyListeners();

    try {
      String query = '$songName $language site:youtube.com';
      String yahooUrl = 'https://search.yahoo.com/search?p=${Uri.encodeComponent(query)}';
      
      var res = await http.get(
        Uri.parse(yahooUrl),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
      );

      if (res.statusCode == 200) {
        String html = res.body;
        RegExp hrefRegex = RegExp(r'href="([^"]*r\.search\.yahoo\.com[^"]*RU=([^"]+))"', caseSensitive: false);
        var matches = hrefRegex.allMatches(html);
        List<SearchResultItem> temp = [];

        for (var m in matches) {
          try {
            String fullHref = m.group(1) ?? '';
            var parts = fullHref.split('RU=');
            if (parts.length > 1) {
              String actualUrl = Uri.decodeComponent(parts[1].split('/RK=')[0]);
              if (actualUrl.contains('youtube.com/watch') || actualUrl.contains('youtu.be/')) {
                if (!temp.any((item) => item.url == actualUrl)) {
                  temp.add(SearchResultItem(
                    title: cleanMetadata(songName),
                    url: actualUrl,
                    source: 'YouTube Mirror',
                    filename: '${songName.replaceAll(RegExp(r'[\\/:*?"<>|]'), '_')}.mp3',
                  ));
                }
              }
            }
          } catch (_) {}
        }
        _searchResults = temp;
      }
    } catch (e) {
      debugPrint('Online search failed: $e');
    }

    _isSearchingOnline = false;
    notifyListeners();
  }

  // Download Audio Stream directly to Android Downloads folder
  Future<void> downloadSong(SearchResultItem item) async {
    _downloadProgress[item.url] = 0.1;
    notifyListeners();

    try {
      // 1. Fetch Cobalt Direct Stream URL
      var cobaltRes = await http.post(
        Uri.parse('https://api.cobalt.tools/'),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'url': item.url,
          'audioOnly': true,
          'aFormat': 'mp3',
        }),
      );

      if (cobaltRes.statusCode == 200) {
        var json = jsonDecode(cobaltRes.body);
        String streamUrl = json['url'];

        _downloadProgress[item.url] = 0.5;
        notifyListeners();

        // 2. Download binary to native Downloads folder
        Directory? dir = await getExternalStorageDirectory();
        if (dir != null) {
          String targetPath = '${dir.path}/${item.filename}';
          var audioRes = await http.get(Uri.parse(streamUrl));
          File file = File(targetPath);
          await file.writeAsBytes(audioRes.bodyBytes);

          _downloadProgress[item.url] = 1.0;
          notifyListeners();

          // Rescan library automatically
          scanDeviceAudio();
        }
      }
    } catch (e) {
      debugPrint('Download error: $e');
      _downloadProgress[item.url] = -1.0; // Error indicator
      notifyListeners();
    }
  }
}

// ----------------------------------------------------
// UI Views
// ----------------------------------------------------
class MainHomeScreen extends StatefulWidget {
  const MainHomeScreen({super.key});

  @override
  State<MainHomeScreen> createState() => _MainHomeScreenState();
}

class _MainHomeScreenState extends State<MainHomeScreen> {
  int _currentTab = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          IndexedStack(
            index: _currentTab,
            children: const [
              LibraryTab(),
              QueueTab(),
              DownloaderTab(),
            ],
          ),
          const Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: PersistentPlayerDrawer(),
          ),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentTab,
        onTap: (idx) => setState(() => _currentTab = idx),
        backgroundColor: const Color(0xFF0A0C16),
        selectedItemColor: const Color(0xFF00F2FE),
        unselectedItemColor: Colors.grey,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.library_music), label: 'Library'),
          BottomNavigationBarItem(icon: Icon(Icons.queue_music), label: 'Queue'),
          BottomNavigationBarItem(icon: Icon(Icons.cloud_download), label: 'Downloader'),
        ],
      ),
    );
  }
}

// Library Tab
class LibraryTab extends StatelessWidget {
  const LibraryTab({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<KiwiMusicProvider>(context);

    return SafeArea(
      child: Column(
        children: [
          // Header Bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('kiwi Music', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
                    Text('${provider.filteredTracks.length} Audio Files', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                  ],
                ),
                ElevatedButton.icon(
                  onPressed: () => provider.scanDeviceAudio(),
                  icon: const Icon(Icons.sync, size: 16),
                  label: const Text('Rescan Folders'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF101424),
                    foregroundColor: const Color(0xFF00F2FE),
                  ),
                ),
              ],
            ),
          ),
          // Category Switcher
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: Row(
              children: [
                ChoiceChip(
                  label: const Text('Music Audio'),
                  selected: provider.category == 'music',
                  onSelected: (_) => provider.setCategory('music'),
                ),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: const Text('Spoken Audio'),
                  selected: provider.category == 'speech',
                  onSelected: (_) => provider.setCategory('speech'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          // Search Input
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: TextField(
              onChanged: (val) => provider.setSearchQuery(val),
              decoration: InputDecoration(
                hintText: 'Search songs or artists...',
                prefixIcon: const Icon(Icons.search, color: Colors.grey),
                filled: true,
                fillColor: const Color(0xFF101424),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
          ),
          const SizedBox(height: 8),
          // Tracks List View
          Expanded(
            child: provider.isLoading
                ? const Center(child: CircularProgressIndicator())
                : provider.filteredTracks.isEmpty
                    ? const Center(child: Text('No audio files found.'))
                    : ListView.builder(
                        itemCount: provider.filteredTracks.length,
                        itemBuilder: (ctx, i) {
                          var track = provider.filteredTracks[i];
                          bool isCurrent = provider.currentTrack?.id == track.id;
                          return ListTile(
                            leading: CircleAvatar(
                              backgroundColor: isCurrent ? const Color(0xFF00F2FE) : const Color(0xFF101424),
                              child: Icon(
                                isCurrent && provider.isPlaying ? Icons.pause : Icons.play_arrow,
                                color: isCurrent ? Colors.black : Colors.white,
                              ),
                            ),
                            title: Text(track.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: isCurrent ? const Color(0xFF00F2FE) : Colors.white, fontWeight: FontWeight.bold)),
                            subtitle: Text(track.artist, maxLines: 1, overflow: TextOverflow.ellipsis),
                            trailing: IconButton(
                              icon: const Icon(Icons.add),
                              onPressed: () => provider.addToQueue(track),
                            ),
                            onTap: () => provider.playTrack(i),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}

// Queue Tab
class QueueTab extends StatelessWidget {
  const QueueTab({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<KiwiMusicProvider>(context);

    return SafeArea(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('${provider.queue.length} Songs in Queue', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                if (provider.queue.isNotEmpty)
                  TextButton(onPressed: () => provider.clearQueue(), child: const Text('Clear Queue', style: TextStyle(color: Color(0xFFF35588)))),
              ],
            ),
          ),
          Expanded(
            child: provider.queue.isEmpty
                ? const Center(child: Text('Queue is empty.'))
                : ListView.builder(
                    itemCount: provider.queue.length,
                    itemBuilder: (ctx, i) {
                      var track = provider.queue[i];
                      return ListTile(
                        title: Text(track.title, maxLines: 1),
                        subtitle: Text(track.artist),
                        trailing: IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => provider.removeFromQueue(i),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

// Downloader Tab
class DownloaderTab extends StatefulWidget {
  const DownloaderTab({super.key});

  @override
  State<DownloaderTab> createState() => _DownloaderTabState();
}

class _DownloaderTabState extends State<DownloaderTab> {
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _langController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<KiwiMusicProvider>(context);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            const Text('Online Downloader & Crawler', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            TextField(
              controller: _titleController,
              decoration: const InputDecoration(hintText: 'Enter song title or lyrics...'),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _langController,
              decoration: const InputDecoration(hintText: 'Language (e.g. Hindi, Telugu, English)...'),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => provider.searchOnline(_titleController.text, _langController.text),
                icon: const Icon(Icons.search),
                label: const Text('Crawl Online Links'),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF00F2FE), foregroundColor: Colors.black),
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: provider.isSearchingOnline
                  ? const Center(child: CircularProgressIndicator())
                  : ListView.builder(
                      itemCount: provider.searchResults.length,
                      itemBuilder: (ctx, i) {
                        var item = provider.searchResults[i];
                        double progress = provider.downloadProgress[item.url] ?? 0.0;
                        return Card(
                          color: const Color(0xFF101424),
                          child: ListTile(
                            title: Text(item.title, maxLines: 1),
                            subtitle: Text(item.url, maxLines: 1, style: const TextStyle(fontSize: 10, color: Colors.grey)),
                            trailing: progress == 1.0
                                ? const Icon(Icons.check_circle, color: Colors.green)
                                : progress > 0.0
                                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                                    : IconButton(
                                        icon: const Icon(Icons.download, color: Color(0xFF00F2FE)),
                                        onPressed: () => provider.downloadSong(item),
                                      ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

// Persistent Bottom Player Drawer
class PersistentPlayerDrawer extends StatelessWidget {
  const PersistentPlayerDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<KiwiMusicProvider>(context);
    final track = provider.currentTrack;

    if (track == null) return const SizedBox.shrink();

    double progressPct = 0.0;
    if (provider.duration.inMilliseconds > 0) {
      progressPct = provider.position.inMilliseconds / provider.duration.inMilliseconds;
    }

    return Container(
      height: 72,
      margin: const EdgeInsets.only(bottom: 56),
      decoration: const BoxDecoration(
        color: Color(0xFF0A0C16),
        border: Border(top: BorderSide(color: Colors.white10)),
      ),
      child: Column(
        children: [
          // Thin Seek Bar
          LinearProgressIndicator(
            value: progressPct.clamp(0.0, 1.0),
            backgroundColor: Colors.white12,
            valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF00F2FE)),
            minHeight: 3,
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: Row(
              children: [
                const Icon(Icons.music_note, color: Color(0xFF00F2FE)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(track.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      Text(track.artist, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                    ],
                  ),
                ),
                IconButton(icon: const Icon(Icons.skip_previous), onPressed: () => provider.playPrevious()),
                IconButton(
                  icon: Icon(provider.isPlaying ? Icons.pause : Icons.play_arrow),
                  onPressed: () => provider.togglePlay(),
                ),
                IconButton(icon: const Icon(Icons.skip_next), onPressed: () => provider.playNext()),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
