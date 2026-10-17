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

# Pre-build the ExpoModulesJSI xcframework slice for device builds.
# Its CocoaPods build phase rebuilds the slice whenever its cache hash (which
# includes the absolute Pods path) doesn't match, and that nested xcodebuild
# prints "error:" lines while still exiting 0. Xcode then fails the archive with
# "Command PhaseScriptExecution emitted errors but did not return a nonzero
# exit code" (build 26). Building it here, with the same Pods path and
# toolchain, makes the in-archive phase find a matching hash and skip.
# Output is kept in the post-clone log for diagnosis; failure here is not fatal,
# because the archive's own build phase will still try.
JSI_SCRIPT="$CI_PRIMARY_REPOSITORY_PATH/node_modules/expo-modules-jsi/apple/scripts/build-xcframework.sh"
if [[ -x "$JSI_SCRIPT" ]]; then
  echo "Pre-building ExpoModulesJSI (iphoneos)…"
  PODS_ROOT="$CI_PRIMARY_REPOSITORY_PATH/ios/Pods" \
  REACT_NATIVE_PATH="$CI_PRIMARY_REPOSITORY_PATH/node_modules/react-native" \
  PLATFORM_NAME=iphoneos \
    "$JSI_SCRIPT" 2>&1 | sed 's/error:/[jsi prebuild] error-text:/g' || echo "ExpoModulesJSI pre-build failed; continuing"
fi
