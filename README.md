# tgz-get
Specifically for downloading npm offline tgz packages, it supports *.lock, *.json, packageName@*, and can be used in conjunction with verdaccio.

<p align="center">
    <a href="https://unpkg.com/tgz-get/lib/tgz.js"><img src="https://img.badgesize.io/https:/unpkg.com/tgz-get/lib/tgz.js?compression=gzip&style=flat-square" alt="Gzip Size"></a>
    <a href="https://www.npmjs.com/package/tgz-get"><img src="https://img.shields.io/npm/v/tgz-get.svg?style=flat-square&colorB=51C838" alt="NPM Version"></a>
</p>

## Demo

`cd server && yarn && yarn start`

or

`cd server && npm install && npm run start`

## Build

Support packaging into es, cjs,umd etc. 

`yarn build:es`

or 

`yarn build:umd`

## Use

Provide two APIs, `tgz` and `getCacheData`

`tgz(packageInfo,callback)` and `getCacheData()`

## Config 

The Config file creates a config.yaml format file in the root directory.

`npmUrl`: Npm proxy address, default `https://registry.npmjs.org/`    

`outDir`: File output address after downloading, default `./storage`  

`expire`: File storage validity period, default `30` days   

`compress_type`: Compression type, optional value `zip` or `tar`,default `zip`    