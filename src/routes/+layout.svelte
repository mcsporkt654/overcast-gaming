<script>
  import '$lib/styles/overcast.css';
  import { page } from '$app/stores';
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';
</script>

<Header />

{#if $page.data?.apiUnavailable}
  <div class="service-banner" role="status" aria-live="polite">
    Data service is temporarily unavailable. Some stats may be missing while we reconnect.
  </div>
{/if}

<slot />

<Footer />
