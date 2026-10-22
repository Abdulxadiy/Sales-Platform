#!/usr/bin/env bash
# Run inside a fresh dbus-run-session; all application/keyring data is disposable.
set -euo pipefail
repository=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
package=${1:-$repository/desktop/ilbi/release-linux/ILBI-1.2.0-linux-x64.tar.gz}
test_directory=$(mktemp -d "${TMPDIR:-/tmp}/ilbi-linux-package-XXXXXXXX")
# Chromium's singleton socket must fit the Linux UNIX socket path limit. Keep
# its tiny temporary sockets in /tmp; the extracted package stays on disk.
export TMPDIR=/tmp
# Reproduce customers on Hyprland without supplying a password-store workaround.
export XDG_CURRENT_DESKTOP=Hyprland
export XDG_SESSION_DESKTOP=Hyprland
export DESKTOP_SESSION=hyprland
export XDG_CONFIG_HOME="$test_directory/config"
export XDG_DATA_HOME="$test_directory/data space"
export ILBI_INSTALL_BIN_DIR="$test_directory/bin space"
mkdir -p "$XDG_CONFIG_HOME" "$XDG_DATA_HOME" "$test_directory/unpacked space"
trap 'rm -rf -- "$test_directory"' EXIT
printf '%s' 'disposable-ilbi-keyring-test' | gnome-keyring-daemon --unlock --components=secrets
tar -xzf "$package" -C "$test_directory/unpacked space"
bash "$test_directory/unpacked space/ILBI/install.sh"
desktop-file-validate "$XDG_DATA_HOME/applications/uz.ilbi.desktop.desktop"
export ILBI_DESKTOP_TEST_RESOURCES="$XDG_DATA_HOME/ilbi-app/current/resources"
export ILBI_DESKTOP_INSTALLED_EXE="$ILBI_INSTALL_BIN_DIR/ilbi"
export ILBI_LINUX_INSTALLER="$test_directory/unpacked space/ILBI/install.sh"
node --test "$repository/desktop/ilbi/tests/linux-host.test.cjs" "$repository/desktop/ilbi/tests/offline-security-native.test.cjs" "$repository/desktop/ilbi/tests/windows-ui.test.cjs"
test -s "$XDG_CONFIG_HOME/ILBI/device.vault"
vault_before=$(sha256sum "$XDG_CONFIG_HOME/ILBI/device.vault")
bash "$test_directory/unpacked space/ILBI/install.sh"
test "$vault_before" = "$(sha256sum "$XDG_CONFIG_HOME/ILBI/device.vault")"
# Relaunch after update: decrypt the existing vault and restart its saved cluster.
node "$repository/desktop/ilbi/tests/linux-relaunch.cjs"
export ILBI_DESKTOP_UPDATE_PACKAGE="$package"
node "$repository/desktop/ilbi/tests/update-acceptance.cjs"
printf '%s\n' 'Installed Linux application, encrypted setup, update and restart verified.'
