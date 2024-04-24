import {describe, expect, test} from "@jest/globals";


import {addTagText, removeTagText} from "../tag-text-manipulate";


describe("Tag", () =>
    test('test', () => {
        expect(addTagText("Anything", "AnyTag").endsWith(" "))
            .toBeTruthy()
    })
)

describe("Remove tags", () => {
    test("Do not remove prefix", () => {
        const text = `test #med #med_lo`;
        const result = removeTagText(text, "#med");
        expect(result).toBe(`test #med_lo`)
    });
    test("Do not remove suffix", () => {
        const text = `- [ ] lo #tpm/tag/med_hi `;
        const result = removeTagText(text, "#tpm/tag/med");
        expect(result).toBe(text)
    });
}) 
