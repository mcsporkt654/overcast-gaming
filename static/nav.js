(function () {
  function closeMenu(button, links, overlay) {
    button.setAttribute('aria-expanded', 'false');
    links.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function openMenu(button, links, overlay) {
    button.setAttribute('aria-expanded', 'true');
    links.classList.add('open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function initMobileNav() {
    document.querySelectorAll('nav .nav-inner').forEach(function (navInner, index) {
      var links = navInner.querySelector('.nav-links');
      if (!links || navInner.querySelector('.nav-toggle')) return;

      if (!links.id) links.id = 'nav-links-' + (index + 1);

      var overlay = document.createElement('button');
      overlay.type = 'button';
      overlay.className = 'nav-overlay';
      overlay.setAttribute('aria-label', 'Close navigation menu');
      document.body.appendChild(overlay);

      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'nav-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Toggle navigation menu');
      toggle.setAttribute('aria-controls', links.id);
      toggle.innerHTML = '<span class="nav-toggle-bars" aria-hidden="true"><span class="nav-toggle-bar"></span><span class="nav-toggle-bar"></span><span class="nav-toggle-bar"></span></span>';
      navInner.appendChild(toggle);

      toggle.addEventListener('click', function () {
        if (toggle.getAttribute('aria-expanded') === 'true') {
          closeMenu(toggle, links, overlay);
        } else {
          openMenu(toggle, links, overlay);
        }
      });

      overlay.addEventListener('click', function () {
        closeMenu(toggle, links, overlay);
      });

      links.addEventListener('click', function (event) {
        if (event.target instanceof Element && event.target.closest('a')) {
          closeMenu(toggle, links, overlay);
        }
      });

      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') closeMenu(toggle, links, overlay);
      });

      window.addEventListener('resize', function () {
        if (window.innerWidth > 768) closeMenu(toggle, links, overlay);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileNav);
  } else {
    initMobileNav();
  }
})();
