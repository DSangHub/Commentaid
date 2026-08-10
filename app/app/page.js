import "./globals.css";

export default function Home() {
  return (
    <main>
      <nav className="nav">
        <div className="brand">Commentaid</div>
        <a className="navLink" href="#early-access">Early Access</a>
      </nav>

      <section className="hero">
        <div className="badge">AI COMMENT ASSISTANT</div>
        <h1>Turn comments into <span>conversations.</span></h1>
        <p className="lead">
          Commentaid helps creators and businesses understand, translate,
          answer, and act on comments faster — in the viewer’s own language.
        </p>

        <div className="actions">
          <a href="#early-access" className="button primary">Join Early Access</a>
          <a href="#how" className="button secondary">See How It Works</a>
        </div>

        <div className="demoCard">
          <div className="demoHeader">
            <span className="dot"></span>
            Live translation example
          </div>

          <div className="message">
            <div className="label">Viewer · Spanish</div>
            <strong>¿Dónde puedo comprar esta camisa?</strong>
          </div>

          <div className="arrow">↓</div>

          <div className="message translated">
            <div className="label">Commentaid translation</div>
            <strong>Where can I buy this shirt?</strong>
          </div>

          <div className="arrow">↓</div>

          <div className="message reply">
            <div className="label">Creator replies in English</div>
            <strong>You can find it at the link in my description.</strong>
          </div>

          <div className="arrow">↓</div>

          <div className="message translated">
            <div className="label">Commentaid replies in Spanish</div>
            <strong>Puedes encontrarla en el enlace de mi descripción.</strong>
          </div>
        </div>
      </section>

      <section id="how" className="section">
        <p className="eyebrow">HOW IT WORKS</p>
        <h2>Keep your comments. Add Commentaid.</h2>

        <div className="grid">
          <article className="card">
            <div className="number">01</div>
            <h3>Connect</h3>
            <p>
              Connect your creator or business account. Commentaid works as an
              intelligence layer behind your existing comments.
            </p>
          </article>

          <article className="card">
            <div className="number">02</div>
            <h3>Understand</h3>
            <p>
              Detect language, translate comments, identify questions,
              complaints, buying intent, and conversations needing attention.
            </p>
          </article>

          <article className="card">
            <div className="number">03</div>
            <h3>Respond</h3>
            <p>
              Draft, approve, or automatically send authorized replies in the
              commenter’s language.
            </p>
          </article>
        </div>
      </section>

      <section className="split">
        <div>
          <p className="eyebrow">FOR CREATORS</p>
          <h2>Your audience is global. Your language doesn’t have to be.</h2>
          <p>
            Understand Western viewers, answer international fans faster, and
            identify comments that could become affiliate sales, memberships,
            or other opportunities.
          </p>
        </div>

        <div>
          <p className="eyebrow">FOR BUSINESSES</p>
          <h2>Every comment can become a customer interaction.</h2>
          <p>
            Resolve routine questions, escalate sensitive complaints, discover
            leads, and give your team control over how much authority the AI has.
          </p>
        </div>
      </section>

      <section className="section authority">
        <p className="eyebrow">YOU CONTROL THE AI</p>
        <h2>Choose the authority level.</h2>
        <div className="levels">
          <span>Translate Only</span>
          <span>AI Suggest</span>
          <span>Auto Reply</span>
          <span>Sales Agent</span>
          <span>Human Escalation</span>
        </div>
      </section>

      <section id="early-access" className="cta">
        <div>
          <p className="eyebrow">COMMENTAID</p>
          <h2>Every comment deserves an answer.</h2>
          <p>
            AI-powered multilingual engagement for creators and businesses.
          </p>
        </div>

        <a className="button light" href="mailto:hello@commentaid.com">
          Request Early Access
        </a>
      </section>

      <footer>
        <div className="brand">Commentaid</div>
        <p>Translate. Respond. Resolve. Grow.</p>
        <p>© 2026 Commentaid</p>
      </footer>
    </main>
  );
}
