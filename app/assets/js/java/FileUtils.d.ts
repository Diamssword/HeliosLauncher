/// <reference types="node" />
import { StreamZipAsync } from 'node-stream-zip';
import tar from 'tar-fs';
export declare function calculateHashByBuffer(buf: Buffer, algo: string): string;
export declare function calculateHash(path: string, algo: string): Promise<string>;
export declare function validateLocalFile(path: string, algo: string, hash?: string): Promise<boolean>;
export declare function getVersionJsonPath(commonDir: string, version: string): string;
export declare function getVersionJarPath(commonDir: string, version: string): string;
export declare function getLibraryDir(commonDir: string): string;
export declare function extractZip(zipPath: string, peek?: (zip: StreamZipAsync) => Promise<void>): Promise<void>;
export declare function extractTarGz(tarGzPath: string, peek?: (header: tar.Headers) => void): Promise<void>;
