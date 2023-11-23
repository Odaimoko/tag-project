import {describe} from "@jest/globals";
import {matchCodeInline} from "../markdown-parse";

describe("Match code inline", () => {
    test("correct code", () => {
        const text = "`codeblock1`";
        const result = matchCodeInline(text)
        expect(result?.length).toBe(1);
    });

    test("open code", () => {
        const text = "`codeblock1` tbu`bali";
        const result = matchCodeInline(text)
        expect(result?.length).toBe(1);
    });

    test("2 code", () => {
        const text = "`codeblock1` tbu`bali`";
        const result = matchCodeInline(text)
        expect(result?.length).toBe(2);
    });
}) 
