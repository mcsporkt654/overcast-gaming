<script>
  import { reveal, countUp } from '$lib/actions/inView.js';
  import { matchVp, formatDiff } from '$lib/vp.js';
  import { shortDate, mediumDate, record, rankLabel } from '$lib/format.js';

  /** @type {import('./$types').PageData} */
  export let data;

  const MERCH_URL = 'https://arma.gg/collections/overcast';

  $: stats = data.stats;
  $: standings = (stats?.standings ?? []).slice(0, 6);
  $: leaderVp = standings[0]?.totalVp ?? 0;
  $: factionCount = stats?.armyWinRates?.length ?? 0;
  $: recentMatches = (data.recentMatches ?? []).slice(0, 5);
  $: posts = data.posts ?? [];
  $: featured = posts[0] ?? null;
  $: secondary = posts.slice(1, 3);

  // Ticker results, newest first. Below five entries the marquee loop is more
  // gap than content, so the strip sits still instead.
  $: tickerItems = (data.recentMatches ?? []).slice(0, 5).map((m) => {
    const { diff } = matchVp(m);
    const outcome = m.result === 'W' ? 'WIN' : m.result === 'L' ? 'LOSS' : 'DRAW';
    const delta = diff === null ? '' : ` ${formatDiff(diff)}`;
    return `${m.playerName} · ${m.armyUsed} — ${outcome}${delta}`;
  });
  $: tickerScrolls = tickerItems.length >= 5;

  /** Bar width relative to the league leader. */
  function barWidth(totalVp) {
    if (!leaderVp) return '0%';
    return `${Math.max(6, Math.round((totalVp / leaderVp) * 100))}%`;
  }
</script>

<svelte:head>
  <title>Overcast Wargaming League — Warhammer 40K League | Portland, OR</title>
  <meta
    name="description"
    content="Overcast Wargaming League is a Warhammer 40K competitive gaming group based in Portland, Oregon. Track roster, match stats, and league standings."
  />
</svelte:head>

