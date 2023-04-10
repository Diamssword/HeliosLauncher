import { JdkDistribution } from 'helios-distribution-types';
import { LauncherJson } from '../model/mojang/LauncherJson';
import { Asset } from '../dl';
export interface JavaVersion {
    major: number;
    minor: number;
    patch: number;
    build?: number;
}
export interface AdoptiumJdk {
    binary: {
        architecture: string;
        download_count: number;
        heap_size: string;
        image_type: 'jdk' | 'debugimage' | 'testimage';
        jvm_impl: string;
        os: string;
        package: {
            checksum: string;
            checksum_link: string;
            download_count: number;
            link: string;
            metadata_link: string;
            name: string;
            size: number;
        };
        project: string;
        scm_ref: string;
        updated_at: string;
    };
    release_name: string;
    vendor: string;
    version: {
        build: number;
        major: number;
        minor: number;
        openjdk_version: string;
        security: number;
        semver: string;
    };
}
/**
 * HotSpot Properties
 *
 * Obtained via java -XshowSettings:properties -version
 *
 * https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/System.html#getProperties()
 * https://docs.oracle.com/javase/tutorial/essential/environment/sysprop.html
 * https://docs.oracle.com/javame/config/cdc/cdc-opt-impl/ojmeec/1.1/architecture/html/properties.htm
 */
