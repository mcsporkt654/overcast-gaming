<script>
  import { page } from '$app/stores';

  $: status = $page.status;
  $: message =
    status === 404
      ? 'That page has been lost to the warp.'
      : $page.error?.message || 'Something went wrong on our side.';
</script>

<svelte:head>
  <title>{status} — Overcast Wargaming League</title>
</svelte:head>

<section class="page-header page">
  <div class="eyebrow">Signal Lost</div>
  <h1>{status}</h1>
  <p class="lede">{message}</p>
  <div class="back-links">
    <a class="btn btn-primary" href="/">Back to base</a>
    <a class="btn btn-secondary" href="/roster">Roster</a>
    <a class="btn btn-secondary" href="/owl">The OWL</a>
  </div>
</section>
