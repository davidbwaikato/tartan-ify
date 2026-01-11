#!/bin/bash


npm install

# ./BUILD-BUNDLE.sh

if [ ! -d ../../../web/ext/tartan-ify ] ; then
    mkdir -v ../../../web/ext/tartan-ify
fi

rsync -pav _site/{audio,css,js} ../../../web/ext/tartan-ify/.


