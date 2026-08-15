#!/usr/bin/env bash
#
# Deploy des Kodini Texteditors auf den VPS.
#
# Holt den aktuellen Stand von main, baut ihn und legt das Ergebnis nach
# /var/www/kodinitools.com/texteditor/ ab. Reine Client-App: kein Node-Prozess,
# kein PM2, kein Nginx-Reload noetig.
#
# Einmalige Einrichtung auf dem Server:
#   git clone https://github.com/KodiniTools/Text-Editor.git /opt/kodini-build/texteditor
#   chmod +x /opt/kodini-build/texteditor/deploy/deploy.sh
#
# Aufruf:
#   /opt/kodini-build/texteditor/deploy/deploy.sh          # deployen
#   /opt/kodini-build/texteditor/deploy/deploy.sh -n       # Probelauf, aendert nichts
#
# Konfigurierbar per Environment-Variable:
#   BRANCH=claude/mein-feature ./deploy/deploy.sh          # anderen Branch deployen
#   TARGET=/var/www/staging/texteditor ./deploy/deploy.sh  # anderes Zielverzeichnis
#
# Alles steckt in main(), damit ein "git reset" auf das Script selbst den
# laufenden Durchgang nicht zerreisst (bash liest Scripts sonst haeppchenweise).

set -euo pipefail

