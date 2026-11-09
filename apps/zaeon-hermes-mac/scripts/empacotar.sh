#!/usr/bin/env bash
# Monta o ZaeonHermes.app a partir do build release do SwiftPM, assina ad-hoc e zipa.
#
#   ./scripts/empacotar.sh                  # arquitetura da máquina (arm64 no runner macos-15)
#   UNIVERSAL=1 ./scripts/empacotar.sh      # arm64 + x86_64 (usa o XCBuild do SwiftPM)
#   VERSAO=0.2.0 ./scripts/empacotar.sh
#
# Saída: dist/ZaeonHermes.app e dist/ZaeonHermes.app.zip
# A assinatura é ad-hoc (`codesign -s -`): sem Developer ID, o Gatekeeper pede a liberação manual
# na primeira abertura (ver README).
set -euo pipefail

cd "$(dirname "$0")/.."
RAIZ="$(pwd)"
NOME="ZaeonHermes"
BUNDLE_ID="space.zaeon.hermes"
VERSAO="${VERSAO:-0.1.0}"
BUILD_NUM="${GITHUB_RUN_NUMBER:-1}"
DIST="$RAIZ/dist"
APP="$DIST/$NOME.app"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "empacotar.sh: só roda no macOS (o alvo do app é SwiftUI)." >&2
  exit 1
fi

ARGS=(-c release --product "$NOME")
if [[ "${UNIVERSAL:-0}" == "1" ]]; then
  ARGS+=(--arch arm64 --arch x86_64)
fi

echo "==> swift build ${ARGS[*]}"
swift build "${ARGS[@]}"
BIN_DIR="$(swift build "${ARGS[@]}" --show-bin-path)"
echo "==> binários em $BIN_DIR"

rm -rf "$DIST"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BIN_DIR/$NOME" "$APP/Contents/MacOS/$NOME"

# Bundles de recursos do SwiftPM (fixtures do HermesCore e o letreiro do app). Vão em Contents/Resources:
# na raiz do .app o codesign recusa ("unsealed contents present in the bundle root"). O código procura
# os dois ali antes de cair no Bundle.module (ver Fixtures.swift e Visual.swift).
shopt -s nullglob
bundles=("$BIN_DIR"/*.bundle)
if (( ${#bundles[@]} == 0 )); then
  echo "AVISO: nenhum bundle de recursos em $BIN_DIR (o DEMO e o letreiro vão faltar)." >&2
fi
for b in "${bundles[@]}"; do
  echo "    + $(basename "$b")"
  cp -R "$b" "$APP/Contents/Resources/"
done
shopt -u nullglob

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key><string>pt-BR</string>
  <key>CFBundleExecutable</key><string>$NOME</string>
  <key>CFBundleIdentifier</key><string>$BUNDLE_ID</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>CFBundleName</key><string>Zaeon</string>
  <key>CFBundleDisplayName</key><string>Zaeon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>$VERSAO</string>
  <key>CFBundleVersion</key><string>$BUILD_NUM</string>
  <key>LSMinimumSystemVersion</key><string>14.0</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.developer-tools</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSPrincipalClass</key><string>NSApplication</string>
  <key>NSHumanReadableCopyright</key><string>Zaeon · uso interno</string>
  <key>NSAppTransportSecurity</key>
  <dict>
    <!-- HTTP sem TLS só para o servidor de dev em localhost; todo o resto exige HTTPS. -->
    <key>NSExceptionDomains</key>
    <dict>
      <key>localhost</key>
      <dict>
        <key>NSExceptionAllowsInsecureHTTPLoads</key><true/>
        <key>NSIncludesSubdomains</key><false/>
      </dict>
    </dict>
  </dict>
</dict>
</plist>
PLIST
plutil -lint "$APP/Contents/Info.plist"
printf 'APPL????' > "$APP/Contents/PkgInfo"

# REQUISITO DESIGNADO FIXO. Assinatura ad-hoc sozinha amarra a identidade do app ao HASH do binário: cada
# build novo é "outro app" para o macOS, e o Keychain para de entregar a chave do console (era o 401 depois de
# atualizar). Com o requisito pelo identificador, todo build do Hermes é o MESMO app para o Keychain — e a
# atualização automática troca o binário sem pedir a chave de novo.
REQUISITO="designated => identifier \"$BUNDLE_ID\""
echo "==> codesign ad-hoc (requisito: $REQUISITO)"
if ! codesign --force --deep -s - -r="$REQUISITO" "$APP"; then
  # Alguns bundles de recursos do SwiftPM são "rasos" e o --deep tenta assiná-los como código.
  # Sem --deep eles entram selados como recursos comuns do app.
  echo "AVISO: codesign --deep falhou; assinando sem --deep." >&2
  codesign --force -s - -r="$REQUISITO" "$APP"
fi
codesign --verify --strict --verbose=2 "$APP"
codesign -dv "$APP" 2>&1 | sed 's/^/    /'
echo "==> requisito designado gravado:"
codesign -d -r- "$APP" 2>&1 | sed 's/^/    /'
codesign -d -r- "$APP" 2>&1 | grep -q "identifier \"$BUNDLE_ID\"" || { echo "ERRO: requisito designado não ficou pelo identificador" >&2; exit 1; }

echo "==> zip"
ditto -c -k --sequesterRsrc --keepParent "$APP" "$DIST/$NOME.app.zip"
ls -lh "$DIST/$NOME.app.zip"
echo "Pronto: $DIST/$NOME.app.zip"
