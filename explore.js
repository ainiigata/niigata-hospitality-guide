(() => {
  "use strict";

  const categories = [
    { key: "lunch", label: "昼ごはん", hash: "#lunch" },
    { key: "dinner", label: "夜ごはん", hash: "#dinner" },
    { key: "sake", label: "地酒", hash: "#sake" },
    { key: "gift", label: "お土産", hash: "#souvenir" },
    { key: "walk", label: "散策", hash: "#spots" },
    { key: "access", label: "アクセス", hash: "#access" }
  ];
  const storageKey = "niigata-hospitality-guide:saved:v1";
  const pageSize = 3;

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function button(className, label) {
    const node = make("button", className, label);
    node.type = "button";
    return node;
  }

  function icon(name) {
    const span = make("span", "guide-icon");
    span.setAttribute("aria-hidden", "true");
    if (typeof window.GuideIcons === "function") {
      const symbol = window.GuideIcons(name);
      if (symbol instanceof Node) span.append(symbol);
      else if (typeof symbol === "string") span.innerHTML = symbol;
    }
    return span;
  }

  function init() {
    const guide = document.getElementById("guide");
    const dialog = document.getElementById("guide-dialog");
    if (!guide || !dialog) return;

    const tabs = document.getElementById("guide-tabs");
    const areas = document.getElementById("guide-area");
    const list = document.getElementById("guide-list");
    const summary = document.getElementById("guide-summary");
    const more = document.getElementById("guide-more");
    const content = document.getElementById("modal-content");
    const dismiss = document.getElementById("close-modal");
    const directory = window.GuideEntries || [];
    const entries = new Map([...directory, ...(window.BentoEntries || [])].map(entry => [entry.id, entry]));
    let category = "lunch";
    let area = "";
    let limit = pageSize;
    let view = "";
    let opener = null;
    let returnToSaved = false;
    let saved = readSaved();

    function readSaved() {
      try {
        const value = JSON.parse(localStorage.getItem(storageKey) || "[]");
        return new Set(Array.isArray(value) ? value.filter(id => entries.has(id)) : []);
      } catch {
        return new Set();
      }
    }

    function setSaveAppearance(control) {
      const entry = entries.get(control.dataset.save);
      if (!entry) return;
      const active = saved.has(entry.id);
      control.classList.toggle("is-saved", active);
      control.setAttribute("aria-pressed", String(active));
      control.setAttribute("aria-label", entry.title + (active ? "を旅のしおりから外す" : "を旅のしおりに追加"));
      control.querySelectorAll("[data-save-label]").forEach(label => {
        label.textContent = active ? "しおりから外す" : "しおりに追加";
      });
    }

    function updateSavedControls() {
      document.querySelectorAll("[data-save]").forEach(setSaveAppearance);
      document.querySelectorAll("[data-count]").forEach(count => {
        count.textContent = String(saved.size);
      });
      document.querySelectorAll("[data-saved]").forEach(control => {
        control.setAttribute("aria-label", "旅のしおりを開く（" + saved.size + "件）");
        control.setAttribute("aria-haspopup", "dialog");
      });
    }

    function saveButton(entry, long = false) {
      const node = button(long ? "save-toggle detail-save" : "save-toggle");
      node.dataset.save = entry.id;
      node.append(icon("bookmark"));
      if (long) {
        const label = make("span");
        label.dataset.saveLabel = "";
        node.append(label);
      }
      setSaveAppearance(node);
      return node;
    }

    function toggleSave(id) {
      if (!entries.has(id)) return;
      const savedOrder = [...saved];
      if (saved.has(id)) saved.delete(id);
      else saved.add(id);
      try {
        localStorage.setItem(storageKey, JSON.stringify([...saved]));
      } catch {
        // Private browsing and disabled storage can still keep this page's selection.
      }
      if (view === "saved" && dialog.open) {
        renderSaved();
        const remaining = [...saved];
        const next = remaining[Math.min(savedOrder.indexOf(id), remaining.length - 1)];
        const target = [...content.querySelectorAll("[data-save]")].find(control => control.dataset.save === next);
        (target || content.querySelector(".dialog-title")).focus();
      }
      updateSavedControls();
    }

    function meta(entry) {
      const row = make("div", "guide-meta");
      if (entry.area) row.append(make("span", "guide-area-name", entry.area));
      if (entry.tag) row.append(make("span", "guide-tag", entry.tag));
      return row;
    }

    function card(entry) {
      const article = make("article", "guide-card");
      const text = make("div", "guide-card-text");
      const title = make("h3");
      const openTitle = button("guide-title", entry.title);
      openTitle.dataset.detail = entry.id;
      openTitle.setAttribute("aria-haspopup", "dialog");
      title.append(openTitle);
      text.append(meta(entry), title, make("p", "guide-lead", entry.lead));
      const actions = make("div", "guide-card-actions");
      const detail = button("guide-open", "詳細");
      detail.dataset.detail = entry.id;
      detail.setAttribute("aria-label", entry.title + "の詳細を見る");
      detail.setAttribute("aria-haspopup", "dialog");
      detail.append(icon("chevron"));
      actions.append(detail, saveButton(entry));
      article.append(text, actions);
      return article;
    }

    function pressed(control, active) {
      control.classList.toggle("is-active", active);
      control.setAttribute("aria-pressed", String(active));
    }

    function renderList() {
      const matching = directory.filter(entry =>
        entry.cat === category && (category !== "lunch" || !area || entry.area === area)
      );
      const visible = matching.slice(0, limit);
      list.replaceChildren(...visible.map(card));
      for (const control of tabs.children) pressed(control, control.dataset.filter === category);
      for (const control of areas.children) pressed(control, control.dataset.areaFilter === area);
      areas.hidden = category !== "lunch";
      summary.textContent = matching.length + "件中 " + visible.length + "件を表示";
      more.hidden = visible.length >= matching.length;
      if (!more.hidden) more.textContent = "もっと見る（あと" + (matching.length - visible.length) + "件）";
    }

    function changeCategory(key) {
      category = key;
      area = "";
      limit = pageSize;
      renderList();
    }

    function scrollToGuide() {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      guide.scrollIntoView({ behavior: reduce ? "instant" : "smooth", block: "start" });
    }

    function routeOldHash() {
      const target = categories.find(item => item.hash === location.hash);
      if (!target) return;
      changeCategory(target.key);
      scrollToGuide();
    }

    function rememberHash(hash, mode) {
      if (location.hash === hash) return;
      try {
        history[mode](null, "", hash);
      } catch {
        location.hash = hash;
      }
    }

    function titleNode(text) {
      const heading = make("h2", "dialog-title", text);
      heading.id = "guide-dialog-title";
      heading.tabIndex = -1;
      return heading;
    }

    function mapLink(entry) {
      return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(entry.map);
    }

    function link(label, url, symbol) {
      const node = make("a", "detail-link");
      node.href = url;
      node.target = "_blank";
      node.rel = "noopener noreferrer";
      node.append(icon(symbol), make("span", "", label));
      return node;
    }

    function renderSaved() {
      view = "saved";
      returnToSaved = false;
      const panel = make("div", "saved-view");
      panel.append(titleNode("旅のしおり"));
      if (saved.size) {
        panel.append(make("p", "saved-intro", "保存した" + saved.size + "件"));
        const items = make("ul", "saved-list");
        for (const id of saved) {
          const entry = entries.get(id);
          const item = make("li", "saved-item");
          const open = button("saved-open", entry.title);
          open.dataset.detail = id;
          open.append(icon("chevron"));
          item.append(open, saveButton(entry));
          items.append(item);
        }
        panel.append(items);
      } else {
        panel.append(make("p", "saved-empty", "気になるお弁当やお店のしおりマークを押すと、ここに保存できます。"));
      }
      content.replaceChildren(panel);
    }

    function renderDetail(entry, fromSaved) {
      view = "detail";
      returnToSaved = fromSaved;
      const panel = make("div", "detail-view");
      if (fromSaved) {
        const back = button("back-saved", "しおり一覧へ戻る");
        back.dataset.backSaved = entry.id;
        panel.append(back);
      }
      if (entry.img) {
        const photo = make("img", "detail-image");
        photo.src = entry.img;
        const generated = entry.img.endsWith("-gen.webp");
        photo.alt = entry.title + (generated ? "をイメージした盛り付け" : "");
        panel.append(photo);
        if (generated) panel.append(make("p", "detail-caption", "盛り付けは生成イメージです。"));
      }
      panel.append(meta(entry), titleNode(entry.title), make("p", "detail-lead", entry.lead));
      if (entry.price) panel.append(make("p", "detail-price", entry.price));
      panel.append(make("p", "detail-body", entry.body));
      const links = make("nav", "detail-links");
      links.setAttribute("aria-label", entry.title + "の関連リンク");
      if (entry.map) links.append(link("地図を開く", mapLink(entry), "pin"));
      if (entry.url) links.append(link(entry.source || "掲載情報を見る", entry.url, "external"));
      if (links.childElementCount) panel.append(links);
      panel.append(saveButton(entry, true));
      content.replaceChildren(panel);
    }

    function showDialog(trigger) {
      if (!dialog.open) {
        opener = trigger;
        dialog.showModal();
      }
      dialog.scrollTop = 0;
      content.scrollTop = 0;
      content.querySelector(".dialog-title")?.focus({ preventScroll: true });
    }

    tabs.setAttribute("role", "group");
    tabs.setAttribute("aria-label", "案内の種類");
    areas.setAttribute("role", "group");
    areas.setAttribute("aria-label", "昼食を探す庁舎");
    for (const item of categories) {
      const tab = button("filter-tab", item.label);
      tab.dataset.filter = item.key;
      tabs.append(tab);
    }
    for (const name of ["", "市役所本館", "ふるまち庁舎"]) {
      const control = button("area-tab", name || "すべて");
      control.dataset.areaFilter = name;
      areas.append(control);
    }
    dialog.setAttribute("aria-labelledby", "guide-dialog-title");

    more.addEventListener("click", () => {
      const previous = list.children.length;
      limit += pageSize;
      renderList();
      list.children[previous]?.querySelector(".guide-title")?.focus({ preventScroll: true });
    });
    dismiss.addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => {
      if (dialog.open) return;
      view = "";
      returnToSaved = false;
      const target = opener?.isConnected ? opener : tabs.querySelector(".is-active");
      target?.focus({ preventScroll: true });
      opener = null;
    });
    dialog.addEventListener("click", event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right ||
          event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    });

    document.addEventListener("click", event => {
      if (event.defaultPrevented || event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const control = event.target.closest?.("[data-save],[data-saved],[data-detail],[data-back-saved],[data-filter],[data-area-filter],[data-category],a[href^='#']");
      if (!control) return;
      if (control.hasAttribute("data-save")) {
        event.preventDefault();
        toggleSave(control.dataset.save);
      } else if (control.hasAttribute("data-saved")) {
        event.preventDefault();
        renderSaved();
        showDialog(control);
      } else if (control.hasAttribute("data-detail")) {
        const entry = entries.get(control.dataset.detail);
        if (!entry) return;
        event.preventDefault();
        renderDetail(entry, dialog.open && view === "saved");
        showDialog(control);
      } else if (control.hasAttribute("data-back-saved") && returnToSaved) {
        renderSaved();
        const previous = [...content.querySelectorAll("[data-detail]")].find(node => node.dataset.detail === control.dataset.backSaved);
        (previous || content.querySelector(".dialog-title")).focus();
      } else if (control.hasAttribute("data-filter")) {
        const key = control.dataset.filter;
        changeCategory(key);
        rememberHash(categories.find(item => item.key === key).hash, "replaceState");
      } else if (control.hasAttribute("data-area-filter")) {
        area = control.dataset.areaFilter;
        limit = pageSize;
        renderList();
      } else {
        const item = categories.find(candidate =>
          candidate.key === control.dataset.category || candidate.hash === control.getAttribute("href")
        );
        if (!item) return;
        event.preventDefault();
        if (dialog.open) dialog.close();
        changeCategory(item.key);
        rememberHash(item.hash, "pushState");
        scrollToGuide();
      }
    });

    window.addEventListener("hashchange", routeOldHash);
    window.addEventListener("storage", event => {
      if (event.key !== storageKey && event.key !== null) return;
      saved = readSaved();
      if (view === "saved" && dialog.open) {
        renderSaved();
        content.querySelector(".dialog-title").focus();
      }
      updateSavedControls();
    });
    renderList();
    updateSavedControls();
    if (categories.some(item => item.hash === location.hash)) requestAnimationFrame(routeOldHash);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
