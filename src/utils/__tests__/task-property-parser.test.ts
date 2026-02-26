import { describe, expect, test } from "@jest/globals";
import { parseTaskPropertiesFromText } from "../task-property-parser";

describe("parseTaskPropertiesFromText", () => {
    test("empty string returns empty object", () => {
        expect(parseTaskPropertiesFromText("")).toEqual({});
    });

    test("null/undefined-like input returns empty object", () => {
        expect(parseTaskPropertiesFromText(null as any)).toEqual({});
        expect(parseTaskPropertiesFromText(undefined as any)).toEqual({});
    });

    test("text with no backticks returns empty object", () => {
        expect(parseTaskPropertiesFromText("plain text")).toEqual({});
        expect(parseTaskPropertiesFromText("hello world")).toEqual({});
    });

    test("bare {key:value} without backticks is not matched", () => {
        expect(parseTaskPropertiesFromText("see {a:b} here")).toEqual({});
        expect(parseTaskPropertiesFromText("{completion_time: 2024-01-01}")).toEqual({});
    });

    test("single property in backticks", () => {
        expect(parseTaskPropertiesFromText("`{key:value}`")).toEqual({ key: "value" });
        expect(parseTaskPropertiesFromText("prefix `{key:value}` suffix")).toEqual({ key: "value" });
    });

    test("space around colon is ignored (key and value trimmed)", () => {
        expect(parseTaskPropertiesFromText("`{ key : value }`")).toEqual({ key: "value" });
        expect(parseTaskPropertiesFromText("`{  a  :  b  }`")).toEqual({ a: "b" });
    });

    test("multiple properties in one string", () => {
        expect(parseTaskPropertiesFromText("`{a:1}` and `{b:2}`")).toEqual({ a: "1", b: "2" });
        expect(parseTaskPropertiesFromText("`{x:foo}` middle `{y:bar}`")).toEqual({ x: "foo", y: "bar" });
    });

    test("same key twice, later overrides earlier", () => {
        expect(parseTaskPropertiesFromText("`{x:1}` then `{x:2}`")).toEqual({ x: "2" });
        expect(parseTaskPropertiesFromText("`{k:first}` `{k:second}`")).toEqual({ k: "second" });
    });

    test("value with spaces", () => {
        expect(parseTaskPropertiesFromText("`{k: v a l u e}`")).toEqual({ k: "v a l u e" });
        expect(parseTaskPropertiesFromText("`{note: hello world}`")).toEqual({ note: "hello world" });
    });

    test("empty value", () => {
        expect(parseTaskPropertiesFromText("`{key:}`")).toEqual({ key: "" });
        expect(parseTaskPropertiesFromText("`{ a :  }`")).toEqual({ a: "" });
    });

    test("use cases: completion_time, due_time, task_id", () => {
        expect(parseTaskPropertiesFromText("`{completion_time: 2024-01-01}`")).toEqual({
            completion_time: "2024-01-01",
        });
        expect(parseTaskPropertiesFromText("`{due_time: tomorrow}`")).toEqual({ due_time: "tomorrow" });
        expect(parseTaskPropertiesFromText("`{task_id:T-123}`")).toEqual({ task_id: "T-123" });
    });

    test("value with colon inside (multiple colons)", () => {
        expect(parseTaskPropertiesFromText("`{key:a:b:c}`")).toEqual({ key: "a:b:c" });
        expect(parseTaskPropertiesFromText("`{time:12:30}`")).toEqual({ time: "12:30" });
    });

    test("key with internal spaces is trimmed", () => {
        expect(parseTaskPropertiesFromText("`{  my key  : value}`")).toEqual({ "my key": "value" });
    });

    test("multiple same-key and different keys", () => {
        expect(
            parseTaskPropertiesFromText("`{a:1}` `{b:2}` `{a:3}` `{c:4}`")
        ).toEqual({ a: "3", b: "2", c: "4" });
    });

    test("mixed bare and backticked: only backticked counted", () => {
        expect(parseTaskPropertiesFromText("ignore {bare:pair} take `{real:ok}`")).toEqual({ real: "ok" });
    });

    test("value can be empty between colons and brace", () => {
        expect(parseTaskPropertiesFromText("`{empty_val:}`")).toEqual({ empty_val: "" });
    });

    test("realistic task-like line", () => {
        const line = "- [ ] Do something #tpm/workflow/feature `{task_id:T-42}` `{due_time:2024-06-01}`";
        expect(parseTaskPropertiesFromText(line)).toEqual({
            task_id: "T-42",
            due_time: "2024-06-01",
        });
    });
});
