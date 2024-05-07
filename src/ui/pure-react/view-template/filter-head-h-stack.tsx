import React from "react";
import {HStack} from "./h-stack";

/**
 * Accept children as a HStack with a unified style
 * @param props
 * @constructor
 */
export function FilterHeadHStack(props: React.PropsWithChildren<any>) {
    return <span style={{display: "flex"}}>
            <HStack style={{
                display: "flex",
                alignItems: "center"
            }} spacing={10}>
                {props.children}
            </HStack>
        </span>
}
