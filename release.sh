#!/bin/bash

npm version $1
VERSION_TAG=`node -p "require('./package.json').version"`
git tag $VERSION_TAG
git push origin $VERSION_TAG
npm publish

echo "Released $VERSION_TAG"