#!/bin/bash

set -e

versions_filename=PUBLISH_VERSIONS_LIST

if [[ ! -f $versions_filename ]]; then
    echo "File with name \"$versions_filename\" does not exist"
    exit 1
fi

cat $versions_filename | while read line; do
    tokens=($line) # split string using whitespaces
    package_name=${tokens[0]}

    cd $package_name
    echo "//registry.npmjs.org/:_authToken=${NPM_ACCESS_TOKEN}" > .npmrc
    npm publish --access public
    cd ..
done
