<script>
  import { mediumDate } from '$lib/format.js';

  /** @type {import('./$types').PageData} */
  export let data;

  $: posts = data.posts ?? [];
</script>

<svelte:head>
  <title>Community — Overcast Wargaming League</title>
  <meta
    name="description"
    content="Dispatches, recaps and announcements from the Overcast Wargaming League — Portland's Warhammer 40,000 community."
  />
</svelte:head>

<section class="page-header page">
  <div class="eyebrow">High Command Bulletin</div>
  <h1>Community</h1>
  <p class="lede">
    Dispatches, recaps and announcements from the Overcast Wargaming League — Portland's Warhammer
    40,000 community.
  </p>
</section>

<section class="section page">
  {#if posts.length}
    <div class="post-grid">
      {#each posts as post (post.slug)}
        <article class="post-card">
          {#if post.image}
            <img class="pc-media" src={post.image} alt="" loading="lazy" />
          {:else}
            <div class="ph"><span>Dispatch</span></div>
          {/if}
          <div class="pc-body">
            <div class="card-kicker">{post.category} · {mediumDate(post.date)}</div>
            <h3>{post.title}</h3>
            <p>{post.excerpt}</p>
            <a class="btn btn-ghost" href="/news/{post.slug}">Read dispatch →</a>
          </div>
        </article>
      {/each}
    </div>
  {:else}
    <p class="empty-row">No dispatches published yet.</p>
  {/if}
</section>
