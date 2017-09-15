#!/bin/bash

set -euo pipefail

npm config set sign-git-tag true
npm version $1
VERSION_TAG=`node -p "require('./package.json').version"`
git tag -s $VERSION_TAG
git push origin $VERSION_TAG
npm publish

echo "Released $VERSION_TAG"