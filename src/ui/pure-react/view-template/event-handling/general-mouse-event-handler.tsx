import {MouseEvent} from "react";

// dom has its own MouseEvent, but we want to use React's MouseEvent 
// to satisfy react's generic type MouseEventHandler<T> while ignore the generic type T 
export type GeneralMouseEventHandler = ((e: MouseEvent) => void) | (() => void)
