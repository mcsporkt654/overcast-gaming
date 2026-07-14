<svelte:head>
  <link rel="stylesheet" href="/style.css" />
</svelte:head>

{#if $page.data?.apiUnavailable}
  <div class="service-banner" role="status" aria-live="polite">
    Data service is temporarily unavailable. Some stats may be missing while we reconnect.
  </div>
{/if}

<slot />

<!-- nav.js handles mobile nav toggle and active-link highlighting globally -->
<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  onMount(() => {
    // Dynamically load nav.js once, letting it run its own DOMContentLoaded logic
    if (!document.querySelector('script[src="/nav.js"]')) {
      const s = document.createElement('script');
      s.src = '/nav.js';
      s.defer = true;
      document.head.appendChild(s);
    }
  });
</script>

<style>
  .service-banner {
    position: sticky;
    top: 0;
    z-index: 1000;
    padding: 0.65rem 1rem;
    background: #fff5cc;
    border-bottom: 1px solid #f3d173;
    color: #3d2f00;
    font-size: 0.95rem;
    text-align: center;
  }
</style>
