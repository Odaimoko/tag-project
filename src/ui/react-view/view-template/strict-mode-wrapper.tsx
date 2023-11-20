import React, {ReactNode, StrictMode} from "react";
import {isProduction} from "../../../utils/env-util";

export function StrictModeWrapper({children}: { children: ReactNode }) {
    if (isProduction())
        return <>{children}</>
    else return <StrictMode>{children}</StrictMode>
}