<!-- Hero -->
<section class="hero">
  <div class="page hero-inner">
    <div class="hero-copy">
      <div class="eyebrow">Portland, Oregon / Warhammer 40,000 League</div>
      <h1>Overcast<br />Wargaming<br /><em>League</em></h1>
      <p class="lede">
        For the glory of the battle. For the honor of the faction. A competitive Warhammer 40K
        league — roster, battles, and the standings of the OWL.
      </p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="/roster">View Roster</a>
        <a class="btn btn-secondary" href="/stats#matches">Match Stats</a>
        <a class="btn btn-secondary" href="/stats#standings">The OWL</a>
      </div>
      <div class="social">
        <a href="https://discord.gg/zKSgE9AwEa" target="_blank" rel="noopener">Discord</a>
        <span>·</span>
        <a href="https://www.instagram.com/overcastwargaming/" target="_blank" rel="noopener">Instagram</a>
        <span>·</span>
        <a href="https://www.youtube.com/@overcastwargaming" target="_blank" rel="noopener">YouTube</a>
      </div>
    </div>
    <aside class="owl-block">
      <img src="/owl.png" alt="Overcast — witch-owl mascot" width="680" height="680" />
    </aside>
  </div>

  <!-- Results ticker -->
  {#if tickerItems.length}
    <div class="ticker">
      {#if tickerScrolls}
        <!-- Content is duplicated so the translateX(-50%) loop point is seamless. -->
        <div class="ticker-track">
          {#each [...tickerItems, ...tickerItems] as item}
            <span>{item}</span>
          {/each}
        </div>
      {:else}
        <div class="ticker-static">
          {#each tickerItems as item}
            <span>{item}</span>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</section>

<!-- Stats band -->
<section class="stats-band">
  <div class="page">
    <div class="stats-grid">
      <div class="stat">
        <div class="stat-num" use:countUp={stats?.totalPlayers ?? 0}>{stats?.totalPlayers ?? 0}</div>
        <div class="stat-label">Active Players</div>
        <div class="stat-sub">
          {factionCount === 1 ? 'across 1 faction' : `across ${factionCount} factions`}
        </div>
      </div>
      <div class="stat">
        <div class="stat-num" use:countUp={stats?.totalGames ?? 0}>{stats?.totalGames ?? 0}</div>
        <div class="stat-label">Battles Logged</div>
        <div class="stat-sub">Season 3 to date</div>
      </div>
      <div class="stat">
        <div class="stat-num stat-text">{stats?.mostPlayedArmy || '—'}</div>
        <div class="stat-label">Top Army Fielded</div>
        <div class="stat-sub">most-played faction</div>
      </div>
    </div>
  </div>
</section>

<!-- Live standings -->
<section class="section page">
  <div class="section-head">
    <div>
      <div class="eyebrow">The OWL · Season 3</div>
      <h2>Live League Standings</h2>
    </div>
    <a class="btn btn-ghost" href="/stats#standings">Full standings →</a>
  </div>

  {#if standings.length}
    <div class="lb">
      {#each standings as row (row.id)}
        <a
          class="lb-row"
          class:is-leader={row.rank === 1}
          href="/players/{row.id}"
          use:reveal
        >
          <div class="lb-rank">{rankLabel(row.rank)}</div>
          <div class="lb-name">
            {row.name}<span class="lb-army">{row.army || 'No army logged'}</span>
          </div>
          <div class="lb-bar">
            <span class="lb-fill" style="--w:{barWidth(row.totalVp)}"></span>
          </div>
          <div class="lb-wl">{record(row.wins, row.losses, row.draws)}</div>
          <div class="lb-vp">{row.totalVp}<em>VP</em></div>
        </a>
      {/each}
    </div>
  {:else}
    <p class="empty-row">No standings yet — the first logged battle starts the season.</p>
  {/if}
</section>

<!-- Recent battles -->
<section class="section page">
  <div class="section-head">
    <div>
      <div class="eyebrow">Battlefield Log</div>
      <h2>Recent Battles</h2>
    </div>
    <a class="btn btn-ghost" href="/stats#matches">All stats →</a>
  </div>

  <div class="table-scroll">
    <table class="table">
      <caption class="visually-hidden">The five most recent battles in the league</caption>
      <thead>
        <tr>
          <th>Date</th>
          <th>Player</th>
          <th>Army</th>
          <th>Opponent</th>
          <th>Opp. Army</th>
          <th>Result</th>
          <th style="text-align:right">Pts Diff</th>
        </tr>
      </thead>
      <tbody>
        {#each recentMatches as match (match.id)}
          {@const vp = matchVp(match)}
          <tr>
            <td><a href="/matches/{match.id}">{shortDate(match.date)}</a></td>
            <td>{match.playerName}</td>
            <td class="tmut">{match.armyUsed}</td>
            <td>{match.opponentName}</td>
            <td class="tmut">{match.opponentArmy}</td>
            <td>
              {#if match.result === 'W'}
                <span class="tag tag-accent">WIN</span>
              {:else if match.result === 'L'}
                <span class="tag tag-outline">LOSS</span>
              {:else}
                <span class="tag tag-neutral">DRAW</span>
              {/if}
            </td>
            <td class="tnum" class:pos={vp.diff > 0} class:neg={vp.diff !== null && vp.diff <= 0}>
              {formatDiff(vp.diff)}
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="7" class="empty-row">No battles recorded yet.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<!-- Community feed -->
<section class="section page">
  <div class="section-head">
    <div>
      <div class="eyebrow">High Command Bulletin</div>
      <h2>Community News Feed</h2>
    </div>
    <a class="btn btn-ghost" href="/community">All posts →</a>
  </div>

  {#if featured}
    <div class="news-grid">
      <article class="feat">
        {#if featured.image}
          <img class="feat-media" src={featured.image} alt="" loading="lazy" />
        {:else}
          <div class="ph"><span>Featured&nbsp;Dispatch</span></div>
        {/if}
        <div class="feat-body">
          <div class="card-kicker">{featured.category} · {mediumDate(featured.date)}</div>
          <h3>{featured.title}</h3>
          <p>{featured.excerpt}</p>
          <a class="btn btn-primary" href="/news/{featured.slug}">Open Dispatch →</a>
        </div>
      </article>

      <div class="news-col">
        {#each secondary as post (post.slug)}
          <article class="card">
            <div class="card-kicker">{post.category} · {mediumDate(post.date)}</div>
            <h4 class="card-title">{post.title}</h4>
            <p class="card-body">{post.excerpt}</p>
            <div class="card-meta">
              <a class="btn btn-ghost" href="/news/{post.slug}">Read dispatch →</a>
            </div>
          </article>
        {/each}
      </div>
    </div>
  {:else}
    <p class="empty-row">No dispatches published yet.</p>
  {/if}
</section>

<!-- Partners -->
<section class="section page">
  <div class="section-head">
    <div>
      <div class="eyebrow">Allies</div>
      <h2>Partners</h2>
    </div>
  </div>
  <div class="prt-grid">
    <div class="prt"><span>◇</span><b>Partner Slot</b></div>
    <div class="prt"><span>◇</span><b>Partner Slot</b></div>
    <div class="prt prt-cta">
      <b>Become a Partner</b>
      <a class="btn btn-ghost" href="https://discord.gg/zKSgE9AwEa" target="_blank" rel="noopener">
        Reach out on Discord →
      </a>
    </div>
  </div>
</section>

<!-- Merch band -->
<section class="merch-band">
  <div class="page merch">
    <div>
      <div class="card-kicker">Gear Up, Commander</div>
      <h3>Rep your faction.</h3>
      <p>Overcast merch — shirts, dice bags, tokens and accessories.</p>
    </div>
    <a class="btn btn-primary" href={MERCH_URL} target="_blank" rel="noopener">
      Visit the Merch Store →
    </a>
  </div>
</section>
