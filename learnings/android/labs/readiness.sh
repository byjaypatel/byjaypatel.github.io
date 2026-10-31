#!/bin/sh
# readiness.sh - print one line per check, so the guide can grade your environment.
#
#   sh readiness.sh > my-setup.txt      then paste that file into the guide's readiness page
#
# Nothing here changes the device: every command is read-only.
# Works on macOS, Linux and Windows (Git Bash). Missing tools print "missing" instead of an error.

ADB="${ADB:-adb}"
# give every adb call a ceiling - a hung adb is the single most common way this script stalls
T=""
command -v timeout >/dev/null 2>&1 && T="timeout 8"

echo "ASW generated: $(date '+%Y-%m-%d %H:%M')"

# --- host tools -------------------------------------------------------------------------------
v=$($ADB version 2>/dev/null | sed -n '1s/.*version \([0-9.]*\).*/\1/p')
echo "ASW adb: ${v:-missing}"

v=$(apktool --version 2>/dev/null | tail -1 | tr -d ' \r')
echo "ASW apktool: ${v:-missing}"

v=$(jadx --version 2>/dev/null | head -1 | tr -d '\r')
echo "ASW jadx: ${v:-missing}"

# apksigner lives in build-tools and is often not on PATH - look in the SDK, newest first
APKSIGNER=""
command -v apksigner >/dev/null 2>&1 && APKSIGNER="apksigner"
if [ -z "$APKSIGNER" ]; then
  for root in "$ANDROID_HOME" "$ANDROID_SDK_ROOT" "$HOME/Library/Android/sdk" "$HOME/Android/Sdk"; do
    [ -n "$root" ] && [ -d "$root/build-tools" ] || continue
    cand=$(ls -1d "$root"/build-tools/*/ 2>/dev/null | sort -V | tail -1)
    [ -n "$cand" ] && [ -x "$cand/apksigner" ] && { APKSIGNER="$cand/apksigner"; break; }
  done
fi
v=$([ -n "$APKSIGNER" ] && "$APKSIGNER" version 2>/dev/null | head -1 | tr -d '\r')
echo "ASW apksigner: ${v:-missing}"

v=$(java -version 2>&1 | head -1 | sed -n 's/.*version "\([^"]*\)".*/\1/p')
echo "ASW java: ${v:-missing}"

# --- device -----------------------------------------------------------------------------------
devs=$($T $ADB devices 2>/dev/null | sed '1d' | grep -v '^$')
echo "ASW devices: $(echo "$devs" | tr '\n' ';' | sed 's/;*$//')"

serial=$(echo "$devs" | awk '$2=="device"{print $1}' | head -1)
echo "ASW serial: ${serial:-none}"

if [ -n "$serial" ]; then
  echo "ASW sdk: $($T $ADB -s "$serial" shell getprop ro.build.version.sdk 2>/dev/null | tr -d '\r')"
  echo "ASW model: $($T $ADB -s "$serial" shell getprop ro.product.model 2>/dev/null | tr -d '\r')"
  pk=$($T $ADB -s "$serial" shell pm list packages 2>/dev/null | tr -d '\r')
  bz=$(echo "$pk" | grep -c 'com\.BugBazaar$')
  hp=$(echo "$pk" | grep -c 'hpandro\.android\.security$')
  echo "ASW apps: BugBazaar=$bz hpAndro=$hp"
  echo "ASW proxy: $($T $ADB -s "$serial" shell settings get global http_proxy 2>/dev/null | tr -d '\r')"
  # frida-server runs as root and usually cannot be listed without su; try both
  fr=$($T $ADB -s "$serial" shell "su -c 'ps -A 2>/dev/null || ps'" 2>/dev/null | grep -i frida-server | head -1)
  [ -z "$fr" ] && fr=$($T $ADB -s "$serial" shell "ps -A" 2>/dev/null | grep -i frida-server | head -1)
  echo "ASW frida: ${fr:-absent}"
else
  echo "ASW sdk: none"
  echo "ASW model: none"
  echo "ASW apps: BugBazaar=0 hpAndro=0"
  echo "ASW proxy: none"
  echo "ASW frida: absent"
fi

echo "ASW forward: $($ADB forward --list 2>/dev/null | awk '{print $2}' | sort -u | tr '\n' ' ' | sed 's/ *$//')"
echo "ASW end"
