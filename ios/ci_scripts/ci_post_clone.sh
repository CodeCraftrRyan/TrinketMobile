#!/bin/zsh
# Xcode Cloud runs this right after cloning. ios/Pods is gitignored, so the
# Pods project and its Target Support Files must be generated here; without
# this step every build fails with "Unable to open base configuration
# reference file ... Target Support Files/...xcconfig".
set -euo pipefail

export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
export HOMEBREW_NO_AUTO_UPDATE=1

brew install node
brew install cocoapods

cd "$CI_PRIMARY_REPOSITORY_PATH"
# The lockfile was resolved with legacy peer deps (see .npmrc). npm ci also
# runs postinstall, which applies the patch-package patches the iOS build needs.
npm ci

cd ios
pod install
