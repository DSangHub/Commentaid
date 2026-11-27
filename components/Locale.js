"use client";
import {createContext,useContext,useEffect,useState} from "react";
const LocaleContext=createContext({lang:"en",setLang:()=>{}});
export function LocaleProvider({country="",children}){
 const [lang,setLanguage]=useState(country==="MX"?"es":"en");
 useEffect(()=>{try{const saved=localStorage.getItem("commentaid-language"); if(saved)setLanguage(saved);else if(country==="MX")setLanguage("es");else if(navigator.language.startsWith("es"))setLanguage("es");}catch{}},[country]);
 useEffect(()=>{document.documentElement.lang=lang;document.documentElement.dir=["ar","ur"].includes(lang)?"rtl":"ltr";},[lang]);
 function setLang(value){setLanguage(value);try{localStorage.setItem("commentaid-language",value)}catch{}}
 return <LocaleContext.Provider value={{lang,setLang}}>{children}</LocaleContext.Provider>;
}
export function useLocale(){return useContext(LocaleContext)}
export function T({es,children}){const {lang}=useLocale();return lang==="es"?es:children}
