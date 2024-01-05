# Typescript powered by spidermonkey

Experimental SDK and build tool to build Spin apps with spidermonkey based runtime

## Installing template

```bash
spin templates install --upgrade --git https://github.com/karthik2804/spin-js 
```

## Creating and running new app

```bash
spin new -t spidermonkey-ts test-app
cd test-app
npm install
spin up --build
```