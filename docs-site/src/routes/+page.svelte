<svelte:head>
  <title>@prcompass/core — deterministic risk engine for git history</title>
  <meta
    name="description"
    content="Mining → churn → cochange → hotspots → risk. ~7.5 ms over 10 000 commits. Same input always produces the same bytes."
  />
</svelte:head>

<section class="hero">
  <div class="hero-grid">
    <div class="hero-copy">
      <span class="badge">
        <span class="dot" aria-hidden="true"></span>
        v0.1 · Apache-2.0 · ESM · Node 20+
      </span>
      <h1>
        Risk metrics from your<br />
        <span class="accent">commit history</span>. Always reproducible.
      </h1>
      <p class="lede">
        <strong>@prcompass/core</strong> turns a list of git commits into
        per-file risk metrics. No network. No LLM. No database. Same input
        always produces the same output, bit-for-bit.
      </p>

      <div class="cta">
        <a class="btn primary" href="/docs">Read the docs</a>
        <a class="btn ghost" href="/pipeline">See the pipeline</a>
      </div>

      <pre class="install"><span class="prompt">$</span> npm install @prcompass/core</pre>
    </div>

    <aside class="demo">
      <div class="demo-tab">
        <span class="dots" aria-hidden="true">
          <i></i><i></i><i></i>
        </span>
        <span class="filename">analyze.ts</span>
      </div>
      <pre class="demo-code"><code><span class="kw">import</span> &lbrace;
  mineCommits, computeChurn, computeCochange,
  computeHotspots, computeRisk
&rbrace; <span class="kw">from</span> <span class="str">'@prcompass/core'</span>;

<span class="cmt">// 1. You produce CommitRecord[] yourself.</span>
<span class="kw">const</span> commits = <span class="kw">await</span> <span class="fn">listCommits</span>(repo);

<span class="cmt">// 2. Mine: classify each commit as bug-fix or not.</span>
<span class="kw">const</span> mined = <span class="fn">mineCommits</span>(&lbrace; commits &rbrace;);

<span class="cmt">// 3. Per-file metrics.</span>
<span class="kw">const</span> churn    = <span class="fn">computeChurn</span>(&lbrace; mined &rbrace;);
<span class="kw">const</span> cochange = <span class="fn">computeCochange</span>(&lbrace; mined &rbrace;);
<span class="kw">const</span> hotspots = <span class="fn">computeHotspots</span>(&lbrace; mined &rbrace;);

<span class="cmt">// 4. Combine — every claim grounded by SHA.</span>
<span class="kw">const</span> risk = <span class="fn">computeRisk</span>(&lbrace; mined, hotspots, churn, cochange &rbrace;);
</code></pre>
    </aside>
  </div>
</section>

<section class="features">
  <div class="features-inner">
    <div class="feature">
      <div class="feature-icon">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
          <path d="M12 7v6l3 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </div>
      <h3>Deterministic by construction</h3>
      <p>
        No <code>Date.now()</code>, no <code>Math.random()</code>, no
        unordered iteration in business logic. Same input → same output,
        always.
      </p>
    </div>

    <div class="feature">
      <div class="feature-icon">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 12h4l3-9 4 18 3-9h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <h3>~7.5 ms over 10 k commits</h3>
      <p>
        Full pipeline median: <code>analyze()</code> processes 10 000
        commits / 500 files in ~7.5 ms. Cochange is the heaviest engine and
        still fits in 5 ms.
      </p>
    </div>

    <div class="feature">
      <div class="feature-icon">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
        </svg>
      </div>
      <h3>No fabrication</h3>
      <p>
        Every numeric claim points to real commit SHAs in
        <code>groundedIn</code> — or it's <code>null</code>. The engine never
        defaults to <code>0</code> when it has no signal.
      </p>
    </div>

    <div class="feature">
      <div class="feature-icon">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </div>
      <h3>Inputs in, data out</h3>
      <p>
        No <code>fetch</code>, no <code>octokit</code>, no
        <code>child_process</code>, no DB clients. The package is a pure
        function from <code>CommitRecord[]</code> to risk metrics.
      </p>
    </div>

    <div class="feature">
      <div class="feature-icon">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 7l9-4 9 4-9 4-9-4z M3 12l9 4 9-4 M3 17l9 4 9-4" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
        </svg>
      </div>
      <h3>Five composable engines</h3>
      <p>
        <code>mineCommits</code> · <code>computeChurn</code> ·
        <code>computeCochange</code> · <code>computeHotspots</code> ·
        <code>computeRisk</code>. Use <code>analyze()</code> or wire them up
        yourself.
      </p>
    </div>

    <div class="feature">
      <div class="feature-icon">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </div>
      <h3>Versioned schema</h3>
      <p>
        Output carries an <code>ANALYSIS_SCHEMA_VERSION</code>. Pin to the
        major when you integrate; new metrics arrive as new top-level keys
        without breaking parsers.
      </p>
    </div>
  </div>
