import type { TextlintRuleModule, TextlintRuleReporter } from "@textlint/types";
import emojiRegex from "emoji-regex";

/**
 * Characters with Emoji=Yes but Emoji_Presentation=No (text default).
 * These render as text by default and only become emoji when followed by U+FE0F.
 * Based on Unicode 15.1 emoji-data.txt.
 */
const TEXT_DEFAULT_EMOJI = new Set([
   0x0023, 0x002a, // # *
   0x0030, 0x0031, 0x0032, 0x0033, 0x0034, 0x0035, 0x0036, 0x0037, 0x0038, 0x0039, // 0-9
   0x00a9, 0x00ae, // © ®
   0x203c, 0x2049, // ‼ ⁉
   0x2122, 0x2139, // ™ ℹ
   0x2194, 0x2195, 0x2196, 0x2197, 0x2198, 0x2199, // arrows
   0x21a9, 0x21aa, // curved arrows
   0x2328, 0x23cf, // keyboard, eject
   0x23ed, 0x23ee, 0x23ef, 0x23f1, 0x23f2, 0x23f8, 0x23f9, 0x23fa, // media controls
   0x24c2, // Ⓜ
   0x25aa, 0x25ab, 0x25b6, 0x25c0, 0x25fb, 0x25fc, // squares, play
   0x2600, 0x2601, 0x2602, 0x2603, 0x2604, // weather
   0x260e, 0x2611, 0x2618, // phone, checkbox, shamrock
   0x261d, // pointing up
   0x2620, 0x2622, 0x2623, 0x2626, 0x262a, 0x262e, 0x262f, // symbols
   0x2638, 0x2639, 0x263a, // wheel, faces
   0x2640, 0x2642, // gender
   0x265f, 0x2660, 0x2663, 0x2665, 0x2666, 0x2668, // cards, hot springs
   0x267b, 0x267e, 0x267f, // recycling, infinity, wheelchair
   0x2692, 0x2694, 0x2695, 0x2696, 0x2697, 0x2699, 0x269b, 0x269c, // tools, symbols
   0x26a0, 0x26a7, 0x26b0, 0x26b1, // warning, symbols
   0x26c8, 0x26cf, 0x26d1, 0x26d3, // weather, tools
   0x26e9, 0x26f0, 0x26f1, 0x26f4, 0x26f7, 0x26f8, 0x26f9, 0x26fa, // places, sports
   0x2702, 0x2708, 0x2709, // scissors, airplane, envelope
   0x270c, 0x270d, 0x270f, 0x2712, // hand, pencil, nib
   0x2714, 0x2716, 0x271d, 0x2721, // checkmarks, crosses
   0x2733, 0x2734, 0x2744, 0x2747, // stars, snowflake
   0x2763, 0x27a1, // heart exclamation, arrow
   0x2934, 0x2935, 0x2b05, 0x2b06, 0x2b07, // arrows
   0x3030, 0x303d, 0x3297, 0x3299, // CJK symbols
]);

const VARIATION_SELECTOR_16 = 0xfe0f;

/**
 * Check if a matched string is a text-default emoji without explicit emoji presentation.
 * Returns true if the match should be skipped (text presentation, not emoji).
 */
const isTextPresentationEmoji = (match: string): boolean => {
   const codePoints = [...match].map((c) => c.codePointAt(0)!);

   // If ends with FE0F (variation selector), it's explicitly emoji presentation
   if (codePoints[codePoints.length - 1] === VARIATION_SELECTOR_16) {
      return false;
   }

   // Single text-default emoji codepoint without FE0F → text presentation
   if (codePoints.length === 1 && TEXT_DEFAULT_EMOJI.has(codePoints[0])) {
      return true;
   }

   return false;
};

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

            // Skip text-default emoji characters (Emoji=Yes, Emoji_Presentation=No)
            // unless they have explicit emoji presentation via U+FE0F
            if (isTextPresentationEmoji(emoji)) {
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
