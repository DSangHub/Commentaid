"use client";
import { useLocale } from "../components/Locale";

const languages = [
  ["en","English"],["es","Español"],["fr","Français"],["pt","Português"],
  ["hi","हिन्दी"],["ur","اردو"],["pa","ਪੰਜਾਬੀ"],["id","Bahasa Indonesia"],
  ["ar","العربية"],["zh","中文"],["ja","日本語"],["ko","한국어"]
];
export default function LanguageToggle({ initialCountry = "" }){
 const {lang,setLang}=useLocale();

 function change(value){setLang(value);}
 return <label className="languageControl" aria-label="Website language"><span aria-hidden="true">🌐</span><select value={lang} onChange={e=>change(e.target.value)} aria-label="Choose language">{languages.map(([code,name])=><option key={code} value={code}>{name}</option>)}</select></label>;
}
