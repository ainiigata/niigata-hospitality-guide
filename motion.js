(() => {
  if (!('IntersectionObserver' in window) || !('MutationObserver' in window)) return;

  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const shops = [...document.querySelectorAll('.shop-times > .shop-stop')];
  const stories = [...document.querySelectorAll('.story-grid > .story')];
  const routePanel = document.querySelector('#route-panel');
  const seenShops = new WeakSet();
  const seenPlans = new WeakSet();
  const visibleStories = new Set();
  let frame = 0;
  let active = false;
  let routeVisible = false;

  function paintDepth() {
    frame = 0;
    const viewport = window.innerHeight;
    const updates = [];
    for (const story of visibleStories) {
      const box = story.getBoundingClientRect();
      const travel = (viewport - 2 * box.top - box.height) / (viewport + box.height);
      updates.push([story, Math.max(-1, Math.min(1, travel)) * 15]);
    }
    for (const [story, shift] of updates) {
      story.style.setProperty('--welcome-shift', shift.toFixed(1) + 'px');
    }
  }

  function requestDepth() {
    if (!frame && visibleStories.size) frame = requestAnimationFrame(paintDepth);
  }

  function syncScroll() {
    if (visibleStories.size) {
      window.addEventListener('scroll', requestDepth, { passive: true });
      window.addEventListener('resize', requestDepth);
      requestDepth();
    } else {
      window.removeEventListener('scroll', requestDepth);
      window.removeEventListener('resize', requestDepth);
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }

  function showRoute() {
    const plan = routePanel?.querySelector('.route-plan');
    if (!active || !routeVisible || !plan || seenPlans.has(plan)) return;
    seenPlans.add(plan);
    plan.setAttribute('data-welcome-steps', '');
  }

  const observer = new IntersectionObserver(entries => {
    if (!active) return;
    for (const { target, isIntersecting } of entries) {
      if (target === routePanel) {
        routeVisible = isIntersecting;
        if (routeVisible) showRoute();
        else routePanel.querySelector('.route-plan')?.removeAttribute('data-welcome-steps');
      } else if (target.classList.contains('story')) {
        if (isIntersecting) {
          visibleStories.add(target);
          target.setAttribute('data-welcome-depth', '');
        } else {
          visibleStories.delete(target);
          target.removeAttribute('data-welcome-depth');
        }
      } else if (isIntersecting && !seenShops.has(target)) {
        seenShops.add(target);
        target.dataset.welcomeStop = 'playing';
      } else if (!isIntersecting && seenShops.has(target)) {
        target.dataset.welcomeStop = 'done';
      }
    }
    syncScroll();
  });

  function configure() {
    const enabled = !document.hidden && !reduced.matches && root.dataset.motion === 'on';
    if (enabled === active) return;
    active = enabled;
    if (active) {
      shops.forEach(shop => {
        shop.dataset.welcomeStop = seenShops.has(shop) ? 'done' : 'waiting';
        observer.observe(shop);
      });
      stories.forEach(story => observer.observe(story));
      if (routePanel) observer.observe(routePanel);
    } else {
      observer.disconnect();
      visibleStories.clear();
      syncScroll();
      routeVisible = false;
      shops.forEach(shop => shop.removeAttribute('data-welcome-stop'));
      stories.forEach(story => {
        story.removeAttribute('data-welcome-depth');
        story.style.removeProperty('--welcome-shift');
      });
      routePanel?.querySelector('.route-plan')?.removeAttribute('data-welcome-steps');
    }
  }

  if (routePanel) new MutationObserver(showRoute).observe(routePanel, { childList: true });
  new MutationObserver(configure).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
  reduced.addEventListener('change', configure);
  document.addEventListener('visibilitychange', configure);
  configure();
})();
