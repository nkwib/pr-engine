<script>
  let { size = 28 } = $props();
</script>

<span class="logo" style="--s: {size}px">
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    aria-hidden="true"
    role="img"
    fill="none"
  >
    <circle cx="16" cy="16" r="13" stroke="currentColor" stroke-width="1.6" />
    <circle cx="16" cy="16" r="2.5" fill="currentColor" />
    <path d="M16 6 L18 14 L16 16 L14 14 Z" fill="currentColor" />
  </svg>
  <span class="wordmark">pr-engine</span>
</span>

<style>
  .logo {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    color: var(--c-text);
    font-weight: 600;
    letter-spacing: -0.02em;
    font-size: 1.05rem;
  }

  .wordmark {
    font-family: var(--font-mono);
    font-size: 0.95rem;
  }
</style>
