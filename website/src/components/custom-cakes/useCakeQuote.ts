"use client";
import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";
export type CakeConfig = { base:string; size:number; height:number; filling:number; sponge:string; frosting:string; colour:string; extras:string[]; message:string };
export type CakeQuote = {subtotal:number;total:number;fee:number;available?:boolean;expires?:number};
export function useCakeQuote(cake: CakeConfig, pickup?:string, revision=0) {
  const [tick,setTick]=useState(0);
  useEffect(()=>{const timer=setInterval(()=>setTick(t=>t+1),30000);return ()=>clearInterval(timer);},[]);
  const body = JSON.stringify({cake,pickup,revision});
  const [result,setResult] = useState<{body:string;quote?:CakeQuote;error?:string}>();
  useEffect(()=>{
    const controller = new AbortController();
    const timer = setTimeout(()=>{
      fetch(apiUrl("/api/cake/quote"),{method:"POST",headers:{"Content-Type":"application/json"},body,signal:controller.signal})
        .then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error);return data;})
        .then(quote=>setResult({body,quote})).catch(e=>{if(!controller.signal.aborted)setResult({body,error:e.message});});
    },200);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[body,tick]);
  return result?.body===body ? result : {body};
}


