import Link from "next/link";
import { headers } from "next/headers";
import LanguageToggle from "./LanguageToggle";
import { LocaleProvider, T } from "../components/Locale";

export default async function Home() {
  const requestHeaders = await headers();
  const visitorCountry = requestHeaders.get("x-vercel-ip-country") || "";
  return (
    <LocaleProvider country={visitorCountry}>
    <main id="commentaid-home">
      <nav className="nav">
        <div className="brand">Commentaid</div>
        <div className="navActions">
          <LanguageToggle initialCountry={visitorCountry} />
          <a className="navLink" href="#how"><T es="Cómo funciona">How it works</T></a>
          <a className="navLink" href="#pricing"><T es="Precios">Pricing</T></a>
          <Link className="button primary compact" href="/login?mode=signup&next=%2Fdashboard"><T es="Abrir Commentaid">Open Commentaid</T></Link>
        </div>
      </nav>

      <section className="hero">
        <div className="badge"><T es="ASISTENTE DE COMENTARIOS CON IA">AI COMMENT ASSISTANT</T></div>
        <h1><T es="Convierte los comentarios en ">Turn comments into </T><span><T es="conversaciones.">conversations.</T></span></h1>
        <p className="lead">
          <T es="Un puente de IA para creadores y empresas que permite comprender, traducir, responder y actuar sobre los comentarios en el idioma del espectador.">One AI bridge for influencers and businesses to understand, translate, answer, and act on comments—in the viewer&apos;s own language.</T>
        </p>
        <div className="actions">
          <Link href="/login?mode=signup&amp;next=%2Fdashboard" className="button primary"><T es="Crea tu cuenta y empieza a traducir">Create account &amp; start translating</T></Link>
          <a href="#how" className="button secondary"><T es="Descubre cómo funciona">See how it works</T></a>
        </div>

        <div className="demoCard">
          <div className="demoHeader"><span className="dot" /> Live translation example</div>
          <div className="message"><div className="label"><T es="Espectador · Español">Viewer · Spanish</T></div><strong>¿Dónde puedo comprar esta camisa?</strong></div>
          <div className="arrow">↓</div>
          <div className="message translated"><div className="label"><T es="Traducción de Commentaid">Commentaid translation</T></div><strong>Where can I buy this shirt?</strong></div>
          <div className="arrow">↓</div>
          <div className="message reply"><div className="label"><T es="El creador responde en inglés">Creator replies in English</T></div><strong>You can find it at the link in my description.</strong></div>
          <div className="arrow">↓</div>
          <div className="message translated"><div className="label"><T es="Copia la respuesta en español">Copy reply in Spanish</T></div><strong>Puedes encontrarla en el enlace de mi descripción.</strong></div>
        </div>
      </section>

      <section id="how" className="section">
        <p className="eyebrow"><T es="CÓMO FUNCIONA">HOW IT WORKS</T></p>
        <h2><T es="Conserva tus comentarios. Añade Commentaid.">Keep your comments. Add Commentaid.</T></h2>
        <div className="grid">
          <article className="card"><div className="number">01</div><h3><T es="Pega o conecta">Paste or connect</T></h3><p><T es="Pega un comentario de cualquier aplicación o carga los comentarios recientes de tu canal de YouTube.">Paste a comment from any app or load recent YouTube comments from your channel.</T></p></article>
          <article className="card"><div className="number">02</div><h3><T es="Comprende">Understand</T></h3><p><T es="Detecta el idioma, traduce e identifica preguntas, quejas, intención de compra o asuntos delicados.">Detect language, translate, and identify questions, complaints, buying intent, or sensitive issues.</T></p></article>
          <article className="card"><div className="number">03</div><h3><T es="Responde">Respond</T></h3><p><T es="Elige y edita una respuesta de IA y cópiala en la publicación original en el idioma del espectador.">Choose and edit an AI draft, then copy the native-language reply back to the original post.</T></p></article>
        </div>
      </section>

      <section className="split">
        <div><p className="eyebrow"><T es="PARA CREADORES">FOR INFLUENCERS</T></p><h2><T es="Tu audiencia es global. El idioma no tiene que ser una barrera.">Your audience is global. Your language doesn&apos;t have to be.</T></h2><p><T es="Responde más rápido a espectadores internacionales y descubre oportunidades de ventas de afiliados, membresías y seguidores fieles.">Answer international viewers faster and find comments that can become affiliate sales, memberships, or loyal followers.</T></p></div>
        <div><p className="eyebrow"><T es="PARA EMPRESAS">FOR BUSINESSES</T></p><h2><T es="Cada comentario puede convertirse en una interacción con un cliente.">Every comment can become a customer interaction.</T></h2><p><T es="Atiende preguntas frecuentes, descubre clientes potenciales y deriva las quejas delicadas a una persona.">Handle routine questions, discover leads, and send sensitive complaints to a person for review.</T></p></div>
      </section>

      <section id="pricing" className="section pricingSection">
        <p className="eyebrow"><T es="PRECIOS SENCILLOS">SIMPLE MONTHLY PRICING</T></p>
        <h2><T es="Empieza gratis. Crece con tu audiencia.">Start free. Grow when your audience does.</T></h2>
        <p className="pricingLead"><T es="Una interacción es un comentario procesado con IA, incluida su traducción, análisis y borrador de respuesta.">An interaction is one comment processed with AI, including its translation, analysis, and reply draft.</T></p>
        <div className="pricingGrid">
          <article className="pricingCard">
            <p className="planName"><T es="Gratis">Free</T></p>
            <div className="price"><span>$0</span></div>
            <p className="planSummary"><T es="Prueba Commentaid antes de elegir un plan de pago.">Try Commentaid before choosing a paid plan.</T></p>
            <ul>
              <li><T es="10 interacciones con IA">10 AI comment interactions</T></li>
              <li><T es="Traducción y borradores de respuesta">Translation and reply drafts</T></li>
              <li><T es="Tú apruebas cada respuesta publicada">You approve every posted reply</T></li>
            </ul>
            <Link className="button secondary wide" href="/login?mode=signup&amp;next=%2Fdashboard"><T es="Empieza gratis">Start free</T></Link>
          </article>

          <article className="pricingCard featured">
            <span className="planBadge"><T es="POPULAR">POPULAR</T></span>
            <p className="planName"><T es="Creador">Creator</T></p>
            <div className="price"><span>$2.99</span><small><T es="/mes">/month</T></small></div>
            <p className="annualPrice"><T es="o $19.95/año">or $19.95/year</T></p>
            <p className="planSummary"><T es="Para creadores que buscan una comunidad activa.">For creators building an engaged community.</T></p>
            <ul>
              <li><T es="100 interacciones con IA">100 AI comment interactions</T></li>
              <li><T es="Comunicación por correo con el creador">Email communication with the creator</T></li>
              <li><T es="Respuestas sujetas a tu aprobación">Approval-based reply workflow</T></li>
            </ul>
            <Link className="button primary wide" href="/login?mode=signup&amp;next=%2Fdashboard%3Fplan%3Dcreator"><T es="Elegir Creador">Choose Creator</T></Link>
          </article>

          <article className="pricingCard">
            <p className="planName"><T es="Ilimitado">Unlimited</T></p>
            <div className="price"><span>$9.95</span><small><T es="/mes">/month</T></small></div>
            <p className="annualPrice"><T es="o $99.00/año">or $99.00/year</T></p>
            <p className="planSummary"><T es="Para canales activos con un flujo constante de comentarios.">For active channels with a steady comment volume.</T></p>
            <ul>
              <li><T es="Interacciones con IA ilimitadas">Unlimited AI comment interactions</T></li>
              <li><T es="Gestión de canales conectados">Connected-channel management</T></li>
              <li><T es="Borradores de IA con aprobación del creador">AI drafts with creator approval</T></li>
            </ul>
            <Link className="button secondary wide" href="/login?mode=signup&amp;next=%2Fdashboard%3Fplan%3Dunlimited"><T es="Elegir Ilimitado">Choose Unlimited</T></Link>
          </article>

        </div>
        <p className="pricingNote"><T es="Precios en USD, mensuales y anuales. El pago debe estar configurado para el periodo elegido. Los propietarios autorizan el acceso mediante Google y mantienen el control de su conexión.">Monthly and annual pricing shown; subscription checkout must be configured for the selected billing period. Channel owners authorize access through Google and remain in control of their connection.</T></p>
      </section>

      <section className="section authority">
        <p className="eyebrow"><T es="TÚ CONTROLAS LA IA">YOU CONTROL THE AI</T></p>
        <h2><T es="Elige el nivel de autorización.">Choose the authority level.</T></h2>
        <div className="levels"><span><T es="Solo traducir">Translate Only</T></span><span><T es="Sugerencias de IA">AI Suggest</T></span><span><T es="Copiar y pegar">Copy &amp; Paste</T></span><span><T es="Respuesta automática">Auto Reply</T></span><span><T es="Revisión humana">Human Escalation</T></span></div>
      </section>

      <section className="cta">
        <div><p className="eyebrow">COMMENTAID</p><h2><T es="Cada comentario merece una respuesta.">Every comment deserves an answer.</T></h2><p><T es="Empieza copiando y pegando de forma segura. Conecta la publicación directa cuando estés listo.">Start with the safe copy-and-paste bridge. Connect direct publishing when you are ready.</T></p></div>
        <Link className="button light" href="/login"><T es="Abrir panel">Open dashboard</T></Link>
      </section>

      <footer><div className="brand">Commentaid</div><p><T es="Traduce. Responde. Resuelve. Crece.">Translate. Respond. Resolve. Grow.</T></p><p>© 2026 Commentaid</p></footer>
    </main>
    </LocaleProvider>
  );
}
