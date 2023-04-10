"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerUtil = void 0;
const winston_1 = require("winston");
const triple_beam_1 = require("triple-beam");
const luxon_1 = require("luxon");
const util_1 = require("util");
class LoggerUtil {
    static getLogger(label) {
        return (0, winston_1.createLogger)({
            format: winston_1.format.combine(winston_1.format.label(), winston_1.format.colorize(), winston_1.format.label({ label }), winston_1.format.printf(info => {
                if (info[triple_beam_1.SPLAT]) {
                    if (info[triple_beam_1.SPLAT].length === 1 && info[triple_beam_1.SPLAT][0] instanceof Error) {
                        const err = info[triple_beam_1.SPLAT][0];
                        if (info.message.length > err.message.length && info.message.endsWith(err.message)) {
                            info.message = info.message.substring(0, info.message.length - err.message.length);
                        }
                    }
                    else if (info[triple_beam_1.SPLAT].length > 0) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        info.message += ' ' + info[triple_beam_1.SPLAT].map((it) => {
                            if (typeof it === 'object' && it != null) {
                                return (0, util_1.inspect)(it, false, null, true);
                            }
                            return it;
                        }).join(' ');
                    }
                }
                return `[${luxon_1.DateTime.local().toFormat('yyyy-MM-dd TT').trim()}] [${info.level}] [${info.label}]: ${info.message}${info.stack ? `\n${info.stack}` : ''}`;
            })),
            level: process.env.NODE_ENV === 'test' ? 'emerg' : 'debug',
            transports: [
                new winston_1.transports.Console()
            ]
        });
    }
}
exports.LoggerUtil = LoggerUtil;
