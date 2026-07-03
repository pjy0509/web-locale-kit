import packageJSON from "./package.json" assert {type: 'json'};

declare global {
    interface Navigator {
        language?: string;
        languages?: readonly string[];
        browserLanguage?: string;
        systemLanguage?: string;
        userLanguage?: string;
    }

    namespace Intl {
        const Locale: {
            new(tag: string): IntlLocale;
        };
    }
}

interface IntlLocale {
    getTextInfo?(): IntlLocaleTextInfo;

    textInfo: IntlLocaleTextInfo;
}

interface IntlLocaleTextInfo {
    direction: 'rtl' | 'ltr';
}

/**
 * Resolved locale information for the current environment.
 *
 * Detects the user's language(s), timezone, UTC offset, and text direction from
 * `Intl` and `navigator`, with BCP-47 tag normalization and graceful fallbacks.
 *
 * @remarks
 * All fields are resolved once when the module loads and never update afterward —
 * a mid-session language or timezone change is not reflected. `language` and
 * `timezone` may be `null` in environments without `Intl` or `navigator`.
 *
 * @example
 * ```ts
 * document.documentElement.lang = LocaleKit.language ?? 'en';
 * document.documentElement.dir = LocaleKit.rtl ? 'rtl' : 'ltr';
 * ```
 */
export interface LocaleKitInstance {
    /**
     * The installed package version.
     */
    readonly version: string;

    /**
     * The primary normalized BCP-47 language tag (e.g. `'ko-KR'`), or `null` if undetectable.
     *
     * @remarks
     * The first entry of {@link LocaleKitInstance.languages}. Region subtags are
     * upper-cased and script subtags title-cased during normalization.
     */
    readonly language: string | null;

    /**
     * All detected language tags, de-duplicated and normalized, in preference order.
     *
     * @remarks
     * Merged from `Intl.DateTimeFormat`, `navigator.languages`, and legacy
     * `navigator` language fields. Empty when none can be detected.
     */
    readonly languages: readonly string[];

    /**
     * The IANA timezone name (e.g. `'Asia/Seoul'`), or `null` if unavailable.
     */
    readonly timezone: string | null;

    /**
     * Minutes ahead of UTC (e.g. Seoul → `540`).
     *
     * @remarks
     * The sign is inverted relative to `Date.prototype.getTimezoneOffset()`, which
     * returns minutes *behind* UTC (Seoul → `-540`). Here positive means *ahead* of
     * UTC. Defaults to `0` if the offset cannot be read.
     */
    readonly offset: number;

    /**
     * Whether the primary language is written right-to-left.
     *
     * @remarks
     * Resolved via `Intl.Locale.prototype.getTextInfo()` where available, falling
     * back to a curated list of RTL language subtags. `false` when no language is detected.
     */
    readonly rtl: boolean;
}

const RTL_LANGUAGES: string[] = ['ae', 'ar', 'arc', 'bcc', 'bqi', 'ckb', 'dv', 'fa', 'glk', 'he', 'iw', 'ku', 'mzn', 'nqo', 'pnb', 'ps', 'sd', 'ug', 'ur', 'yi'];

function normalizeLocale(locale: string | null | undefined): string | null | undefined {
    if (locale === null || typeof locale === 'undefined') return locale;
    if (locale.length === 0) return null;

    locale = locale.replace(/_/g, '-');

    if (locale === 'C' || locale.toLowerCase() === 'posix') return 'en-US';
    if (locale.indexOf('.') !== -1) return normalizeLocale(locale.split('.')[0]);
    if (locale.indexOf('@') !== -1) return normalizeLocale(locale.split('@')[0]);

    const parts: string[] = locale.split('-');

    if (parts.length === 0) return null;

    parts[0] = parts[0].toLowerCase();

    if (parts.length > 1 && parts[1].length === 2) parts[1] = parts[1].toUpperCase();
    if (parts.length > 2 && parts[1].length === 4) parts[1] = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();

    return parts.join('-');
}

let language: string | null = null;
let languages: string[] = [];
let timezone: string | null = null;
let offset: number = 0;
let rtl: boolean = false;
let isRTLResolved: boolean | null = null;

function addLanguages(langs: string[] | readonly string[]): void {
    for (let i: number = 0; i < langs.length; i++) addLanguage(langs[i]);
}

function addLanguage(lang: string | null | undefined): void {
    lang = normalizeLocale(lang);

    if (typeof lang === 'string' && languages.indexOf(lang) === -1) {
        if (language === null) language = lang;

        languages.push(lang);
    }
}

if (typeof Intl !== 'undefined') {
    try {
        addLanguage(Intl.DateTimeFormat().resolvedOptions().locale);
    } catch (_: unknown) {
    }

    try {
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (_: unknown) {
    }
}

if (typeof globalThis.navigator !== 'undefined') {
    if (typeof globalThis.navigator.languages !== 'undefined') addLanguages(globalThis.navigator.languages);
    if (typeof globalThis.navigator.language !== 'undefined') addLanguage(globalThis.navigator.language);
    if (typeof globalThis.navigator.userLanguage !== 'undefined') addLanguage(globalThis.navigator.userLanguage);
    if (typeof globalThis.navigator.browserLanguage !== 'undefined') addLanguage(globalThis.navigator.browserLanguage);
    if (typeof globalThis.navigator.systemLanguage !== 'undefined') addLanguage(globalThis.navigator.systemLanguage);
}

try {
    offset = new Date().getTimezoneOffset() * -1;
} catch (_: unknown) {
}

if (typeof language === 'string') {
    if (typeof Intl !== 'undefined' && typeof Intl.Locale !== 'undefined') {
        try {
            const intlLocale: IntlLocale = new Intl.Locale(language);

            if (typeof intlLocale.getTextInfo === 'function') isRTLResolved = intlLocale.getTextInfo().direction === 'rtl';
            else if (typeof intlLocale.textInfo !== 'undefined') isRTLResolved = intlLocale.textInfo.direction === 'rtl';
        } catch (_: unknown) {
        }
    }

    if (typeof isRTLResolved !== 'boolean') {
        const matched: RegExpMatchArray | null = /^([A-Za-z]{1,8})(?:[-_][A-Za-z0-9]{1,8})*$/.exec(language);

        if (matched !== null) {
            const lang: string = matched[1].toLowerCase();

            for (let i: number = 0; i < RTL_LANGUAGES.length; i++) {
                if (RTL_LANGUAGES[i] === lang) {
                    isRTLResolved = true;
                    break;
                }
            }
        }
    }
}

if (typeof isRTLResolved === 'boolean') rtl = isRTLResolved;

const LocaleKit: LocaleKitInstance = {
    version: packageJSON.version,

    language: language,
    languages: languages,
    timezone: timezone,
    offset: offset,
    rtl: rtl,
};

export default LocaleKit;