export interface HotSpotSettings {
    /**
     * Character encoding for the default locale.
     */
    'file.encoding': string;
    /**
     * Character that separates components of a file path. This is "/" on UNIX and "\" on Windows.
     */
    'file.separator': string;
    /**
     * Path used to find directories and JAR archives containing class files. Elements of the class path are separated by a platform-specific character specified in the path.separator property.
     * This will be blank on -XshowSettings for obvious reasons.
     */
    'java.class.path': string;
    /**
     * Java class format version number.
     * Read as string, actually a number.
     */
    'java.class.version': string;
    /**
     * Java installation directory (in 8, the path to the bundled JRE if using the JDK).
     */
    'java.home': string;
    /**
     * Default temp file path.
     */
    'java.io.tmpdir': string;
    /**
     * List of paths to search when loading libraries.
     */
    'java.library.path': string[];
    /**
     * Runtime Name *Undocumented*
     * https://github.com/openjdk/jdk/blob/master/src/java.base/share/classes/java/lang/VersionProps.java.template#L105
     */
    'java.runtime.name': string;
    /**
     * Runtime Version *Undocumented*
     * https://github.com/openjdk/jdk/blob/master/src/java.base/share/classes/java/lang/VersionProps.java.template#L104
     * Ex. 17: 17.0.5+8; 8: 1.8.0_352-b08
     */
    'java.runtime.version': string;
    /**
     * Undefined for the initial release. Indicates the runtime implements a revised version of the specification.
     * https://bugs.openjdk.org/browse/JDK-8286766
     */
    'java.specification.maintenance.version'?: string;
    /**
     * Java Runtime Environment specification name.
     */
    'java.specification.name': string;
    /**
     * Java Runtime Environment specification vendor.
     */
    'java.specification.vendor': string;
    /**
     * Java Runtime Environment specification version, whose value is the feature element of the runtime version
     *
     * Ex. 17: 17; 8: 1.8
     */
    'java.specification.version': string;
    /**
     * Java Runtime Environment vendor
     */
    'java.vendor': string;
    /**
     * Java vendor URL
     */
    'java.vendor.url': string;
    /**
     * Java vendor bug report URL *Undocumented* (but standard)
     */
    'java.vendor.url.bug': string;
    /**
     * Java vendor version (optional)
     * JDK 10+
     * https://openjdk.org/jeps/322
     */
    'java.vendor.version'?: string;
    /**
     * Java Runtime Environment version
     * Ex. 17: 17.0.5; 8: 1.8.0_352
     */
    'java.version': string;
    /**
     * Java Runtime Environment version date, in ISO-8601 YYYY-MM-DD format.
     * JDK 10+
     * https://openjdk.org/jeps/322
     */
    'java.version.date'?: string;
    /**
     * Internal flag, Compressed Oop Mode the VM is running in (for JDK internal tests).
     * JDK 9+
     * https://bugs.openjdk.org/browse/JDK-8064457
     */
    'java.vm.compressedOopsMode'?: string;
    /**
     * No summary information available, part of the JDK for a very long time.
     */
    'java.vm.info': string;
    /**
     * Java Virtual Machine implementation name.
     */
    'java.vm.name': string;
    /**
     * 	Java Runtime Environment specification name.
     */
    'java.vm.specification.name': string;
    /**
     * Java Runtime Environment specification vendor.
     */
    'java.vm.specification.vendor': string;
    /**
     * Java Virtual Machine specification version, whose value is the feature element of the runtime version.
     *
     * Ex. 17: 17; 8: 1.8
     */
    'java.vm.specification.version': string;
    /**
     * Java Virtual Machine implementation vendor.
     */
    'java.vm.vendor': string;
    /**
     * Java Virtual Machine implementation version.
     * Ex. 17: 17.0.5+8; 8: 25.352-b08
     */
    'java.vm.version': string;
    /**
     * Probably an internal flag, don't use. On 17, not 8.
     */
    'jdk.debug'?: string;
    /**
     * Line separator ("\n" on UNIX, "\r \n" on Windows)
     */
    'line.separator': string;
    /**
     * Character encoding name derived from the host environment and/or the user's settings. Setting this system property has no effect.
     * https://openjdk.org/jeps/400
     * JDK 17+
     */
    'native.encoding'?: string;
    /**
     * Operating system architecture.
     */
    'os.arch': string;
    /**
     * Operating system name.
     */
    'os.name': string;
    /**
     * Operating system version.
     * Looks like this can be parsed as a number.
     */
    'os.version': string;
    /**
     * 	Path separator (":" on UNIX, ";" on Windows)
     */
    'path.separator': string;
    /**
     * Platform word size. Examples: "32", "64", "unknown"
     */
    'sun.arch.data.model': string;
    /**
     * From here, the VM loads VM libraries (like those related to JVMTI) and any libraries needed for classes on the bootclasspath. Read-only property.
     */
    'sun.boot.library.path': string;
    /**
     * Endianess of CPU, "little" or "big".
     */
    'sun.cpu.endian': string;
    /**
     * The names of the native instruction sets executable on this platform.
     */
    'sun.cpu.isalist': string;
    /**
     * Platform-specific, follows sun.cpu.endian, for example "UnicodeLittle".
     */
    'sun.io.unicode.encoding': string;
    /**
     * Internal, used to determine if java process came from a known launcher.
     * Ex. https://github.com/openjdk/jdk/blob/master/src/java.desktop/windows/classes/sun/java2d/windows/WindowsFlags.java#L86
     */
    'sun.java.launcher': string;
    /**
     * Encoding used to interpret platform strings.
     * https://happygiraffe.net/2009/09/24/java-platform-encoding/
     */
    'sun.jnu.encoding': string;
    /**
     * Tiered, client, or server
     * https://stackoverflow.com/questions/14818584/which-java-hotspot-jit-compiler-is-running
     */
    'sun.management.compiler': string;
    /**
     * Internal
     */
    'sun.os.patch.level': string;
    /**
     * Internal
     */
    'sun.stderr.encoding': string;
    /**
     * Internal
     */
    'sun.stdout.encoding': string;
    /**
     * Country (system dependent).
     */
    'user.country': string;
    /**
     * User's current working directory.
     */
    'user.dir': string;
    /**
     * 	User's home directory.
     */
    'user.home': string;
    /**
     * Two-letter language code of the default locale (system dependent).
     */
    'user.language': string;
    /**
     * User's account name.
     */
    'user.name': string;
    /**
     * User specified script.
     * https://bugs.openjdk.org/browse/JDK-6990452
     */
    'user.script': string;
    /**
     * Variant (more specific than country and language).
     */
    'user.variant': string;
}
/**
 * Get the target JDK's properties. Only HotSpot VMs are officially
 * supported, as properties may change between VMs. Usage of internal
 * properties should be avoided.
 *
 * @param execPath The path to the Java executable.
 * @returns The parsed HotSpot VM properties.
 */
