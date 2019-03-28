#!/usr/bin/env bash
set -o xtrace

root="$(pwd)"

for directory in fileUploaded newSession onconnect ondisconnect reconnect secondaryConnect shared uploadInitnp
do
    cd "$root/$directory"
    npm install
done