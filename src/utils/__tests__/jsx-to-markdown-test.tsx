import {describe} from "@jest/globals";
import {jsxToMarkdown} from "../markdown-converter";
import {getMdHeadingByString, H1, H2, P} from "../../ui/common/heading";
import React from "react";

describe("jsx-to-md-heading", () => {
    test("simple heading", () => {
        const jsx = <H1>hello world</H1>
        const md = getMdHeadingByString({
            layer: 1,
            content: "hello world",
        });
        expect(jsxToMarkdown(jsx)).toEqual(md)
    })
    test("heading with nested children", () => {
        const jsx = <H1><H2>
            A project <label style={{
            color: "red"
        }}>is?</label>
        </H2></H1>
        const md = getMdHeadingByString({
            layer: 1,
            content: "A project is?",
        });
        expect(jsxToMarkdown(jsx)).toEqual(md)
    })
    test("display none", () => {
        const jsx = <H1 style={{display: "none"}}>hello world</H1>
        expect(jsxToMarkdown(jsx)).toEqual("")
    })
})

describe("jsx-to-md-paragraph", () => {
    test("simple paragraph", () => {
        const jsx = <P>hello world</P>
        expect(jsxToMarkdown(jsx)).toEqual("\n\nhello world")
    })
    test("paragraph with nested children", () => {
        const jsx = <P>
            A project <label style={{
            color: "red"
        }}>is?</label>
        </P>
        expect(jsxToMarkdown(jsx)).toEqual("\n\nA project <label style=\"color:red\">is?</label>")
    })
    test("display none", () => {
        const jsx = <P style={{display: "none"}}>hello world</P>
        expect(jsxToMarkdown(jsx)).toEqual("")
    })
})
