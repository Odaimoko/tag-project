import {describe, expect, test} from "@jest/globals";

import {addTagText} from "../workflow-def";


describe("Tag", () =>
    test('test', () => {
        expect(addTagText("Anything", "AnyTag").endsWith(" "))
            .toBeTruthy()
    })
)