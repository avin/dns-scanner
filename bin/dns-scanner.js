#!/usr/bin/env node

const DNSScanner = require('../src');
const fs = require('fs');
const path = require('path');
const ProgressBar = require('progress');
const program = require('commander');

const start = new Date().getTime();

program
    .usage('[options] <domains ...>')
    .option('-f, --file [value]', 'dictionary file')
    .parse(process.argv);

(async () => {
    if (!program.args.length) {
        return program.help();
    }

    for (const domain of program.args) {
        await new Promise((resolve, reject) => {
            let dictionaryFile = program.file || path.join(__dirname, '..', 'share', 'subdomains-10000.txt');
            const prefixes = fs
                .readFileSync(dictionaryFile)
                .toString()
                .split('\n');

            const target = domain;
            const scanner = new DNSScanner({
                target,
                prefixes: prefixes,
                concurrency: 100,
            });

            scanner.start();

            console.log(`[*] Scanning ${target} for A records:\n`);

            const bar = new ProgressBar('Scanning... [:bar] :percent :etas', { total: prefixes.length, clear: true });
            scanner.on('progress', () => {
                bar.tick();
            });

            scanner.on('item', ({ address, ips }) => {
                if (ips) {
                    bar.interrupt(`${address} - ${ips.toString()}`);
                }
            });

            scanner.on('done', res => {
                const end = new Date().getTime();
                const duration = ((end - start) / 1000).toFixed(2);
                console.log(`\nScanning of ${target} done! Found ${res.length} domains in ${duration} secs.\n`);

                resolve();
            });

            scanner.on('error', err => {
                reject(err);
            });
        });
    }
})();
