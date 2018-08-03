# DNS Scanner

Fast brute DNS records to find subdomains.

## Features

-   Fast (20-30 seconds to scan 10000 records)

## Installation

```sh
npm install -g dns-scanner
```

## Usage:

### Usage: Command line

Usage: dns-scanner [options] <domains ...>

Example:

```sh
root@debian:~# dns-scanner -f ./dic.txt rambler.ru
```

#### Options

```
-f, --file [value]  dictionary file
-h, --help          output usage information
```

### Usage: In your code

```js
const target = 'rambler.ru';
const scanner = new DNSScanner({
    target,
    prefixes: ['www', 'mail', 'ftp', 'webmail', 'smtp', 'pop'],
    concurrency: 100,
});

scanner.start();

scanner.on('progress', ({ current, total, percent }) => {
    // on each prefix processed
});

scanner.on('item', ({ address, ips }) => {
    // on found domain-item
});

scanner.on('done', res => {
    // on end of scanning
});

scanner.on('error', res => {
    // on any errors
});
```

## License

MIT
