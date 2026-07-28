<svelte:head>
  <title>Admin — Overcast Wargaming League</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<section class="section">
  <div class="admin-hub">
    <a class="admin-hub-card" href="/admin/roster">
      <h3>➕ Roster</h3>
      <p>Add a commander to the league roster — armies, social links, and a public photo with a live preview before you submit.</p>
      <span class="admin-hub-go">Manage roster →</span>
    </a>

    <a class="admin-hub-card" href="/admin/match">
      <h3>⚔ Record a Match</h3>
      <p>Log a battle result: armies and subfactions, mission, objective scores, key units, and battle notes.</p>
      <span class="admin-hub-go">Record a match →</span>
    </a>
  </div>
</section>

<style>
  .admin-hub {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }

  .admin-hub-card {
    display: block;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 2rem 1.75rem;
    text-decoration: none;
    transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
  }

  .admin-hub-card:hover {
    border-color: var(--accent);
    transform: translateY(-2px);
    box-shadow: var(--glow);
  }

  .admin-hub-card h3 {
    font-size: 1.1rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--accent);
    margin-bottom: 0.75rem;
  }

  .admin-hub-card p {
    color: var(--text-secondary);
    font-size: 0.88rem;
    line-height: 1.6;
  }

  .admin-hub-go {
    display: inline-block;
    margin-top: 1.25rem;
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  @media (max-width: 900px) {
    .admin-hub { grid-template-columns: 1fr; }
  }
</style>
