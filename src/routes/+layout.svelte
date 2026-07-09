<svelte:head>
  <link rel="stylesheet" href="/style.css" />
</svelte:head>

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
