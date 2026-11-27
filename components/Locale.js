"use client";
import {createContext,useContext,useEffect,useState} from "react";
import { legacyTranslation } from "./localeTranslations";
const countries={MX:"es",ES:"es",CO:"es",AR:"es",PE:"es",CL:"es",FR:"fr",BR:"pt",PT:"pt",IN:"hi",PK:"ur",ID:"id",SA:"ar",AE:"ar",EG:"ar",CN:"zh",TW:"zh",JP:"ja",KR:"ko"};
const supported=["en","es","fr","pt","hi","ur","pa","id","ar","zh","ja","ko"];
const LocaleContext=createContext({lang:"en",setLang:()=>{}});
export function LocaleProvider({country="",children}){
 const [lang,setLanguage]=useState(countries[country]||"en");
 useEffect(()=>{try{const saved=localStorage.getItem("commentaid-language"); if(supported.includes(saved))setLanguage(saved);else if(countries[country])setLanguage(countries[country]);else {const browser=navigator.language.split("-")[0];if(supported.includes(browser))setLanguage(browser);}}catch{}},[country]);
 useEffect(()=>{document.documentElement.lang=lang;document.documentElement.dir=["ar","ur"].includes(lang)?"rtl":"ltr";},[lang]);
 function setLang(value){setLanguage(value);try{localStorage.setItem("commentaid-language",value)}catch{}}
 return <LocaleContext.Provider value={{lang,setLang}}>{children}</LocaleContext.Provider>;
}
export function useLocale(){return useContext(LocaleContext)}
export function T({es,children}){const {lang}=useLocale();return lang==="es"?es:(typeof children==="string"?legacyTranslation(lang,children):children)}
