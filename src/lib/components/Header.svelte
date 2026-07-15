<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  const THEME_STORAGE_KEY = 'overcast-brand-theme';

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/roster', label: 'Roster' },
    { href: '/stats', label: 'Stats' },
    { href: '/matchups', label: 'Matchups' },
    { href: '/meta', label: 'Meta' },
    { href: '/owl', label: 'OWL' },
    { href: '/feed', label: 'Dispatch' }
  ];

  let selectedTheme = 'alternate';
  let isHydrated = false;

  function isActive(pathname, href) {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function applyTheme(theme) {
    if (typeof document === 'undefined') return;

    document.documentElement.dataset.theme = theme;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage failures and keep the current selection in memory.
    }
  }

  $: if (isHydrated) {
    applyTheme(selectedTheme);
  }

  onMount(() => {
    try {
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme === 'original' || storedTheme === 'alternate') {
        selectedTheme = storedTheme;
      }
    } catch {
      // Keep the default theme when localStorage is unavailable.
    }

    isHydrated = true;
  });
</script>

<nav class="nav" aria-label="Primary">
  <div class="nav-inner">
    <a class="nav-logo" href="/">
      <img class="nav-mark" src="/owl-mark.png" alt="" width="34" height="34" />
      Overcast
    </a>

    <div class="nav-links">
      {#each navItems as item}
        <a
          href={item.href}
          class:active={isActive($page.url.pathname, item.href)}
          aria-current={isActive($page.url.pathname, item.href) ? 'page' : undefined}
        >
          {item.label}
        </a>
      {/each}
    </div>

    <div class="nav-actions">
      <label class="theme-switcher">
        <span class="theme-switcher-label">Palette</span>
        <select bind:value={selectedTheme} aria-label="Select branding palette">
          <option value="original">Original</option>
          <option value="alternate">Alternate</option>
        </select>
      </label>
    </div>
  </div>
</nav>