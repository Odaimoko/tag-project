import {describe} from "@jest/globals";
import {matchTags} from "../markdown-parse";

describe("Match tags", () => {
    test("Do not match heading", () => {
        const text = `test render link with pure heading [[#Render]] #tpm/workflow/render #tpm/step/dummy `;
        const result = matchTags(text)
        expect(result?.length).toBe(2);
    });
    test("Do not match loose-written heading", () => {
        const text = "test render link with loose-written heading [[  #Render]] #tpm/workflow/render ";
        const result = matchTags(text)
        expect(result?.length).toBe(1);
    });
    test("Do not match heading in with file", () => {
        const text = "test render link with heading with file [[PDD Unit Test#Render]] #tpm/workflow/render #tpm/step/dummy ";
        const result = matchTags(text)
        expect(result?.length).toBe(2);
    })
    test("Do not match block link", () => {
        const text = "test render link with block [[#^block-link]] #tpm/workflow/render #tpm/step/dummy";
        const result = matchTags(text)
        expect(result?.length).toBe(2);
    })
    test("Match bold", () => {
        const text = "block **#tpm/project/UT_020_1_9_code_block_bold**";
        const result = matchTags(text)
        expect(result?.length).toBe(1);
    })
    test("Match bold 2", () => {
        const text = "_9_code_block_bold  #tpm/workflow/UT_020_1_8_prefix **#tpm/project/UT_020_1_9_code_block_bold**";
        const result = matchTags(text)
        expect(result?.length).toBe(2);
        expect(result[0]).toBe("#tpm/workflow/UT_020_1_8_prefix");
        expect(result[1]).toBe("#tpm/project/UT_020_1_9_code_block_bold");
    })
    test("Match italic *", () => {
        const text = "block *#tpm/project/UT_020_1_9_code_block_italic*";
        const result = matchTags(text)
        expect(result?.length).toBe(1);
    })
    test("Do not match italic _", () => {
        const text = "block _#tpm/project/UT_020_1_9_code_block_italic2_";
        const result = matchTags(text)
        expect(result?.length).toBe(0);
    })
    test("Do not match code inline", () => {
        const text = "block `#tpm/project/UT_020_1_9_code_block_italic2`";
        const result = matchTags(text)
        expect(result?.length).toBe(0);
    })
    test("Do not match code inline with space", () => {
        const text = "block ` #tpm/project/UT_020_1_9_code_block_italic2` ";
        const result = matchTags(text)
        expect(result?.length).toBe(0);
    })
}) 
