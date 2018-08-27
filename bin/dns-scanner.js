#!/usr/bin/env node

const DNSScanner = require('../src');
const fs = require('fs');
const path = require('path');
const program = require('commander');
const chalk = require('chalk');
const logUpdate = require('log-update');

program
    .usage('[options] <domains ...>')
    .option('-f, --file [value]', 'Dictionary file')
    .option('-r, --recursive', 'Recursively scan sub-domains')
    .option('-v, --verbose', 'Show scanning details info')
    .parse(process.argv);

(async () => {
    if (!program.args.length) {
        return program.help();
    }

    let domains = program.args;

    const start = new Date().getTime();

    do {
        const domain = domains.shift();

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

            const total = prefixes.length;
            let current = 0;
            let prevProgress;

            logUpdate.clear();

            scanner.on('progress', () => {
                current += 1;
                let progress = Math.round((current / total) * 100);
                if (prevProgress !== progress) {
                    logUpdate(`::: Scanning ${target}: ${progress}% :::`);
                    prevProgress = progress;
                }
            });

            scanner.on('item', ({ address, ips }) => {
                if (ips) {
                    logUpdate.clear();
                    console.log(`${chalk.bold(address)} - ${ips.toString()}`);
                }
            });

            scanner.on('done', res => {
                if (program.recursive) {
                    for (const item of res) {
                        domains.push(item.address);
                    }
                }

                logUpdate.clear();

                resolve();
            });

            scanner.on('error', err => {
                reject(err);
            });
        });
    } while (domains.length > 0);

    const end = new Date().getTime();
    const duration = ((end - start) / 1000).toFixed(2);
    if (program.verbose) {
        logUpdate.clear();
        console.log(`\n[✓] Scanning done in ${duration} seconds!`);
    }
})();
