"use client";
import { useCallback, useSyncExternalStore } from "react";
const subscribe=(callback:()=>void)=>{window.addEventListener("storage",callback);return()=>window.removeEventListener("storage",callback)};
/** Hydrates browser-only draft state without changing the server-rendered snapshot. */
export function useSessionValue(key:string){return useSyncExternalStore(subscribe,useCallback(()=>sessionStorage.getItem(key),[key]),()=>null)}