main() {
  local BRANCH="${BRANCH:-main}"
  local TARGET="${TARGET:-/var/www/kodinitools.com/texteditor}"
  local OWNER="${OWNER:-www-data:www-data}"
  local URL="${URL:-https://kodinitools.com/texteditor/}"
  # Muss zu 'base' in vite.config.ts passen -- wird nach dem Build geprueft.
  local BASE_PATH='/texteditor/'

  local dry_run=0
  case "${1:-}" in
    -n | --dry-run) dry_run=1 ;;
    -h | --help)
      sed -n '3,22p' "${BASH_SOURCE[0]}" | sed 's/^# \?//'
      return 0
      ;;
    '') ;;
    *)
      err "Unbekannte Option: $1 (siehe --help)"
      return 2
      ;;
  esac

  local script_dir repo_dir
  # readlink -f loest Symlinks auf, damit der Aufruf ueber einen Kurzbefehl in
  # /usr/local/bin trotzdem im echten Checkout landet.
  script_dir="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"
  repo_dir="$(dirname "$script_dir")"

  # --- Sicherheitsnetz: rsync --delete raeumt das Ziel leer. Ein Tippfehler
  # --- in TARGET darf nicht /var/www oder / treffen.
  case "$TARGET" in
    /var/www/*/*) ;;
    *)
      err "TARGET '$TARGET' sieht nicht nach einem Tool-Verzeichnis aus."
      err "Erwartet wird ein Pfad der Form /var/www/<site>/<tool>."
      return 1
      ;;
  esac

  require_cmd git
  require_cmd node
  require_cmd npm

  local node_major
  node_major="$(node -p 'process.versions.node.split(".")[0]')"
  if [[ "$node_major" -lt 18 ]]; then
    err "Node $(node -v) ist zu alt, Vite 5 braucht mindestens v18."
    return 1
  fi

  if [[ ! -d "$repo_dir/.git" ]]; then
    err "$repo_dir ist kein Git-Checkout."
    err "Einmalig: git clone https://github.com/KodiniTools/Text-Editor.git $repo_dir"
    return 1
  fi

  cd "$repo_dir"

  # --- 1. Quellstand holen -------------------------------------------------
  log "Hole $BRANCH von origin ..."
  git fetch --prune origin "$BRANCH"
  git checkout -q -B "$BRANCH" "origin/$BRANCH"
  # Nur getrackte Dateien zuruecksetzen; node_modules/ und dist/ sind ignoriert
  # und bleiben stehen (macht npm ci und den Build schneller).
  git reset -q --hard "origin/$BRANCH"
  git clean -qfd
  log "Stand: $(git log -1 --format='%h %s')"

  # --- 2. Bauen ------------------------------------------------------------
  log "Installiere Abhaengigkeiten (npm ci) ..."
  npm ci --no-audit --no-fund

  log "Baue (Typecheck + Vite) ..."
  npm run build

  # --- 3. Build pruefen, BEVOR das Live-Verzeichnis angefasst wird ----------
  if [[ ! -f dist/index.html ]]; then
    err "dist/index.html fehlt -- der Build hat nichts erzeugt."
    return 1
  fi
  if ! grep -q "${BASE_PATH}assets/" dist/index.html; then
    err "dist/index.html verweist nicht auf ${BASE_PATH}assets/."
    err "In vite.config.ts fehlt 'base: \"${BASE_PATH}\"' -- so gebaut bliebe"
    err "die Seite unter $URL weiss (alle Assets 404)."
    err "Live-Verzeichnis wurde nicht angefasst."
    return 1
  fi
  log "Build ok: $(find dist -type f | wc -l) Dateien, Asset-Praefix ${BASE_PATH} stimmt."

  # --- 4. Ausliefern -------------------------------------------------------
  # Erst vollstaendig in ein Staging-Verzeichnis daneben kopieren, dann per mv
  # umschwenken. Dadurch gibt es keinen Moment, in dem die neue index.html schon
  # da ist, die zugehoerigen Assets aber noch fehlen. Staging liegt bewusst im
  # selben Verzeichnis wie das Ziel -- nur dann ist mv ein atomares rename.
  local parent staging previous
  parent="$(dirname "$TARGET")"
  staging="$parent/.$(basename "$TARGET").new"
  previous="$parent/.$(basename "$TARGET").old"

  if [[ $dry_run -eq 1 ]]; then
    log "PROBELAUF -- es wird nichts geschrieben. Es wuerde nach $TARGET/ gehen:"
    (cd dist && find . -type f | sed 's|^\./|    |')
    log "Probelauf beendet."
    return 0
  fi

  local sudo_cmd=()
  [[ $EUID -ne 0 ]] && sudo_cmd=(sudo)

  log "Baue neue Version in $staging ..."
  "${sudo_cmd[@]}" rm -rf "$staging" "$previous"
  "${sudo_cmd[@]}" mkdir -p "$staging"
  "${sudo_cmd[@]}" cp -a dist/. "$staging"/

  log "Setze Besitzer/Rechte ($OWNER) ..."
  "${sudo_cmd[@]}" chown -R "$OWNER" "$staging"
  "${sudo_cmd[@]}" chmod -R u=rwX,go=rX "$staging"

  log "Schwenke um -> $TARGET"
  if [[ -d "$TARGET" ]]; then
    "${sudo_cmd[@]}" mv "$TARGET" "$previous"
  fi
  "${sudo_cmd[@]}" mv "$staging" "$TARGET"
  # Alte Version inkl. veralteter Assets erst nach dem Schwenk wegraeumen.
  "${sudo_cmd[@]}" rm -rf "$previous"

  # --- 5. Gegenprobe -------------------------------------------------------
  if command -v curl >/dev/null 2>&1; then
    local code
    code="$(curl -s -o /dev/null -w '%{http_code}' "$URL" || true)"
    if [[ "$code" == "200" ]]; then
      log "$URL antwortet mit 200. Fertig."
    else
      err "$URL antwortet mit HTTP $code (erwartet 200)."
      err "Pruefe: tail -5 /var/log/nginx/kodinitools.com.error.log"
      return 1
    fi
  else
    log "Fertig. (curl nicht vorhanden, keine Gegenprobe)"
  fi
}

log() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }
err() { printf '\033[1;31m!!!\033[0m %s\n' "$*" >&2; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    err "'$1' ist nicht installiert."
    exit 1
  }
}

main "$@"
