import type { TextlintRuleModule, TextlintRuleReporter } from "@textlint/types";
import emojiRegex from "emoji-regex";

const escapeUnicode = (str: string) => {
   return str
      .split("")
      .map((c) => `\\u${`000${c.charCodeAt(0).toString(16)}`.slice(-4)}`)
      .join("");
};
const regex = emojiRegex();

const reporter: TextlintRuleReporter = ({ Syntax, RuleError, getSource, fixer, report }) => {
   return {
      [Syntax.Str](node) {
         const text = getSource(node);
         const matches = text.matchAll(regex);

         for (const match of matches) {
            const emoji = match[0];
            const index = match.index;

            if (index === undefined) {
               continue;
            }

            report(
               node,
               new RuleError(`Found emoji character (${escapeUnicode(emoji)})`, {
                  index,
                  fix: fixer.replaceTextRange([index, index + emoji.length], " "),
               })
            );
         }
      },
   };
};

export default {
   linter: reporter,
   fixer: reporter,
} as TextlintRuleModule;
