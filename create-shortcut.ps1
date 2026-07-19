$s = New-Object -ComObject WScript.Shell
$shortcut = $s.CreateShortcut("C:\Users\csp\Desktop\kiwi Music.lnk")
$shortcut.TargetPath = "C:\Users\csp\.gemini\antigravity\scratch\voice-music-player\dist\kiwi-music-win32-x64\kiwi-music.exe"
$shortcut.WorkingDirectory = "C:\Users\csp\.gemini\antigravity\scratch\voice-music-player\dist\kiwi-music-win32-x64"
$shortcut.Save()
Write-Output "Shortcut created successfully!"
