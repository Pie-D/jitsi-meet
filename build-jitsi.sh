#!/bin/bash

set -e

echo "=== Bước 1: Cài dependencies cho jitsi-meet ==="
cd ~/jitsi-meet-build/jitsi-meet
npm install

echo "=== Bước 2: Link lib-jitsi-meet local ==="
sudo rm -rf ~/jitsi-meet-build/jitsi-meet/node_modules/lib-jitsi-meet
ln -sfn ~/jitsi-meet-build/lib-jitsi-meet ~/jitsi-meet-build/jitsi-meet/node_modules/lib-jitsi-meet

echo "=== Bước 3: Build lib-jitsi-meet ==="
cd ~/jitsi-meet-build/lib-jitsi-meet
npm update
npm run build

echo "=== Bước 4: Build jitsi-meet ==="
cd ~/jitsi-meet-build/jitsi-meet
make

echo "=== Bước 5: Build package DEB ==="
dpkg-buildpackage -A -rfakeroot -us -uc -tc

echo "=== Hoàn thành ==="