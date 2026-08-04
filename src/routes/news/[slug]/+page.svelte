<script>
  import { page } from '$app/stores';
  import { longDate, mediumDate } from '$lib/format.js';

  /** @type {import('./$types').PageData} */
  export let data;

  $: post = data.post;
  $: related = data.related ?? [];
  $: body = Array.isArray(post?.body) ? post.body : post?.body ? [post.body] : [];
  $: canonical = $page.url.href;
  $: shareImage = post?.image ? new URL(post.image, $page.url.origin).href : '';
  $: byline = [post?.author, post?.readTime].filter(Boolean).join(' · ');
</script>

<svelte:head>
  <title>{post?.title ?? 'Dispatch'} — Overcast Wargaming League</title>
  <meta name="description" content={post?.excerpt ?? ''} />
  <!-- League links get shared in Discord; these give each dispatch its own unfurl. -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content={post?.title ?? 'Dispatch'} />
  <meta property="og:description" content={post?.excerpt ?? ''} />
  <meta property="og:url" content={canonical} />
  {#if shareImage}
    <meta property="og:image" content={shareImage} />
  {/if}
  <meta name="twitter:card" content={shareImage ? 'summary_large_image' : 'summary'} />
  <meta name="twitter:title" content={post?.title ?? 'Dispatch'} />
  <meta name="twitter:description" content={post?.excerpt ?? ''} />
  {#if shareImage}
    <meta name="twitter:image" content={shareImage} />
  {/if}
</svelte:head>

{#if !post}
  <section class="page-header page">
    <div class="eyebrow">High Command Bulletin</div>
    <h1>Dispatch Unavailable</h1>
    <p class="lede">This dispatch could not be loaded. Try again in a moment.</p>
    <div class="back-links"><a class="btn btn-secondary" href="/community">Back to community</a></div>
  </section>
{:else}
  <section class="page-header page">
    <div class="eyebrow">{post.category} · {longDate(post.date)}</div>
    <h1>{post.title}</h1>
    <p class="lede">{post.excerpt}</p>
    {#if byline}
      <p class="byline">{byline}</p>
    {/if}
    <div class="back-links">
      <a class="btn btn-secondary" href="/community">← All dispatches</a>
    </div>
  </section>

  <section class="section page">
    <article class="article">
      {#if post.image}
        <img class="article-media" src={post.image} alt="" />
      {/if}

      {#each body as paragraph}
        <p>{paragraph}</p>
      {/each}

      {#if post.highlights?.length}
        <div class="article-highlights">
          <h3>Field Notes</h3>
          <ul>
            {#each post.highlights as point}
              <li>{point}</li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if post.gallery?.length}
        <div class="article-gallery">
          {#each post.gallery as url}
            <img src={url} alt="" loading="lazy" />
          {/each}
        </div>
      {/if}
    </article>
  </section>

  {#if related.length}
    <section class="section page">
      <div class="section-head">
        <div>
          <div class="eyebrow">Keep Reading</div>
          <h2>Related Dispatches</h2>
        </div>
      </div>
      <div class="faction-grid">
        {#each related as entry (entry.slug)}
          <a class="faction-row" href="/news/{entry.slug}">
            <b>{entry.title}</b>
            <span>{entry.category} · {mediumDate(entry.date)}</span>
          </a>
        {/each}
      </div>
    </section>
  {/if}
{/if}

<style>
  .byline {
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--color-text) 55%, transparent);
    margin: var(--space-3) 0 0;
  }
  a.faction-row {
    color: inherit;
    text-decoration: none;
    gap: var(--space-4);
  }
  a.faction-row:hover {
    border-color: var(--color-accent);
  }
</style>
