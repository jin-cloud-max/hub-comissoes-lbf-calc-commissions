#!/bin/bash
rm -f lambda.zip
npm install
zip -r -q lambda.zip node_modules package.json src/*.js
rm -f pnpm-lock.yaml
rm -rf node_modules
