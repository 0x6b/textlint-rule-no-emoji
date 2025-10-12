# textlint-rule-no-emoji

[textlint](https://textlint.github.io/) rule which detects and reports emoji characters in your document.

This rule uses the [emoji-regex](https://github.com/mathiasbynens/emoji-regex) package to identify all emoji characters as per the Unicode Standard.

## Install

Install with [pnpm](https://pnpm.io/):

```sh
pnpm add @0x6b/textlint-rule-no-emoji
```

Or with npm:

```sh
npm install @0x6b/textlint-rule-no-emoji
```

This module requires Node.js >= 20.0.0.

## Usage

Via `.textlintrc`(recommended):

```json
{
  "rules": {
    "@0x6b/no-emoji": true
  }
}
```

Via CLI:

```
textlint --rule @0x6b/no-emoji README.md
```

### Build

Builds source codes for publish to the `lib/` folder.

```sh
pnpm install && pnpm run build
```

### Test

Run test code in `test` folder by [textlint-tester](https://github.com/textlint/textlint-tester "textlint-tester").

```sh
pnpm test
```

## References

- [emoji-regex](https://github.com/mathiasbynens/emoji-regex) - Regular expression to match all Emoji-only symbols
- [Unicode Emoji Standard](https://unicode.org/reports/tr51/)

## License

MIT © 0x6b
