"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTarGz = exports.extractZip = exports.getLibraryDir = exports.getVersionJarPath = exports.getVersionJsonPath = exports.validateLocalFile = exports.calculateHash = exports.calculateHashByBuffer = void 0;
const crypto_1 = require("crypto");
const path_1 = require("path");
const fs_extra_1 = require("fs-extra");
const LoggerUtil_1 = require("./LoggerUtil");
const node_stream_zip_1 = __importDefault(require("node-stream-zip"));
const zlib_1 = require("zlib");
const tar_fs_1 = __importDefault(require("tar-fs"));
const log = LoggerUtil_1.LoggerUtil.getLogger('FileUtils');
function calculateHashByBuffer(buf, algo) {
    return (0, crypto_1.createHash)(algo).update(buf).digest('hex');
}
exports.calculateHashByBuffer = calculateHashByBuffer;
function calculateHash(path, algo) {
    return new Promise((resolve, reject) => {
        const hash = (0, crypto_1.createHash)(algo);
        const input = (0, fs_extra_1.createReadStream)(path);
        input.on('error', reject);
        input.on('data', chunk => hash.update(chunk));
        input.on('close', () => resolve(hash.digest('hex')));
    });
}
exports.calculateHash = calculateHash;
async function validateLocalFile(path, algo, hash) {
    if (await (0, fs_extra_1.pathExists)(path)) {
        if (hash == null) {
            return true;
        }
        try {
            return (await calculateHash(path, algo)) === hash;
        }
        catch (err) {
            log.error('Failed to calculate hash.', err);
        }
    }
    return false;
}
exports.validateLocalFile = validateLocalFile;
function getVersionExtPath(commonDir, version, ext) {
    return (0, path_1.join)(commonDir, 'versions', version, `${version}.${ext}`);
}
function getVersionJsonPath(commonDir, version) {
    return getVersionExtPath(commonDir, version, 'json');
}
exports.getVersionJsonPath = getVersionJsonPath;
function getVersionJarPath(commonDir, version) {
    return getVersionExtPath(commonDir, version, 'jar');
}
exports.getVersionJarPath = getVersionJarPath;
function getLibraryDir(commonDir) {
    return (0, path_1.join)(commonDir, 'libraries');
}
exports.getLibraryDir = getLibraryDir;
async function extractZip(zipPath, peek) {
    const zip = new node_stream_zip_1.default.async({
        file: zipPath,
        storeEntries: true
    });
    if (peek) {
        await peek(zip);
    }
    try {
        log.info(`Extracting ${zipPath}`);
        await zip.extract(null, (0, path_1.dirname)(zipPath));
        log.info(`Removing ${zipPath}`);
        await (0, fs_extra_1.remove)(zipPath);
        log.info('Zip extraction complete.');
    }
    catch (err) {
        log.error('Zip extraction failed', err);
    }
    finally {
        await zip.close();
    }
}
exports.extractZip = extractZip;
async function extractTarGz(tarGzPath, peek) {
    return new Promise((resolve, reject) => {
        (0, fs_extra_1.createReadStream)(tarGzPath)
            .on('error', err => log.error(err))
            .pipe((0, zlib_1.createGunzip)())
            .on('error', err => log.error(err))
            .pipe(tar_fs_1.default.extract((0, path_1.dirname)(tarGzPath), {
            map: (header) => {
                if (peek) {
                    peek(header);
                }
                return header;
            }
        }))
            .on('error', err => {
            log.error(err);
            reject(err);
        })
            .on('finish', () => {
            (0, fs_extra_1.unlink)(tarGzPath, err => {
                if (err) {
                    log.error(err);
                    reject();
                }
                else {
                    resolve();
                }
            });
        });
    });
}
exports.extractTarGz = extractTarGz;
