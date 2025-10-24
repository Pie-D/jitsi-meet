/* eslint-disable require-jsdoc */

function format(level, args) {
    const ts = new Date().toISOString();

    return [ `[${ts}]`, level, ...args ];
}

const base = {
    log: (...args) => console.log(...format('[INFO ]', args)),
    debug: (...args) => console.debug(...format('[DEBUG]', args)),
    warn: (...args) => console.warn(...format('[WARN ]', args)),
    error: (...args) => console.error(...format('[ERROR]', args))
};

function getLogger(prefix) {
    if (!prefix) {
        return base;
    }

    const p = `[${String(prefix)}]`;

    return {
        log: (...args) => base.log(p, ...args),
        debug: (...args) => base.debug(p, ...args),
        warn: (...args) => base.warn(p, ...args),
        error: (...args) => base.error(p, ...args)
    };
}

module.exports = { ...base,
    getLogger };


