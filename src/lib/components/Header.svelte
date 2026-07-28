<script>
  import { page } from '$app/stores';

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/feed', label: 'Community' },
    { href: '/roster', label: 'Roster' },
    { href: '/owl', label: 'The OWL' },
    { href: '/stats', label: 'Stats' }
  ];

  function isActive(pathname, href) {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  }
</script>

<nav aria-label="Primary">
  <div class="nav-inner">
    <a href="/" class="nav-logo">
      <img class="nav-mark" src="/owl-mark.png" alt="" width="34" height="34" />Overcast
    </a>
    <ul class="nav-links">
      {#each navItems as item}
        <li>
          <a
            href={item.href}
            class:active={isActive($page.url.pathname, item.href)}
            aria-current={isActive($page.url.pathname, item.href) ? 'page' : undefined}
          >
            {item.label}
          </a>
        </li>
      {/each}
      <li><a href="https://arma.gg/collections/overcast" target="_blank" rel="noopener">Merch</a></li>
      <li><a href="/admin" class:active={isActive($page.url.pathname, '/admin')}>Admin</a></li>
    </ul>
  </div>
</nav>
