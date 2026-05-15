#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP_NAME="${DEEPSEEK_AGENT_APP_NAME:-DeepSeek Agent}"
BUNDLE_ID="${DEEPSEEK_AGENT_BUNDLE_ID:-app.deepseek.agent}"
VERSION="${DEEPSEEK_AGENT_VERSION:-0.1.0-alpha}"
BUILD_ROOT="${DEEPSEEK_AGENT_BUILD_ROOT:-$ROOT/build/tester-alpha}"
PACKAGE_DIR="$BUILD_ROOT/DeepSeek-Agent-alpha-macos"
APP_DIR="$PACKAGE_DIR/$APP_NAME.app"
ZIP_PATH="$BUILD_ROOT/DeepSeek-Agent-alpha-macos.zip"
SIDE_BIN="${DEEPSEEK_TUI_BIN:-$ROOT/../DeepSeek-TUI/target/debug/deepseek-tui}"
SIDE_LICENSE="${DEEPSEEK_TUI_LICENSE:-$ROOT/../DeepSeek-TUI/LICENSE}"

if [ ! -x "$SIDE_BIN" ]; then
  echo "package-blocked: DeepSeek-TUI binary is not executable at $SIDE_BIN"
  echo "Set DEEPSEEK_TUI_BIN=/absolute/path/to/deepseek-tui and rerun."
  exit 1
fi

cd "$ROOT/web"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi
npm run build
perl -0pi -e 's/<script type="module" crossorigin src=/<script defer src=/g; s/<link rel="stylesheet" crossorigin href=/<link rel="stylesheet" href=/g' "$ROOT/web/dist/index.html"

cd "$ROOT/macos"
bash Scripts/build_debug.sh

APP_EXEC="$ROOT/macos/.build/debug/DeepSeekAgentApp"
if [ ! -x "$APP_EXEC" ]; then
  echo "package-blocked: app executable missing at $APP_EXEC"
  exit 1
fi

rm -rf "$BUILD_ROOT"
mkdir -p \
  "$APP_DIR/Contents/MacOS" \
  "$APP_DIR/Contents/Resources/web" \
  "$APP_DIR/Contents/Resources/bin" \
  "$APP_DIR/Contents/Resources/licenses"

cp "$APP_EXEC" "$APP_DIR/Contents/MacOS/DeepSeekAgentApp"
chmod 755 "$APP_DIR/Contents/MacOS/DeepSeekAgentApp"

cp -R "$ROOT/web/dist/." "$APP_DIR/Contents/Resources/web/"
cp "$SIDE_BIN" "$APP_DIR/Contents/Resources/bin/deepseek-tui"
chmod 755 "$APP_DIR/Contents/Resources/bin/deepseek-tui"

if [ -f "$SIDE_LICENSE" ]; then
  cp "$SIDE_LICENSE" "$APP_DIR/Contents/Resources/licenses/DeepSeek-TUI-LICENSE.txt"
fi

SIDE_VERSION="$("$SIDE_BIN" --version 2>/dev/null || true)"
SIDE_SHA="$(shasum -a 256 "$SIDE_BIN" | awk '{print $1}')"

cat >"$APP_DIR/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleDisplayName</key>
  <string>$APP_NAME</string>
  <key>CFBundleExecutable</key>
  <string>DeepSeekAgentApp</string>
  <key>CFBundleIdentifier</key>
  <string>$BUNDLE_ID</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$APP_NAME</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>$VERSION</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSMinimumSystemVersion</key>
  <string>13.0</string>
  <key>LSBackgroundOnly</key>
  <false/>
  <key>LSUIElement</key>
  <false/>
  <key>NSPrincipalClass</key>
  <string>NSApplication</string>
  <key>NSHighResolutionCapable</key>
  <true/>
  <key>NSQuitAlwaysKeepsWindows</key>
  <false/>
</dict>
</plist>
PLIST

printf 'APPL????' >"$APP_DIR/Contents/PkgInfo"

cat >"$APP_DIR/Contents/Resources/THIRD_PARTY_NOTICES.txt" <<NOTICE
DeepSeek Agent App bundles DeepSeek-TUI as the local runtime sidecar.

DeepSeek-TUI:
- Source: https://github.com/Hmbown/DeepSeek-TUI
- Version: ${SIDE_VERSION:-unknown}
- License: MIT
- Bundled binary SHA-256: $SIDE_SHA

The bundled DeepSeek-TUI license text is included at:
Contents/Resources/licenses/DeepSeek-TUI-LICENSE.txt
NOTICE

cat >"$PACKAGE_DIR/README-TESTERS.txt" <<README
DeepSeek Agent App alpha for macOS testers

How to run:
1. Open "DeepSeek Agent.app".
2. In the left settings panel, enter your DeepSeek-compatible URL.
   Example: https://api.deepseek.com/beta, https://your-host/v1, or http://your-self-hosted-server:port/v1.
3. Enter your DeepSeek API key. It is saved to macOS Keychain.
4. Choose or type the model name, for example deepseek-v4-flash.
5. Click "Start DeepSeek".

Notes:
- The DeepSeek-TUI runtime is bundled inside the app; testers do not need to install it separately.
- HTTPS is recommended. HTTP is allowed for self-hosted or private-network endpoints, and the app shows a warning because API keys are not protected by TLS on HTTP.
- This is an unsigned/notarization-free alpha package. If macOS blocks it after download, right-click the app and choose Open, or run:
  xattr -dr com.apple.quarantine "DeepSeek Agent.app"
- The app binds the local runtime only to 127.0.0.1 and generates a fresh runtime bearer token per launch.
- API keys are not stored in files in this package.
README

(
  cd "$PACKAGE_DIR"
  shasum -a 256 \
    "$APP_NAME.app/Contents/MacOS/DeepSeekAgentApp" \
    "$APP_NAME.app/Contents/Resources/bin/deepseek-tui" \
    "$APP_NAME.app/Contents/Resources/web/index.html" \
    > CHECKSUMS.txt
)

if command -v codesign >/dev/null 2>&1; then
  codesign --force --deep --sign - "$APP_DIR" >/dev/null
fi

rm -f "$ZIP_PATH" "$ZIP_PATH.sha256"
(
  cd "$BUILD_ROOT"
  ditto -c -k --sequesterRsrc --keepParent "$(basename "$PACKAGE_DIR")" "$ZIP_PATH"
  shasum -a 256 "$ZIP_PATH" > "$ZIP_PATH.sha256"
)

echo "package-ok"
echo "package-dir=$PACKAGE_DIR"
echo "app=$APP_DIR"
echo "zip=$ZIP_PATH"