</section>

<section class="ports">
  <div class="ports-inner">
    <div class="ports-copy">
      <h2>Bring your own git driver</h2>
      <p>
        The engine consumes <code>CommitRecord[]</code> — pure data. Two
        <code>git log</code> passes, parsed by the bundled
        <code>parseCommitMetadata</code> /
        <code>parseCommitFiles</code>, and you have a full input. The CLI
        package ships a ready-made <code>LocalAdapter</code> if you'd
        rather skip the wiring.
      </p>
      <a class="btn ghost compact" href="/docs#producing-input"
        >Producing CommitRecord[]
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </a>
    </div>
    <pre class="ports-code"><code><span class="kw">import</span> &lbrace;
  parseCommitMetadata, parseCommitFiles, <span class="kw">type</span> CommitRecord
&rbrace; <span class="kw">from</span> <span class="str">'@prcompass/core'</span>;

<span class="kw">const</span> META  = <span class="str">"%x1e%H%x1f%P%x1f%aN%x1f%aI%x1f%B"</span>;
<span class="kw">const</span> FILES = <span class="str">"\x1eCOMMIT %H"</span>;

<span class="kw">const</span> meta  = <span class="fn">parseCommitMetadata</span>(metaStdout);
<span class="kw">const</span> files = <span class="fn">parseCommitFiles</span>(fileStdout);

<span class="kw">const</span> commits: CommitRecord[] = meta.<span class="fn">map</span>(
  (m) => (&lbrace; ...m, <span class="prop">filesTouched</span>: files.<span class="fn">get</span>(m.sha) ?? [] &rbrace;)
);
</code></pre>
  </div>
</section>

<section class="cta-band">
  <div class="cta-band-inner">
    <h2>Pure data in. Grounded metrics out.</h2>
    <p>No clock. No PRNG. No network. Run twice, get the same bytes.</p>
    <div class="cta">
      <a class="btn primary" href="/docs">Read the guide</a>
      <a class="btn ghost" href="/benchmarks">See benchmarks</a>
    </div>
  </div>
</section>