export declare function getHotSpotSettings(execPath: string): Promise<HotSpotSettings>;
export declare function resolveJvmSettings(paths: string[]): Promise<{
    [path: string]: HotSpotSettings;
}>;
export interface JvmDetails {
    semver: JavaVersion;
    semverStr: string;
    vendor: string;
    path: string;
}
export declare function filterApplicableJavaPaths(resolvedSettings: {
    [path: string]: HotSpotSettings;
}, semverRange: string): JvmDetails[];
export declare function rankApplicableJvms(details: JvmDetails[]): void;
export declare function discoverBestJvmInstallation(dataDir: string, semverRange: string): Promise<JvmDetails | null>;
export declare function validateSelectedJvm(path: string, semverRange: string): Promise<JvmDetails | null>;
/**
 * Fetch the last open JDK binary.
 *
 * HOTFIX: Uses Corretto 8 for macOS.
 * See: https://github.com/dscalzi/HeliosLauncher/issues/70
 * See: https://github.com/AdoptOpenJDK/openjdk-support/issues/101
 *
 * @param {number} major The major version of Java to fetch.
 *
 * @returns {Promise.<RemoteJdkDistribution | null>} Promise which resolved to an object containing the JDK download data.
 */
export declare function latestOpenJDK(major: number, dataDir: string, distribution?: JdkDistribution): Promise<Asset | null>;
export declare function latestAdoptium(major: number, dataDir: string): Promise<Asset | null>;
export declare function latestCorretto(major: number, dataDir: string): Promise<Asset | null>;
export declare function extractJdk(archivePath: string): Promise<string>;
/**
 * Returns the path of the OS-specific executable for the given Java
 * installation. Supported OS's are win32, darwin, linux.
 *
 * @param {string} rootDir The root directory of the Java installation.
 * @returns {string} The path to the Java executable.
 */
export declare function javaExecFromRoot(rootDir: string): string;
/**
 * Given a Java path, ensure it points to the root.
 *
 * @param dir The untested path.
 * @returns The root java path.
 */
export declare function ensureJavaDirIsRoot(dir: string): string;
/**
 * Check to see if the given path points to a Java executable.
 *
 * @param {string} pth The path to check against.
 * @returns {boolean} True if the path points to a Java executable, otherwise false.
 */
export declare function isJavaExecPath(pth: string): boolean;
/**
 * Load Mojang's launcher.json file.
 *
 * @returns {Promise.<Object>} Promise which resolves to Mojang's launcher.json object.
 */
export declare function loadMojangLauncherData(): Promise<LauncherJson | null>;
/**
 * Parses a full Java Runtime version string and resolves
 * the version information. Dynamically detects the formatting
 * to use.
 *
 * @param {string} verString Full version string to parse.
 * @returns Object containing the version information.
 */
export declare function parseJavaRuntimeVersion(verString: string): JavaVersion;
/**
 * Parses a full Java Runtime version string and resolves
 * the version information. Uses Java 8 formatting.
 *
 * @param {string} verString Full version string to parse.
 * @returns Object containing the version information.
 */
export declare function parseJavaRuntimeVersionLegacy(verString: string): JavaVersion;
/**
 * Parses a full Java Runtime version string and resolves
 * the version information. Uses Java 9+ formatting.
 *
 * @param {string} verString Full version string to parse.
 * @returns Object containing the version information.
 */
export declare function parseJavaRuntimeVersionSemver(verString: string): JavaVersion;
export declare function javaVersionToString({ major, minor, patch, build }: JavaVersion): string;
export interface JavaDiscoverer {
    discover(): Promise<string[]>;
}
export declare class PathBasedJavaDiscoverer implements JavaDiscoverer {
    protected paths: string[];
    constructor(paths: string[]);
    discover(): Promise<string[]>;
}
export declare class DirectoryBasedJavaDiscoverer implements JavaDiscoverer {
    protected directories: string[];
    constructor(directories: string[]);
    discover(): Promise<string[]>;
}
export declare class EnvironmentBasedJavaDiscoverer implements JavaDiscoverer {
    protected keys: string[];
    constructor(keys: string[]);
    discover(): Promise<string[]>;
}
export declare class Win32RegistryJavaDiscoverer implements JavaDiscoverer {
    discover(): Promise<string[]>;
}
export declare function getValidatableJavaPaths(dataDir: string): Promise<string[]>;
export declare function getWin32Discoverers(dataDir: string): Promise<JavaDiscoverer[]>;
export declare function getDarwinDiscoverers(dataDir: string): Promise<JavaDiscoverer[]>;
export declare function getLinuxDiscoverers(dataDir: string): Promise<JavaDiscoverer[]>;
export declare function getPathsOnAllDrives(paths: string[]): Promise<string[]>;
export declare function getPossibleJavaEnvs(): string[];
export declare function getLauncherRuntimeDir(dataDir: string): string;
