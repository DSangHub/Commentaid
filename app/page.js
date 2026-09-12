import Link from "next/link";

export default function Home() {
  return (
    <main>
      <nav className="nav">
        <div className="brand">Commentaid</div>
        <div className="navActions">
          <a className="navLink" href="#how">How it works</a>
          <Link className="button primary compact" href="/login">Open Commentaid</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="badge">AI COMMENT ASSISTANT</div>
        <h1>Turn comments into <span>conversations.</span></h1>
        <p className="lead">
          One AI bridge for influencers and businesses to understand, translate,
          answer, and act on comments—in the viewer&apos;s own language.
        </p>
        <div className="actions">
          <Link href="/login" className="button primary">Start managing comments</Link>
          <a href="#how" className="button secondary">See how it works</a>
        </div>

        <div className="demoCard">
          <div className="demoHeader"><span className="dot" /> Live translation example</div>
          <div className="message"><div className="label">Viewer · Spanish</div><strong>¿Dónde puedo comprar esta camisa?</strong></div>
          <div className="arrow">↓</div>
          <div className="message translated"><div className="label">Commentaid translation</div><strong>Where can I buy this shirt?</strong></div>
          <div className="arrow">↓</div>
          <div className="message reply"><div className="label">Creator replies in English</div><strong>You can find it at the link in my description.</strong></div>
          <div className="arrow">↓</div>
          <div className="message translated"><div className="label">Copy reply in Spanish</div><strong>Puedes encontrarla en el enlace de mi descripción.</strong></div>
        </div>
      </section>

      <section id="how" className="section">
        <p className="eyebrow">HOW IT WORKS</p>
        <h2>Keep your comments. Add Commentaid.</h2>
        <div className="grid">
          <article className="card"><div className="number">01</div><h3>Paste or connect</h3><p>Paste a comment from any app or load recent YouTube comments from your channel.</p></article>
          <article className="card"><div className="number">02</div><h3>Understand</h3><p>Detect language, translate, and identify questions, complaints, buying intent, or sensitive issues.</p></article>
          <article className="card"><div className="number">03</div><h3>Respond</h3><p>Choose and edit an AI draft, then copy the native-language reply back to the original post.</p></article>
        </div>
      </section>

      <section className="split">
        <div><p className="eyebrow">FOR INFLUENCERS</p><h2>Your audience is global. Your language doesn&apos;t have to be.</h2><p>Answer international viewers faster and find comments that can become affiliate sales, memberships, or loyal followers.</p></div>
        <div><p className="eyebrow">FOR BUSINESSES</p><h2>Every comment can become a customer interaction.</h2><p>Handle routine questions, discover leads, and send sensitive complaints to a person for review.</p></div>
      </section>

      <section className="section authority">
        <p className="eyebrow">YOU CONTROL THE AI</p>
        <h2>Choose the authority level.</h2>
        <div className="levels"><span>Translate Only</span><span>AI Suggest</span><span>Copy &amp; Paste</span><span>Auto Reply</span><span>Human Escalation</span></div>
      </section>

      <section className="cta">
        <div><p className="eyebrow">COMMENTAID</p><h2>Every comment deserves an answer.</h2><p>Start with the safe copy-and-paste bridge. Connect direct publishing when you are ready.</p></div>
        <Link className="button light" href="/login">Open dashboard</Link>
      </section>

      <footer><div className="brand">Commentaid</div><p>Translate. Respond. Resolve. Grow.</p><p>© 2026 Commentaid</p></footer>
    </main>
  );
}