<style>
  .hero {
    padding: var(--sp-9) var(--sp-5) var(--sp-8);
    background:
      radial-gradient(circle at 80% -10%, var(--c-accent-soft), transparent 50%),
      radial-gradient(circle at 0% 100%, var(--c-bg-alt), transparent 60%),
      var(--c-bg);
    border-bottom: 1px solid var(--c-border);
  }

  .hero-grid {
    max-width: var(--wide-max);
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1.1fr 1fr;
    gap: var(--sp-7);
    align-items: center;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    color: var(--c-text-muted);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 4px 10px;
    border-radius: 999px;
    box-shadow: var(--sh-sm);
    margin-bottom: var(--sp-5);
  }

  .badge .dot { display: inline-block; width: 6px; height: 6px; background: var(--c-good); border-radius: 999px; }

  .hero h1 {
    font-size: clamp(2.25rem, 4.5vw, var(--fs-4xl));
    line-height: 1.05;
    letter-spacing: -0.04em;
    margin-bottom: var(--sp-5);
  }

  .accent { color: var(--c-accent); font-style: italic; font-weight: 700; }

  .lede {
    font-size: var(--fs-md);
    color: var(--c-text-muted);
    max-width: 42ch;
    margin-bottom: var(--sp-6);
  }

  .lede strong { color: var(--c-text); font-weight: 600; }

  .cta { display: flex; flex-wrap: wrap; gap: var(--sp-3); margin-bottom: var(--sp-5); }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    padding: 0.65rem 1.1rem;
    border-radius: var(--r-md);
    font-size: var(--fs-sm);
    font-weight: 500;
    text-decoration: none;
    border: 1px solid transparent;
  }

  .btn.primary { background: var(--c-text); color: var(--c-bg); border-color: var(--c-text); }
  .btn.primary:hover { background: var(--c-accent); border-color: var(--c-accent); color: var(--c-accent-fg); text-decoration: none; }
  .btn.ghost { background: transparent; color: var(--c-text); border-color: var(--c-border-strong); }
  .btn.ghost:hover { background: var(--c-bg-alt); text-decoration: none; }
  .btn.compact { padding: 0.5rem 0.85rem; font-size: var(--fs-sm); }

  .install {
    display: inline-block;
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    padding: var(--sp-2) var(--sp-4);
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    color: var(--c-text);
    box-shadow: var(--sh-sm);
    margin: 0;
  }

  .install .prompt { color: var(--c-text-subtle); margin-right: var(--sp-2); user-select: none; }

  .demo {
    background: var(--c-code-bg);
    border: 1px solid var(--c-border);
    border-radius: var(--r-lg);
    box-shadow: var(--sh-lg);
    overflow: hidden;
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
  }

  .demo-tab {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-3) var(--sp-4);
    border-bottom: 1px solid var(--c-border);
    background: var(--c-bg-alt);
    color: var(--c-text-subtle);
    font-size: var(--fs-xs);
  }

  .dots { display: inline-flex; gap: 6px; }
  .dots i { width: 10px; height: 10px; border-radius: 999px; background: var(--c-border-strong); display: inline-block; }
  .dots i:nth-child(1) { background: var(--c-accent); opacity: 0.55; }
  .dots i:nth-child(2) { background: #f59e0b; opacity: 0.55; }
  .dots i:nth-child(3) { background: var(--c-good); opacity: 0.55; }

  .filename { font-family: var(--font-mono); }

  .demo-code {
    margin: 0;
    padding: var(--sp-5);
    background: transparent;
    color: var(--c-code-text);
    overflow-x: auto;
    font-size: var(--fs-sm);
    line-height: 1.65;
    font-family: var(--font-mono);
  }

  .demo-code code { background: transparent; border: 0; padding: 0; color: inherit; font-family: var(--font-mono); font-size: inherit; }
  .demo-code .kw   { color: var(--c-code-keyword); }
  .demo-code .str  { color: var(--c-code-string); }
  .demo-code .fn   { color: var(--c-code-fn); }
  .demo-code .cmt  { color: var(--c-code-comment); font-style: italic; }
  .demo-code .prop { color: var(--c-code-prop); }

  .features { padding: var(--sp-9) var(--sp-5); }

  .features-inner {
    max-width: var(--wide-max);
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--sp-5);
  }

  .feature {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    padding: var(--sp-5);
    border-radius: var(--r-lg);
  }

  .feature-icon {
    width: 36px; height: 36px;
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--c-bg-alt); border: 1px solid var(--c-border);
    border-radius: var(--r-md); color: var(--c-accent);
    margin-bottom: var(--sp-4);
  }

  .feature-icon svg { width: 18px; height: 18px; }

  .feature h3 { font-size: var(--fs-md); margin: 0 0 var(--sp-2); letter-spacing: -0.02em; }
  .feature p { color: var(--c-text-muted); margin: 0; font-size: var(--fs-sm); line-height: 1.65; }

  .ports {
    padding: var(--sp-8) var(--sp-5);
    background: var(--c-bg-alt);
    border-top: 1px solid var(--c-border);
    border-bottom: 1px solid var(--c-border);
  }

  .ports-inner {
    max-width: var(--wide-max);
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1.2fr;
    gap: var(--sp-7);
    align-items: center;
  }

  .ports-copy h2 { margin: 0 0 var(--sp-3); font-size: var(--fs-2xl); letter-spacing: -0.03em; }
  .ports-copy p { color: var(--c-text-muted); margin-bottom: var(--sp-5); font-size: var(--fs-md); }

  .ports-code {
    margin: 0;
    background: var(--c-code-bg);
    border: 1px solid var(--c-border);
    border-radius: var(--r-lg);
    padding: var(--sp-5);
    overflow-x: auto;
    color: var(--c-code-text);
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    line-height: 1.65;
    box-shadow: var(--sh-md);
  }

  .ports-code code { background: transparent; border: 0; padding: 0; color: inherit; font-family: var(--font-mono); }
  .ports-code .kw   { color: var(--c-code-keyword); }
  .ports-code .str  { color: var(--c-code-string); }
  .ports-code .fn   { color: var(--c-code-fn); }
  .ports-code .prop { color: var(--c-code-prop); }

  .cta-band { padding: var(--sp-9) var(--sp-5); text-align: center; }
  .cta-band-inner { max-width: 40rem; margin: 0 auto; }
  .cta-band h2 { font-size: var(--fs-2xl); margin-bottom: var(--sp-2); letter-spacing: -0.03em; }
  .cta-band p { color: var(--c-text-muted); margin-bottom: var(--sp-5); font-size: var(--fs-md); }
  .cta-band .cta { justify-content: center; }

  @media (max-width: 960px) {
    .hero { padding: var(--sp-7) var(--sp-5) var(--sp-7); }
    .hero-grid { grid-template-columns: 1fr; gap: var(--sp-6); }
    .features-inner { grid-template-columns: 1fr; }
    .ports-inner { grid-template-columns: 1fr; }
  }

  @media (max-width: 720px) {
    .hero h1 { font-size: clamp(2rem, 8vw, 2.6rem); }
  }
</style>
