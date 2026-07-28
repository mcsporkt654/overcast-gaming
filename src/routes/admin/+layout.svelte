<script>
  import { page } from '$app/stores';
  import { invalidateAll, goto } from '$app/navigation';

  /** @type {import('./$types').LayoutData} */
  export let data;

  let password = '';
  let loginError = '';
  let loggingIn = false;

  const tabs = [
    { href: '/admin/roster', label: '➕ Roster' },
    { href: '/admin/match', label: '⚔ Record a Match' }
  ];

  async function login() {
    if (loggingIn) return;
    loggingIn = true;
    loginError = '';
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.success) {
        password = '';
        await invalidateAll();
      } else if (res.status === 429) {
        loginError = 'Too many attempts.' + (body.retryAfterSeconds ? ` Wait ${body.retryAfterSeconds}s.` : '');
      } else {
        loginError = body.error || 'Invalid access code. Try again.';
      }
    } catch {
      loginError = 'Server error. Try again.';
    } finally {
      loggingIn = false;
    }
  }

  async function logout() {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // Ignore transport failures — still drop back to the login screen.
    }
    await goto('/admin');
    await invalidateAll();
  }
</script>

{#if !data.admin}
  <div class="login-screen">
    <div class="login-card">
      <h2>☠ Command Access</h2>
      <p>Enter your access code to manage the league.</p>
      <form on:submit|preventDefault={login}>
        <div class="form-group">
          <label for="password-input">Access Code</label>
          <!-- svelte-ignore a11y-autofocus -->
          <input
            type="password"
            id="password-input"
            placeholder="Enter password..."
            autocomplete="current-password"
            bind:value={password}
          />
        </div>
        {#if loginError}
          <div class="alert error">{loginError}</div>
        {/if}
        <button class="btn btn-primary" style="width:100%; margin-top:0.5rem" type="submit" disabled={loggingIn}>
          {loggingIn ? 'Authenticating...' : 'Authenticate'}
        </button>
      </form>
      <p style="margin-top:1.5rem; font-size:0.72rem; color:var(--text-muted)">
        Authorized commanders only. All actions are logged.
      </p>
    </div>
  </div>
{:else}
  <div class="admin-panel visible">
    <div class="admin-header">
      <div class="admin-header-inner">
        <div>
          <h1>League <span style="color:var(--accent)">Admin</span></h1>
          <p>Manage the roster and record match results.</p>
        </div>
        <button class="btn btn-outline" type="button" style="font-size:0.72rem" on:click={logout}>⬅ Logout</button>
      </div>

      <div class="admin-header-inner">
        <!-- A <div> rather than a <nav>: style.css styles the bare `nav` element
             (sticky, its own background) for the site header, which would bleed
             into this tab strip. role="navigation" keeps the landmark. -->
        <div class="admin-tabs" role="navigation" aria-label="Admin sections">
          {#each tabs as tab}
            <a
              href={tab.href}
              class="admin-tab"
              class:active={$page.url.pathname === tab.href}
              aria-current={$page.url.pathname === tab.href ? 'page' : undefined}
            >
              {tab.label}
            </a>
          {/each}
        </div>
      </div>
    </div>

    <slot />
  </div>
{/if}

<style>
  .admin-header {
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
    padding: 2rem var(--gutter) 0;
  }

  .admin-header-inner {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .admin-header h1 {
    font-size: 1.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .admin-header p {
    color: var(--text-muted);
    font-size: 0.85rem;
    margin-top: 0.3rem;
  }

  .admin-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    margin-top: 1.5rem;
  }

  .admin-tab {
    padding: 0.65rem 1.1rem;
    border: 1px solid transparent;
    border-bottom: none;
    border-radius: var(--radius) var(--radius) 0 0;
    font-family: var(--font-gothic);
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
    text-decoration: none;
    transition: color 0.2s, background 0.2s;
  }

  .admin-tab:hover {
    color: var(--text-primary);
    background: rgba(var(--accent-rgb), 0.06);
  }

  .admin-tab.active {
    color: var(--accent);
    background: var(--bg-dark);
    border-color: var(--border);
  }
</style>
