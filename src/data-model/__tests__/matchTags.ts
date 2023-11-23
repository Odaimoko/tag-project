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
}) 
