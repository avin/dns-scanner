const EventEmitter = require('events');
const Promise = require('bluebird');
const { Resolver } = require('dns');

class DNSScanner extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = {
            concurrency: 20,
            prefixes: ['www', 'mail', 'ftp', 'webmail', 'smtp', 'pop', 'ns1', 'ns2'],
            ...options,
        };
        if (!this.options.target) {
            throw new Error('Target should be in options');
        }
    }

    async start() {
        const { target, concurrency, prefixes } = this.options;
        try {
            // Determine NS servers
            let servers;
            let rootTarget = target;
            do {
                servers = await this._resolve(rootTarget, {
                    type: 'NS',
                });
                if (servers === null) {
                    const parts = rootTarget.split('.').splice(1);
                    if (parts.length === 0) {
                        this.emit('error', new Error('Cannot determine NS servers of domain'));
                        return;
                    }
                    rootTarget = parts.join('.');
                }
            } while (servers === null);

            // Get IPs of servers
            let serverIps = [];
            const nsServers = [];
            for (const server of servers) {
                const ips = await this._resolve(server);
                serverIps = [...serverIps, ...ips];
                nsServers.push({
                    address: server,
                    ips: ips,
                });
            }

            this.emit('ns', nsServers);

            let current = 0;
            let total = prefixes.length;
            Promise.map(
                prefixes,
                prefix => {
                    const domain = `${prefix}.${target}`;
                    current += 1;
                    this.emit('progress', {
                        current,
                        total,
                        percent: ((current / total) * 100).toFixed(2),
                    });

                    return this._resolve(domain, { servers: serverIps }).then(res => {
                        this.emit('item', {
                            address: domain,
                            ips: res,
                        });
                        return Promise.resolve(res);
                    });
                },
                { concurrency },
            ).then(res => {
                const results = [];

                res.forEach((item, idx) => {
                    if (item) {
                        results.push({
                            address: `${prefixes[idx]}.${target}`,
                            ips: item,
                        });
                    }
                });

                if (res) {
                    this.emit('done', results);
                }
            });
        } catch (e) {
            this.emit('error', e);
        }
    }

    _resolve(dnsName, options = {}) {
        options.type = options.type || 'A';
        const resolver = new Resolver();
        if (options.servers) {
            resolver.setServers(options.servers);
        }

        return new Promise(resolve => {
            resolver.resolve(dnsName, options.type, (err, addresses) => {
                if (addresses && addresses.length) {
                    return resolve(addresses);
                }

                return resolve(null);
            });
        });
    }
}

module.exports = DNSScanner;
