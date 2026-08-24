<script>
  import { page } from '$app/stores';

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/community', label: 'Community' },
    { href: '/roster', label: 'Roster' },
    { href: '/owl', label: 'The OWL' },
    { href: '/stats', label: 'Stats' }
  ];

  let menuOpen = false;

  function isActive(url, href) {
    const [path] = href.split('#');
    if (path === '/') return url.pathname === '/';
    if (url.pathname !== path && !url.pathname.startsWith(`${path}/`)) return false;
    return true;
  }
</script>

<header class="nav" class:open={menuOpen}>
  <a class="nav-brand" href="/">
    <img src="/owl-mark.png" alt="" width="34" height="34" />
    <span>OVERCAST</span>
  </a>

  <button
    class="nav-toggle"
    type="button"
    aria-label="Toggle menu"
    aria-expanded={menuOpen}
    aria-controls="primary-nav"
    on:click={() => (menuOpen = !menuOpen)}
  >
    Menu
  </button>

  <!--
    A <div role="navigation"> rather than a <nav>: the admin console still
    loads the legacy static/style.css, which styles the bare `nav` element
    (sticky, own background, z-index) and would repaint this menu on /admin.
    Same reason the admin tab strip is a div.
  -->
  <div id="primary-nav" class="nav-menu" role="navigation" aria-label="Primary">
    {#each navItems as item}
      <a
        href={item.href}
        aria-current={isActive($page.url, item.href) ? 'page' : undefined}
        on:click={() => (menuOpen = false)}
      >
        {item.label}
      </a>
    {/each}
    <a href="https://arma.gg/collections/overcast" target="_blank" rel="noopener">Merch</a>
  </div>
</header>
