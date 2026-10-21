#!/usr/bin/env bash
# Per-user installation. Never touches the app data directory or the host database.
set -euo pipefail
if [[ $(id -u) == 0 ]]; then
  printf '%s\n' 'ILBI’ni sudo orqali o‘rnatmang. Oddiy foydalanuvchi sifatida ishga tushiring.' >&2
  exit 1
fi
if [[ $(uname -m) != x86_64 ]]; then
  printf '%s\n' 'Ushbu ILBI paketi Linux x86_64 kompyuterlar uchun.' >&2
  exit 1
fi
source_directory=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
installation_root="${XDG_DATA_HOME:-$HOME/.local/share}/ilbi-app"
application_id=uz.ilbi.desktop
binary_directory="${ILBI_INSTALL_BIN_DIR:-$HOME/.local/bin}"
if [[ ! -x "$source_directory/ilbi" || ! -f "$source_directory/resources/ilbi-desktop.png" ]]; then
  printf '%s\n' 'Paket to‘liq emas. Arxivni yangi papkaga qayta oching.' >&2
  exit 1
fi
mkdir -p "$installation_root/releases" "$binary_directory" "${XDG_DATA_HOME:-$HOME/.local/share}/applications" "${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor/512x512/apps"
# Do not overwrite a running installation or remove its supporting resources.
if pgrep -u "$(id -u)" -f -- "$installation_root/(current|releases/[^/]+)/ilbi([[:space:]]|$)" >/dev/null; then
  printf '%s\n' 'Avval ILBI oynalarini yoping, keyin o‘rnatuvchini qayta oching.' >&2
  exit 1
fi
destination=$(mktemp -d "$installation_root/releases/build-XXXXXXXX")
trap 'rm -rf -- "$destination"' ERR
cp -a "$source_directory/." "$destination/"
chmod u+x "$destination/ilbi" "$destination/install.sh"
printf '%s\n' "$application_id" > "$destination/.ilbi-installation"
# A wrapper preserves paths with spaces and passes arguments without eval.
python_command=python3
if ! command -v "$python_command" >/dev/null; then
  python_command="$destination/resources/backend/python/bin/python3"
fi
"$python_command" - "$installation_root" "${XDG_DATA_HOME:-$HOME/.local/share}" "$binary_directory/ilbi" <<'PY'
import pathlib, shlex, sys
root, data, launcher = map(pathlib.Path, sys.argv[1:])
launcher.write_text('#!/bin/sh\nunset ELECTRON_RUN_AS_NODE\nexec ' + shlex.quote(str(root / 'current/ilbi')) + ' "$@"\n')
launcher.chmod(0o755)
def desktop_quote(value):
    return '"' + str(value).replace('\\', '\\\\').replace('"', '\\"').replace('`', '\\`').replace('$', '\\$').replace('%', '%%') + '"'
(data / 'applications/uz.ilbi.desktop.desktop').write_text(
    '[Desktop Entry]\nType=Application\nName=ILBI\nComment=ILBI offline savdo dasturi\n'
    + 'Exec=' + desktop_quote(launcher) + ' %U\n'
    + 'Icon=uz.ilbi.desktop\nTerminal=false\nCategories=Office;Finance;\nStartupWMClass=ilbi\n')
PY
cp "$destination/resources/ilbi-desktop.png" "${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor/512x512/apps/$application_id.png"
if command -v update-desktop-database >/dev/null; then update-desktop-database "${XDG_DATA_HOME:-$HOME/.local/share}/applications" || true; fi
if command -v gtk-update-icon-cache >/dev/null; then gtk-update-icon-cache -f -t "${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor" >/dev/null 2>&1 || true; fi
ln -s "$destination" "$installation_root/.current-$$"
mv -Tf "$installation_root/.current-$$" "$installation_root/current"
trap - ERR
printf '%s\n' 'ILBI o‘rnatildi. Ilovalar menyusidan ILBI’ni oching.' "Yoki: $binary_directory/ilbi"
