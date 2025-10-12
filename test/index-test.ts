import TextLintTester from "textlint-tester";
import rule from "../src";

const tester = new TextLintTester();

tester.run("textlint-rule-no-emoji", rule, {
   valid: ["Normal text without any emoji", "Text with numbers 123 and symbols !@#$%"],
   invalid: [
      {
         text: "Hello 👋 World",
         output: "Hello   World",
         errors: [
            {
               index: 6,
               message: "Found emoji character (\\ud83d\\udc4b)",
            },
         ],
      },
      {
         text: "Great work! 🎉🎊",
         output: "Great work!   ",
         errors: [
            {
               index: 12,
               message: "Found emoji character (\\ud83c\\udf89)",
            },
            {
               index: 14,
               message: "Found emoji character (\\ud83c\\udf8a)",
            },
         ],
      },
      {
         text: "I ❤️ coding",
         output: "I   coding",
         errors: [
            {
               index: 2,
               message: "Found emoji character (\\u2764\\ufe0f)",
            },
         ],
      },
      {
         text: "Thinking 🤔 about it",
         output: "Thinking   about it",
         errors: [
            {
               index: 9,
               message: "Found emoji character (\\ud83e\\udd14)",
            },
         ],
      },
      {
         text: "😀😃😄😁",
         output: "    ",
         errors: [
            {
               index: 0,
               message: "Found emoji character (\\ud83d\\ude00)",
            },
            {
               index: 2,
               message: "Found emoji character (\\ud83d\\ude03)",
            },
            {
               index: 4,
               message: "Found emoji character (\\ud83d\\ude04)",
            },
            {
               index: 6,
               message: "Found emoji character (\\ud83d\\ude01)",
            },
         ],
      },
      {
         text: "No space before🎯 has space after",
         output: "No space before  has space after",
         errors: [
            {
               index: 15,
               message: "Found emoji character (\\ud83c\\udfaf)",
            },
         ],
      },
   ],
});
