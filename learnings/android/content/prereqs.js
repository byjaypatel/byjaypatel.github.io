/* Everything a student has to install before the lab steps can work, with the command for each OS.
 *
 * Verified 2026-10-30, never guessed. Each entry records HOW it was verified:
 *   mac    - brew info --json=v2 <formula> on this machine (Homebrew 7.0.11)
 *   linux  - apt-cache policy <pkg> on Ubuntu 24.04.1 (WSL2, x86_64)
 *   sdk    - sdkmanager --list against the live Android repository
 *   pypi   - PyPI JSON API,   github - GitHub releases API,   hub - Docker Hub tags API
 * A command appears here only if the source above listed it. `ev` is the evidence string shown in the UI.
 */
window.PREREQS = {
  verifiedOn: "2026-10-30",
  tools: [
    {
      id: "adb", name: "adb (Android platform-tools)", mods: ["m0", "m1", "m2", "m3", "m4", "m5", "m6"],
      why: "Every device command in this course goes through it. Nothing else works without it.",
      check: "adb version",
      mac: ["brew install --cask android-commandlinetools", "sdkmanager --install \"platform-tools\""],
      linux: ["sudo apt install -y adb"],
      win: ["Download platform-tools zip from developer.android.com/tools/releases/platform-tools, unzip, add the folder to PATH"],
      ev: "brew: android-platform-tools 37.0.1 · apt: adb 1:34.0.4-1build3",
      link: { label: "developer.android.com/tools/adb", url: "https://developer.android.com/tools/adb" }
    },
    {
      id: "java", name: "Java 17 (JDK)", mods: ["m1", "m5"],
      why: "apktool, jadx and apksigner are all Java programs. A JRE is enough to run them, a JDK gives you keytool.",
      check: "java -version && keytool -help",
      mac: ["brew install openjdk@17", "sudo ln -sfn $(brew --prefix openjdk@17)/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk"],
      linux: ["sudo apt install -y openjdk-17-jdk"],
      win: ["Install Temurin 17 from adoptium.net"],
      ev: "brew: openjdk@17 17.0.21.0.3 · apt: openjdk-17-jdk 17.0.20.1",
      link: { label: "adoptium.net", url: "https://adoptium.net/" }
    },
    {
      id: "apktool", name: "apktool", mods: ["m1", "m5"],
      why: "Decodes an APK to smali plus real resources, and rebuilds it afterwards. Module 05 cannot exist without it.",
      check: "apktool --version",
      mac: ["brew install apktool"],
      linux: ["sudo apt install -y apktool"],
      win: ["Install from apktool.org/docs/install"],
      ev: "brew: apktool 3.0.3 · apt: apktool 2.7.0+dfsg-7",
      link: { label: "apktool.org/docs/install", url: "https://apktool.org/docs/install/" }
    },
    {
      id: "jadx", name: "jadx / jadx-gui", mods: ["m1"],
      why: "Turns dex back into readable Java. jadx-gui is the one you browse; jadx is the one you grep.",
      check: "jadx --version",
      mac: ["brew install jadx"],
      linux: ["curl -LO https://github.com/skylot/jadx/releases/download/v1.5.6/jadx-1.5.6.zip", "unzip jadx-1.5.6.zip -d ~/jadx && echo 'export PATH=$PATH:~/jadx/bin' >> ~/.bashrc"],
      win: ["Download jadx-gui-1.5.6-win.zip from the releases page"],
      ev: "brew: jadx 1.5.6 · GitHub release v1.5.6, asset jadx-1.5.6.zip (not in apt)",
      link: { label: "github.com/skylot/jadx", url: "https://github.com/skylot/jadx" }
    },
    {
      id: "buildtools", name: "Android build-tools (apksigner, zipalign, aapt2)", mods: ["m0", "m1", "m5"],
      why: "apksigner signs, zipalign fixes alignment, aapt2 dumps the manifest you read in Module 01. All three ship in build-tools.",
      check: "apksigner --version && zipalign -h 2>&1 | head -2",
      mac: ["brew install --cask android-commandlinetools", "sdkmanager --install \"build-tools;34.0.0\"", "export PATH=\"$PATH:$HOME/Library/Android/sdk/build-tools/34.0.0\""],
      linux: ["sudo apt install -y apksigner", "# zipalign and aapt2 are not packaged - use the SDK:", "sdkmanager --install \"build-tools;34.0.0\""],
      win: ["sdkmanager --install \"build-tools;34.0.0\""],
      ev: "sdkmanager --list: build-tools;34.0.0 and 35.0.0 present · apt: apksigner 31.0.2 (no zipalign/aapt2)",
      link: { label: "developer.android.com/tools/aapt2", url: "https://developer.android.com/tools/aapt2" }
    },
    {
      id: "sdk", name: "Android SDK command-line tools (sdkmanager)", mods: ["m0", "m5"],
      why: "The only supported way to install build-tools, platform-tools and emulator images.",
      check: "sdkmanager --version",
      mac: ["brew install --cask android-commandlinetools"],
      linux: ["curl -LO https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip", "unzip commandlinetools-linux-*.zip -d ~/android-sdk && mv ~/android-sdk/cmdline-tools ~/android-sdk/latest"],
      win: ["Download the Windows cmdline-tools zip from developer.android.com/studio"],
      ev: "brew: android-commandlinetools 15859902 · sdkmanager --list reachable from this machine",
      link: { label: "developer.android.com/tools", url: "https://developer.android.com/tools" }
    },
    {
      id: "frida", name: "frida client (frida-tools)", mods: ["m3"],
      why: "The client runs on your laptop and speaks to frida-server on the phone. Module 03 is written for 17.x.",
      check: "frida --version && frida-ps -H 127.0.0.1:27042",
      mac: ["pipx install frida-tools", "# or: python3 -m pip install --user frida-tools"],
      linux: ["sudo apt install -y pipx", "pipx install frida-tools"],
      win: ["python -m pip install --user frida-tools"],
      ev: "PyPI frida-tools 14.11.0 · not a Homebrew formula (checked: absent)",
      link: { label: "frida.re/docs/installation", url: "https://frida.re/docs/installation/" }
    },
    {
      id: "frida-server", name: "frida-server (the device side)", mods: ["m3"],
      why: "The binary that runs on the phone. Version must match your client exactly or the session dies on connect.",
      check: "adb shell su -c \"ls -l /data/local/tmp/fsvc\"",
      mac: ["export FRIDA_VER=17.24.3", "curl -LO \"https://github.com/frida/frida/releases/download/$FRIDA_VER/frida-server-$FRIDA_VER-android-arm64.xz\"", "xz -d frida-server-*.xz && adb push frida-server-* /data/local/tmp/fsvc"],
      linux: ["export FRIDA_VER=17.24.3", "curl -LO \"https://github.com/frida/frida/releases/download/$FRIDA_VER/frida-server-$FRIDA_VER-android-arm64.xz\"", "xz -d frida-server-*.xz && adb push frida-server-* /data/local/tmp/fsvc"],
      win: ["Same release URL; use the android-arm64.xz asset"],
      ev: "GitHub releases API: frida 17.24.3 ships frida-server-17.24.3-android-arm64.xz",
      link: { label: "github.com/frida/frida/releases", url: "https://github.com/frida/frida/releases" }
    },
    {
      id: "python", name: "Python 3 + pipx", mods: ["m3", "m6"],
      why: "frida-tools is a Python package, and MobSF's helper scripts assume Python 3.",
      check: "python3 --version && pipx --version",
      mac: ["brew install python pipx"],
      linux: ["sudo apt install -y python3 python3-pip pipx"],
      win: ["Install Python 3 from python.org, then: py -m pip install --user pipx"],
      ev: "apt: python3-pip 24.0 · pipx 1.4.3-1",
      link: { label: "pipx docs", url: "https://pipx.pypa.io/stable/" }
    },
    {
      id: "openssl", name: "openssl", mods: ["m4", "m5"],
      why: "Proves the TLS handshake through Burp and generates the lab keystore. Present on macOS and every Linux by default.",
      check: "openssl version",
      mac: ["# preinstalled - /usr/bin/openssl"],
      linux: ["sudo apt install -y openssl"],
      win: ["Ships with Git for Windows"],
      ev: "apt: openssl 3.0.13 · preinstalled on macOS",
      link: { label: "openssl.org", url: "https://www.openssl.org/" }
    },
    {
      id: "tcpdump", name: "tcpdump (host and device)", mods: ["m4"],
      why: "Module 04 captures on the phone, so the device needs a tcpdump binary - not the one on your laptop.",
      check: "tcpdump --version",
      mac: ["# preinstalled - /usr/sbin/tcpdump (host side only)"],
      linux: ["sudo apt install -y tcpdump"],
      win: ["Use Wireshark's dumpcap instead"],
      ev: "apt: tcpdump 4.99.4 · macOS preinstalled",
      link: { label: "tcpdump.org", url: "https://www.tcpdump.org/" }
    },
    {
      id: "sqlite", name: "sqlite3", mods: ["m1"],
      why: "Pulling and querying the app database. The device has it; your laptop needs it to inspect the copy.",
      check: "sqlite3 --version",
      mac: ["# preinstalled"],
      linux: ["sudo apt install -y sqlite3"],
      win: ["Download the sqlite-tools bundle from sqlite.org"],
      ev: "apt: sqlite3 3.45.1 · macOS preinstalled",
      link: { label: "sqlite.org/download", url: "https://www.sqlite.org/download.html" }
    },
    {
      id: "docker", name: "Docker", mods: ["m6"],
      why: "MobSF ships as a container. Module 06 does not run without a working Docker daemon.",
      check: "docker info",
      mac: ["brew install --cask docker", "# then open Docker.app once, so the daemon starts"],
      linux: ["sudo apt install -y docker.io", "sudo usermod -aG docker $USER"],
      win: ["Install Docker Desktop"],
      ev: "brew cask: docker-desktop 4.97.0 · apt: docker.io 29.1.3",
      link: { label: "docs.docker.com/get-docker", url: "https://docs.docker.com/get-docker/" }
    },
    {
      id: "mobsf", name: "MobSF image", mods: ["m6"],
      why: "The static analyser itself, pulled once and reused. 2 GB - check your free disk before pulling.",
      check: "docker images | grep mobile-security-framework",
      mac: ["docker pull opensecurity/mobile-security-framework-mobsf:v4.6.2"],
      linux: ["docker pull opensecurity/mobile-security-framework-mobsf:v4.6.2"],
      win: ["docker pull opensecurity/mobile-security-framework-mobsf:v4.6.2"],
      ev: "Docker Hub tags API: v4.6.2 and latest present",
      link: { label: "hub.docker.com - opensecurity/mobsf", url: "https://hub.docker.com/r/opensecurity/mobile-security-framework-mobsf" }
    },
    {
      id: "burp", name: "Burp Suite (Community is enough)", mods: ["m4"],
      why: "The proxy every HTTPS step in Module 04 goes through.",
      check: "open Burp and confirm the proxy listener on 127.0.0.1:8080",
      mac: ["brew install --cask burp-suite"],
      linux: ["# Community edition: https://portswigger.net/burp/communitydownload"],
      win: ["Install from portswigger.net/burp/releases"],
      ev: "brew cask: burp-suite 2026.10.1 · download page returns HTTP 200",
      link: { label: "portswigger.net/burp", url: "https://portswigger.net/burp" }
    },
    {
      id: "wireshark", name: "Wireshark / tshark", mods: ["m4"],
      why: "Reading the capture you took on the device. tshark is the command-line half of the same install.",
      check: "tshark --version",
      mac: ["brew install wireshark", "# GUI instead: brew install --cask wireshark"],
      linux: ["sudo apt install -y tshark", "sudo usermod -aG wireshark $USER"],
      win: ["Install from wireshark.org/download.html"],
      ev: "brew: wireshark 4.6.9 · apt: tshark 4.2.2",
      link: { label: "wireshark.org", url: "https://www.wireshark.org/" }
    },
    {
      id: "zap", name: "OWASP ZAP", mods: ["m6"],
      why: "The second automated pass, so students see two scanners disagree about the same APK.",
      check: "zap.sh -version",
      mac: ["brew install --cask zap"],
      linux: ["sudo snap install zaproxy --classic"],
      win: ["Install from zaproxy.org/download"],
      ev: "brew cask: zap 2.17.0 · snap: zaproxy present",
      link: { label: "zaproxy.org/download", url: "https://www.zaproxy.org/download/" }
    },
    {
      id: "emulator", name: "Android emulator + system image (optional)", mods: ["m0", "m3"],
      why: "Only needed if you have no physical handset. Frida's Java bridge behaves differently here - the guide says which steps were recorded on which.",
      check: "emulator -list-avds",
      mac: ["sdkmanager --install \"emulator\" \"system-images;android-34;google_apis;arm64-v8a\""],
      linux: ["sdkmanager --install \"emulator\" \"system-images;android-34;google_apis;arm64-v8a\""],
      win: ["sdkmanager --install \"emulator\" \"system-images;android-34;google_apis;arm64-v8a\""],
      ev: "sdkmanager --list: emulator 37.2.13 · system-images;android-34;google_apis;arm64-v8a present",
      link: { label: "developer.android.com/studio/run/emulator", url: "https://developer.android.com/studio/run/emulator" }
    }
  ]
};
