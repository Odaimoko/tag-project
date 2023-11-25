import {describe} from "@jest/globals";
import {jsxToMarkdown} from "../markdown-converter";
import {getMdHeadingByString, H1, H2} from "../../ui/common/heading";
import React from "react";

describe("jsx-to-md-heading", () => {
    test("simple heading", () => {
        const jsx = <H1>hello world</H1>
        const md = getMdHeadingByString(1, "hello world");
        expect(jsxToMarkdown(jsx)).toEqual(md)
    })
    test("heading with nested children", () => {
        const jsx = <H1><H2>
            A project <label style={{
            color: "red"
        }}>is?</label>
        </H2></H1>
        const md = getMdHeadingByString(1, "A project is?");
        expect(jsxToMarkdown(jsx)).toEqual(md)
    })
})  
