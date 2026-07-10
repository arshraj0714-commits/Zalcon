// Zalcon — entry point
const _emitWarning = process.emitWarning.bind(process);
process.emitWarning = (warning, ...args) => {
    if (typeof warning === 'string' && warning.includes('ready event has been renamed to clientReady')) return;
    return _emitWarning(warning, ...args);
};

import { Bot } from '#classes/client';
import { logger } from '#utils';

const c = (r, g, b) => (t) => `\x1b[38;2;${r};${g};${b}m${t}\x1b[39m`;
const bold = (t) => `\x1b[1m${t}\x1b[22m`;
const dim  = (t) => `\x1b[2m${t}\x1b[22m`;

const banner = [
        c(52, 199, 190)  (`  ███████╗ █████╗  ██╗   ██╗ ██████╗ `),
        c(52, 199, 190)  (`  ╚══███╔╝██╔══██╗ ██║   ██║██╔═══██╗`),
        c(76, 201, 163)  (`    ███╔╝ ███████║ ██║   ██║██║   ██║`),
        c(110, 200, 230) (`   ███╔╝  ██╔══██║ ╚██╗ ██╔╝██║   ██║`),
        c(99, 179, 237)  (`  ███████╗ ██║  ██║  ╚████╔╝ ╚██████╔╝`),
        c(118, 169, 250) (`  ╚══════╝ ╚═╝  ╚═╝   ╚═══╝   ╚═════╝ `),
        ``,
        `  ${dim('Bot')}  ${bold(c(52, 199, 190)('Zalcon'))}     ${dim('Prefix')}  ${bold(c(99, 179, 237)('-'))}     ${dim('Slash')}  ${bold(c(118, 169, 250)('/'))}`,
        ``,
].join('\n');

console.log(banner);

const client = new Bot();
let isShuttingDown = false;

const shutdown = async (signal) => {
        if (isShuttingDown) return;
        isShuttingDown = true;
        logger.info('Shutdown', `Received ${signal}, shutting down gracefully`);
        try {
                await client.cleanup();
                logger.success('Shutdown', 'Bot shut down successfully');
                process.exit(0);
        } catch (error) {
                logger.error('Shutdown', 'Shutdown error:', error);
                process.exit(1);
        }
};

process.on('unhandledRejection', (reason) => {
        logger.error('Process', 'Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error, origin) => {
        logger.error('Process', `Uncaught Exception at ${origin}:`, error);
        // don't shutdown on uncaught exceptions
});

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

const main = async () => {
        try {
                await client.init();
        } catch (error) {
                logger.error('Main', 'Initialization failed:', error);
                await shutdown('initFailure');
        }
};

main();

export { client };
