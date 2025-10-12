import type { TextlintRuleModule, TextlintRuleReporter } from "@textlint/types";
import emojiRegex from "emoji-regex";

const escapeUnicode = (str: string) => {
   return str
      .split("")
      .map((c) => `\\u${`000${c.charCodeAt(0).toString(16)}`.slice(-4)}`)
      .join("");
};

const regex = emojiRegex();

/**
 * Pattern-matching style function to compute the removal range for an emoji.
 * Returns [startIndex, endIndex] tuple representing the range to remove.
 *
 * Pattern matching on (hasSpaceBefore, hasSpaceAfter, isAtStart):
 * - (true , true , _    ) → "word 😀 word" → "word word" | remove emoji + one space
 * - (true , false, _    ) → "word 😀word"  → "wordword"  | remove space before + emoji
 * - (false, true , true ) → "😀 word"      → "word"      | remove emoji + space (at start)
 * - (false, true , false) → "word😀 word"  → "word word" | remove emoji only (keep space )
 * - (false, false, _    ) → "word😀word"   → "wordword"  | remove emoji only
 */
const computeRemovalRange = (
   emojiIndex: number,
   emojiLength: number,
   hasSpaceBefore: boolean,
   hasSpaceAfter: boolean
): readonly [start: number, end: number] => {
   const emojiEnd = emojiIndex + emojiLength;
   const isAtStart = emojiIndex === 0;

   // Pattern: (true, true, _)
   if (hasSpaceBefore && hasSpaceAfter) {
      return [emojiIndex, emojiEnd + 1] as const;
   }

   // Pattern: (true, false, _)
   if (hasSpaceBefore && !hasSpaceAfter) {
      return [emojiIndex - 1, emojiEnd] as const;
   }

   // Pattern: (false, true, true)
   if (!hasSpaceBefore && hasSpaceAfter && isAtStart) {
      return [emojiIndex, emojiEnd + 1] as const;
   }

   // Pattern: (false, true, false)
   if (!hasSpaceBefore && hasSpaceAfter) {
      return [emojiIndex, emojiEnd] as const;
   }

   // Pattern: (false, false, _)
   return [emojiIndex, emojiEnd] as const;
};

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

            const emojiEnd = index + emoji.length;
            const hasSpaceBefore = index > 0 && text[index - 1] === " ";
            const hasSpaceAfter = emojiEnd < text.length && text[emojiEnd] === " ";
            const [startIndex, endIndex] = computeRemovalRange(index, emoji.length, hasSpaceBefore, hasSpaceAfter);
            report(
               node,
               new RuleError(`Found emoji character (${escapeUnicode(emoji)})`, {
                  index,
                  fix: fixer.replaceTextRange([startIndex, endIndex], ""),
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
