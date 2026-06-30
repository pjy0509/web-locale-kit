![npm](https://img.shields.io/npm/v/web-locale-kit)
![bundle size](https://img.shields.io/bundlephobia/minzip/web-locale-kit)
![types](https://img.shields.io/npm/types/web-locale-kit)

# web-locale-kit

A tiny TypeScript locale detector — resolves the user's **language(s)**,
**timezone**, **UTC offset**, and **text direction** (RTL/LTR) from `Intl` and
`navigator`, with tag normalization and graceful fallbacks.

```bash
npm install web-locale-kit
```

## API at a glance

`LocaleKit` is a singleton. All fields are read-only and resolved once at import.

| Member | Type | Description |
| --- | --- | --- |
| `LocaleKit.version` | `string` | The installed package version |
| `LocaleKit.language` | `string \| null` | Primary normalized BCP-47 tag (e.g. `"ko-KR"`), or `null` if undetectable |
| `LocaleKit.languages` | `readonly string[]` | All detected tags, de-duplicated and normalized, in preference order |
| `LocaleKit.timezone` | `string \| null` | IANA timezone (e.g. `"Asia/Seoul"`), or `null` |
| `LocaleKit.offset` | `number` | Minutes **ahead of UTC** (e.g. Seoul → `540`; opposite sign of `getTimezoneOffset()`) |
| `LocaleKit.rtl` | `boolean` | Whether the primary language is right-to-left |

---

## ESM

```js
import LocaleKit from 'web-locale-kit'

console.log(LocaleKit.language)  // "ko-KR"
console.log(LocaleKit.languages) // ["ko-KR", "en-US"]
console.log(LocaleKit.timezone)  // "Asia/Seoul"
console.log(LocaleKit.offset)    // 540  (UTC+9, in minutes)
console.log(LocaleKit.rtl)       // false

document.documentElement.dir = LocaleKit.rtl ? 'rtl' : 'ltr'
```

## CommonJS

The bundle is built with `exports: "named"`, so the singleton lives under `.default`:

```js
const { default: LocaleKit } = require('web-locale-kit')

console.log(LocaleKit.language, LocaleKit.timezone)
```

## UMD (browser `<script>`)

The global `LocaleKit` is a namespace object; the singleton is `LocaleKit.default`.

```html
<script src="https://unpkg.com/web-locale-kit/dist/locale-kit.umd.min.js"></script>
<script>
    var locale = window.LocaleKit.default

    document.documentElement.lang = locale.language || 'en'
    document.documentElement.dir = locale.rtl ? 'rtl' : 'ltr'
</script>
```

## TypeScript

The singleton shape is exported as `LocaleKitInstance`.

```ts
import LocaleKit, { type LocaleKitInstance } from 'web-locale-kit'

const lang: string | null = LocaleKit.language
const isRTL: boolean = LocaleKit.rtl
```

---

## Notes

- **Resolved once at import.** Values are computed when the module loads; they do
  not update if the user changes language or timezone mid-session. Re-evaluate by
  reloading, or read again on navigation if your app supports live locale switches.
- **`offset` is inverted vs `getTimezoneOffset()`.** Standard JS returns minutes
  *behind* UTC (Seoul → `-540`); this field flips the sign so positive means
  *ahead* of UTC (Seoul → `540`), which reads more intuitively.
- **`language` / `timezone` may be `null`** in environments without `Intl` or
  `navigator` (e.g. some server/Node contexts). Guard before use.
- **RTL detection** prefers `Intl.Locale.prototype.getTextInfo()` where available,
  falling back to a curated list of RTL language subtags.
