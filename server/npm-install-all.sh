#!/usr/bin/env bash
set -o xtrace

root="$(pwd)"

for directory in connect newSession onconnect ondisconnect reconnect shared uploadInit
do
    cd "$root/$directory"
    npm install
done