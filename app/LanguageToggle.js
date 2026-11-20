"use client";
import { useEffect, useState } from "react";

const languages = [
  ["en","English"],["es","Español"],["fr","Français"],["pt","Português"],
  ["hi","हिन्दी"],["ur","اردو"],["pa","ਪੰਜਾਬੀ"],["id","Bahasa Indonesia"],
  ["ar","العربية"],["zh","中文"],["ja","日本語"],["ko","한국어"]
];
const translations = {
 es:["Cómo funciona","Precios","Abrir Commentaid","Convierte comentarios en conversaciones.","Un puente de IA para que creadores y empresas comprendan, traduzcan y respondan a los comentarios en el idioma del espectador.","Crear cuenta y conectar YouTube","Ver cómo funciona","Empieza gratis. Crece con tu audiencia.","Cada comentario merece una respuesta."],
 fr:["Fonctionnement","Tarifs","Ouvrir Commentaid","Transformez les commentaires en conversations.","Un pont IA pour aider les créateurs et entreprises à comprendre, traduire et répondre dans la langue du public.","Créer un compte et connecter YouTube","Voir comment ça marche","Commencez gratuitement. Évoluez avec votre audience.","Chaque commentaire mérite une réponse."],
 pt:["Como funciona","Preços","Abrir Commentaid","Transforme comentários em conversas.","Uma ponte de IA para criadores e empresas entenderem, traduzirem e responderem no idioma do público.","Criar conta e conectar YouTube","Veja como funciona","Comece grátis. Cresça com seu público.","Todo comentário merece uma resposta."],
 hi:["यह कैसे काम करता है","कीमतें","Commentaid खोलें","टिप्पणियों को बातचीत में बदलें।","क्रिएटर्स और व्यवसायों के लिए दर्शकों की भाषा में टिप्पणियाँ समझने, अनुवाद करने और जवाब देने का AI माध्यम।","खाता बनाएँ और YouTube जोड़ें","यह कैसे काम करता है","मुफ़्त शुरू करें। अपने दर्शकों के साथ बढ़ें।","हर टिप्पणी जवाब की हकदार है।"],
 ur:["یہ کیسے کام کرتا ہے","قیمتیں","Commentaid کھولیں","تبصروں کو گفتگو میں بدلیں۔","تخلیق کاروں اور کاروباروں کے لیے ناظرین کی زبان میں تبصرے سمجھنے، ترجمہ کرنے اور جواب دینے کا AI ذریعہ۔","اکاؤنٹ بنائیں اور YouTube منسلک کریں","طریقہ دیکھیں","مفت شروع کریں۔ اپنے سامعین کے ساتھ بڑھیں۔","ہر تبصرہ جواب کا مستحق ہے۔"],
 pa:["ਇਹ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ","ਕੀਮਤਾਂ","Commentaid ਖੋਲ੍ਹੋ","ਟਿੱਪਣੀਆਂ ਨੂੰ ਗੱਲਬਾਤ ਵਿੱਚ ਬਦਲੋ।","ਸਿਰਜਣਹਾਰਾਂ ਅਤੇ ਕਾਰੋਬਾਰਾਂ ਲਈ ਦਰਸ਼ਕਾਂ ਦੀ ਭਾਸ਼ਾ ਵਿੱਚ ਟਿੱਪਣੀਆਂ ਸਮਝਣ, ਅਨੁਵਾਦ ਕਰਨ ਅਤੇ ਜਵਾਬ ਦੇਣ ਲਈ AI।","ਖਾਤਾ ਬਣਾਓ ਅਤੇ YouTube ਜੋੜੋ","ਇਹ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ","ਮੁਫ਼ਤ ਸ਼ੁਰੂ ਕਰੋ। ਆਪਣੇ ਦਰਸ਼ਕਾਂ ਨਾਲ ਵਧੋ।","ਹਰ ਟਿੱਪਣੀ ਜਵਾਬ ਦੀ ਹੱਕਦਾਰ ਹੈ।"],
 id:["Cara kerja","Harga","Buka Commentaid","Ubah komentar menjadi percakapan.","Jembatan AI bagi kreator dan bisnis untuk memahami, menerjemahkan, dan membalas komentar dalam bahasa penonton.","Buat akun dan hubungkan YouTube","Lihat cara kerja","Mulai gratis. Tumbuh bersama audiens.","Setiap komentar layak dijawab."],
 ar:["كيف يعمل","الأسعار","افتح Commentaid","حوّل التعليقات إلى محادثات.","مساعد ذكاء اصطناعي للمبدعين والشركات لفهم التعليقات وترجمتها والرد بلغة المشاهد.","أنشئ حسابًا واربط YouTube","اكتشف كيف يعمل","ابدأ مجانًا وانمُ مع جمهورك.","كل تعليق يستحق ردًا."],
 zh:["工作原理","价格","打开 Commentaid","让评论变成对话。","帮助创作者和企业理解、翻译并用观众的语言回复评论的 AI 助手。","创建账户并连接 YouTube","了解工作原理","免费开始，与受众共同成长。","每条评论都值得回复。"],
 ja:["使い方","料金","Commentaid を開く","コメントを会話に変えよう。","クリエイターや企業が視聴者の言語でコメントを理解・翻訳・返信するための AI アシスタント。","アカウントを作成して YouTube に接続","使い方を見る","無料で始めて、視聴者とともに成長。","すべてのコメントに返信を。"],
 ko:["이용 방법","요금","Commentaid 열기","댓글을 대화로 바꾸세요.","크리에이터와 기업이 시청자의 언어로 댓글을 이해하고 번역하고 답하도록 돕는 AI 도우미입니다.","계정 만들고 YouTube 연결","이용 방법 보기","무료로 시작하고 시청자와 함께 성장하세요.","모든 댓글은 답변받을 가치가 있습니다."]
};
const originals=["How it works","Pricing","Open Commentaid","Turn comments into conversations.","One AI bridge for influencers and businesses to understand, translate, answer, and act on comments—in the viewer's own language.","Create account & connect YouTube","See how it works","Start free. Grow when your audience does.","Every comment deserves an answer."];
const country = {MX:"es",ES:"es",CO:"es",AR:"es",PE:"es",CL:"es",FR:"fr",BR:"pt",PT:"pt",IN:"hi",PK:"ur",ID:"id",SA:"ar",AE:"ar",EG:"ar",CN:"zh",TW:"zh",JP:"ja",KR:"ko"};
function chooseLanguage(){
 try {const saved=localStorage.getItem("commentaid-language");if(saved && languages.some(([c])=>c===saved))return saved;}catch{}
 const browser=navigator.languages||[navigator.language];
 for(const item of browser){const code=item.toLowerCase().split("-")[0];if(languages.some(([c])=>c===code))return code;}
 return "en";
}
export default function LanguageToggle(){
 const [lang,setLang]=useState("en");
 useEffect(()=>{setLang(chooseLanguage());},[]);
 useEffect(()=>{
  const root=document.getElementById("commentaid-home");
  if(!root)return;
  const nodes=[];
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
   const current=node.textContent.trim();
   const index=originals.indexOf(node.__commentaidOriginal ?? current);
   if(index<0)continue;
   node.__commentaidOriginal=originals[index];
   const leading=node.textContent.match(/^\s*/)?.[0]||"";
   const trailing=node.textContent.match(/\s*$/)?.[0]||"";
   node.textContent=leading+(translations[lang]?.[index]||originals[index])+trailing;
  }
  document.documentElement.lang=lang;
  document.documentElement.dir=["ar","ur"].includes(lang)?"rtl":"ltr";
 },[lang]);
 function change(value){setLang(value);try{localStorage.setItem("commentaid-language",value);}catch{}}
 return <label className="languageControl" aria-label="Website language"><span aria-hidden="true">🌐</span><select value={lang} onChange={e=>change(e.target.value)} aria-label="Choose language">{languages.map(([code,name])=><option key={code} value={code}>{name}</option>)}</select></label>;
}
