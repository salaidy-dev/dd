// /**
//  * Market.js
//  * Wires up the simplified Market page: live search, region/area/category filters,
//  * sorting, All / Saved / My Ads tabs, bookmark persistence, and load-more paging.
//  *
//  * Every listing card in Market.html carries data attributes the filters read from:
//  *   data-title      → searched against
//  *   data-region      → "north" | "central" | "south"
//  *   data-area        → specific sub-area, e.g. "Beit Lahia", "Rafah", "Deir al-Balah".
//  *                      Optional — cards without it are only filtered by data-region.
//  *   data-category    → "electronics" | "furniture" | "clothing" | "real-estate" | "vehicles" | ...
//  *   data-condition   → "new" | "used" | "urgent"   (drives the badge, not filtered here)
//  *   data-price       → number, used for price sort
//  *   data-created     → ISO 8601 timestamp (e.g. "2026-08-15T12:00:00Z") the item was posted.
//  *                      Used for the Newest sort AND to auto-fill the "x days ago" text —
//  *                      the backend only ever needs to send the real created_at value,
//  *                      never a pre-formatted "2 days ago" string.
//  *   data-mine        → "true" | "false", used by the "My Ads" tab
//  *
//  * Region filtering:
//  *   #mktRegion  → broad region ("all" | "north" | "central" | "south")
//  *   #mktArea    → optional specific sub-area (e.g. "Beit Lahia"); when set it narrows
//  *                 results further within the matching region. Both are wired up by the
//  *                 custom region dropdown in Market.html, which keeps them in sync and
//  *                 fires "change" on whichever one it updates.
//  *
//  * To hook this up to a real backend later: replace the initial cards + these
//  * data attributes with server-rendered (or fetched) listings, keep the same
//  * data-* contract, and everything below keeps working unchanged.
//  *
//  * Note: each card's href already points to listing.html?id=<id>, matching the
//  * ids in js/listings-data.js, so clicking a card opens its details page.
//  */
// (function () {
//   'use strict';

//   var PAGE_SIZE = 4;
//   var SAVED_KEY = 'gm_saved_listings';

//   var grid = document.getElementById('mktGrid');
//   if (!grid) return; // not on the Market page

//   var cards = Array.prototype.slice.call(grid.querySelectorAll('.mkt-card'));
//   var searchInput = document.getElementById('mktSearch');
//   var regionSelect = document.getElementById('mktRegion');
//   var areaInput = document.getElementById('mktArea');
//   var categorySelect = document.getElementById('mktCategory');
//   var conditionSelect = document.getElementById('mktCondition');
//   var sortSelect = document.getElementById('mktSort');
//   var clearBtn = document.getElementById('mktClear');
//   var tabsWrap = document.getElementById('mktTabs');
//   var countEl = document.getElementById('mktCount');
//   var emptyEl = document.getElementById('mktEmpty');
//   var moreWrap = document.getElementById('mktMoreWrap');
//   var moreBtn = document.getElementById('mktMoreBtn');
//   var catNav = document.getElementById('mktCatNav');
//   var regionLabel = document.getElementById('mktRegionLabel');
//   var regionMenu = document.getElementById('mktRegionMenu');

//   var state = {
//     search: '',
//     region: 'all',
//     area: '',
//     category: 'all',
//     condition: 'all',
//     sort: 'newest',
//     tab: 'all',
//     visible: PAGE_SIZE
//   };

//   var savedIds = loadSavedIds();

//   function cardId(card) {
//     return card.getAttribute('data-title') || '';
//   }

//   function loadSavedIds() {
//     var fromStorage = null;
//     try {
//       var raw = localStorage.getItem(SAVED_KEY);
//       if (raw) fromStorage = JSON.parse(raw);
//     } catch (e) { /* ignore corrupt storage */ }

//     if (Array.isArray(fromStorage)) return new Set(fromStorage);

//     // First run: seed from whatever the markup already marked as saved.
//     var seeded = new Set();
//     cards.forEach(function (card) {
//       if (card.querySelector('.mkt-save.is-saved')) seeded.add(cardId(card));
//     });
//     persistSavedIds(seeded);
//     return seeded;
//   }

//   function persistSavedIds(set) {
//     try {
//       localStorage.setItem(SAVED_KEY, JSON.stringify(Array.from(set)));
//     } catch (e) { /* storage unavailable — saved state just won't persist */ }
//   }

//   // The save/bookmark button now uses a single inline SVG icon (see Market.html,
//   // class "mkt-save-icon"). Saved vs. not-saved is driven entirely by the
//   // "is-saved" class on the button — market.css swaps the icon between
//   // outline and filled via that class — so this just needs to toggle it.
//   function applySavedVisuals() {
//     cards.forEach(function (card) {
//       var btn = card.querySelector('.mkt-save');
//       if (!btn) return;
//       var isSaved = savedIds.has(cardId(card));
//       btn.classList.toggle('is-saved', isSaved);
//       btn.setAttribute('aria-label', isSaved ? 'Saved' : 'Save listing');
//     });
//   }

//   function matches(card) {
//     var title = (card.getAttribute('data-title') || '').toLowerCase();
//     var region = card.getAttribute('data-region') || '';
//     var area = card.getAttribute('data-area') || '';
//     var category = card.getAttribute('data-category') || '';
//     var condition = card.getAttribute('data-condition') || '';
//     var mine = card.getAttribute('data-mine') === 'true';
//     var id = cardId(card);

//     if (state.tab === 'saved' && !savedIds.has(id)) return false;
//     if (state.tab === 'mine' && !mine) return false;
//     if (state.search && title.indexOf(state.search.toLowerCase()) === -1) return false;

//     // Sub-area takes precedence when set (e.g. "Beit Lahia"); otherwise fall
//     // back to the broad region ("north" / "central" / "south").
//     if (state.area) {
//       if (area !== state.area) return false;
//     } else if (state.region !== 'all' && region !== state.region) {
//       return false;
//     }

//     if (state.category !== 'all' && category !== state.category) return false;
//     if (state.condition !== 'all' && condition !== state.condition) return false;
//     return true;
//   }

//   function sortCards(list) {
//     var sorted = list.slice();
//     if (state.sort === 'price-low') {
//       sorted.sort(function (a, b) { return num(a, 'data-price') - num(b, 'data-price'); });
//     } else if (state.sort === 'price-high') {
//       sorted.sort(function (a, b) { return num(b, 'data-price') - num(a, 'data-price'); });
//     } else {
//       // newest first = fewest minutes-ago first
//       sorted.sort(function (a, b) { return minutesAgo(a) - minutesAgo(b); });
//     }
//     return sorted;
//   }

//   function num(card, attr) {
//     return parseFloat(card.getAttribute(attr)) || 0;
//   }

//   function minutesAgo(card) {
//     var iso = card.getAttribute('data-created');
//     if (!iso) return 0;
//     var created = new Date(iso).getTime();
//     if (isNaN(created)) return 0;
//     var diffMs = Date.now() - created;
//     return Math.max(0, Math.round(diffMs / 60000));
//   }

//   // Turns "how many minutes ago" into the "x ago" text shown on each card.
//   // Backend only needs to provide data-created — this is computed, never typed by hand.
//   function formatTimeAgo(minutes) {
//     if (minutes < 1) return 'Just now';
//     if (minutes < 60) return minutes + (minutes === 1 ? ' minute ago' : ' minutes ago');
//     var hours = Math.floor(minutes / 60);
//     if (hours < 24) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
//     var days = Math.floor(hours / 24);
//     if (days < 7) return days + (days === 1 ? ' day ago' : ' days ago');
//     var weeks = Math.floor(days / 7);
//     if (weeks < 5) return weeks + (weeks === 1 ? ' week ago' : ' weeks ago');
//     var months = Math.floor(days / 30);
//     if (months < 12) return months + (months === 1 ? ' month ago' : ' months ago');
//     var years = Math.floor(days / 365);
//     return years + (years === 1 ? ' year ago' : ' years ago');
//   }

//   function paintTimeAgo() {
//     cards.forEach(function (card) {
//       var timeEl = card.querySelector('.mkt-card__time');
//       if (timeEl) timeEl.textContent = formatTimeAgo(minutesAgo(card));
//     });
//   }

//   function render() {
//     var matched = cards.filter(matches);
//     var sorted = sortCards(matched);
//     var shown = sorted.slice(0, state.visible);
//     var shownSet = new Set(shown);

//     // Reorder the DOM to match the sort, then show/hide.
//     sorted.forEach(function (card) { grid.appendChild(card); });
//     cards.forEach(function (card) {
//       var shouldShow = shownSet.has(card);
//       card.hidden = !shouldShow;
//     });

//     if (countEl) {
//       countEl.textContent = matched.length === 0
//         ? ''
//         : 'Showing ' + shown.length + ' of ' + matched.length + ' listing' + (matched.length === 1 ? '' : 's');
//     }

//     if (emptyEl) emptyEl.style.display = matched.length === 0 ? 'block' : 'none';
//     if (grid) grid.style.display = matched.length === 0 ? 'none' : 'grid';

//     if (moreWrap) moreWrap.style.display = (matched.length > shown.length) ? 'flex' : 'none';
//   }

//   function resetPaging() {
//     state.visible = PAGE_SIZE;
//   }

//   // ---- events ----

//   if (searchInput) {
//     searchInput.addEventListener('input', function () {
//       state.search = searchInput.value.trim();
//       resetPaging();
//       render();
//     });
//   }

//   if (regionSelect) {
//     regionSelect.addEventListener('change', function () {
//       state.region = regionSelect.value;
//       resetPaging();
//       render();
//     });
//   }

//   // The custom region dropdown fires "change" on this hidden input whenever a
//   // specific sub-area is picked (or cleared back to "").
//   if (areaInput) {
//     areaInput.addEventListener('change', function () {
//       state.area = areaInput.value;
//       resetPaging();
//       render();
//     });
//   }

//   if (categorySelect) {
//     categorySelect.addEventListener('change', function () {
//       state.category = categorySelect.value;
//       syncCategorySidebar();
//       resetPaging();
//       render();
//     });
//   }

//   if (conditionSelect) {
//     conditionSelect.addEventListener('change', function () {
//       state.condition = conditionSelect.value;
//       resetPaging();
//       render();
//     });
//   }

//   if (sortSelect) {
//     sortSelect.addEventListener('change', function () {
//       state.sort = sortSelect.value;
//       resetPaging();
//       render();
//     });
//   }

//   if (tabsWrap) {
//     tabsWrap.addEventListener('click', function (e) {
//       var btn = e.target.closest('.mkt-tab');
//       if (!btn || !btn.dataset.tab) return;
//       state.tab = btn.dataset.tab;
//       tabsWrap.querySelectorAll('.mkt-tab').forEach(function (t) { t.classList.remove('is-active'); });
//       btn.classList.add('is-active');
//       resetPaging();
//       render();
//     });
//   }

//   if (catNav) {
//     catNav.addEventListener('click', function (e) {
//       var link = e.target.closest('[data-cat]');
//       if (!link) return;
//       e.preventDefault();
//       state.category = link.dataset.cat;
//       if (categorySelect) categorySelect.value = state.category;
//       syncCategorySidebar();
//       resetPaging();
//       render();
//     });
//   }

//   function syncCategorySidebar() {
//     if (!catNav) return;
//     catNav.querySelectorAll('[data-cat]').forEach(function (link) {
//       link.classList.toggle('is-active', link.dataset.cat === state.category);
//     });
//   }

//   // Resets the custom region dropdown's button label + selected list item
//   // back to "All Regions" so it stays visually in sync with state.region/area.
//   function resetRegionDropdown() {
//     if (regionLabel) regionLabel.textContent = 'All Regions';
//     if (regionMenu) {
//       regionMenu.querySelectorAll('li.is-selected').forEach(function (li) {
//         li.classList.remove('is-selected');
//       });
//       var allOption = regionMenu.querySelector('li[data-value="all"]');
//       if (allOption) allOption.classList.add('is-selected');
//       regionMenu.querySelectorAll('.mkt-dropdown__group.is-open').forEach(function (g) {
//         g.classList.remove('is-open');
//       });
//     }
//   }

//   if (clearBtn) {
//     clearBtn.addEventListener('click', function () {
//       state = { search: '', region: 'all', area: '', category: 'all', condition: 'all', sort: 'newest', tab: 'all', visible: PAGE_SIZE };
//       if (searchInput) searchInput.value = '';
//       if (regionSelect) regionSelect.value = 'all';
//       if (areaInput) areaInput.value = '';
//       resetRegionDropdown();
//       if (categorySelect) categorySelect.value = 'all';
//       if (conditionSelect) conditionSelect.value = 'all';
//       if (sortSelect) sortSelect.value = 'newest';
//       if (tabsWrap) {
//         tabsWrap.querySelectorAll('.mkt-tab').forEach(function (t) { t.classList.remove('is-active'); });
//         var allTab = tabsWrap.querySelector('[data-tab="all"]');
//         if (allTab) allTab.classList.add('is-active');
//       }
//       syncCategorySidebar();
//       render();
//     });
//   }

//   if (moreBtn) {
//     moreBtn.addEventListener('click', function () {
//       state.visible += PAGE_SIZE;
//       render();
//     });
//   }

//   grid.addEventListener('click', function (e) {
//     var btn = e.target.closest('.mkt-save');
//     if (!btn) return;
//     e.preventDefault();
//     e.stopPropagation();
//     var card = btn.closest('.mkt-card');
//     var id = cardId(card);
//     if (savedIds.has(id)) savedIds.delete(id); else savedIds.add(id);
//     persistSavedIds(savedIds);
//     applySavedVisuals();
//     if (state.tab === 'saved') render();
//   });

//   // ---- init ----
//   applySavedVisuals();
//   paintTimeAgo();
//   render();

// (function () {
//   // Wires up a simple (non-grouped) custom dropdown: click toggle to open/close,
//   // click an <li data-value> to select it, updates the hidden <select> and fires
//   // "change" on it so the listeners above keep working unchanged.
//   function initSimpleDropdown(opts) {
//     var wrap   = document.getElementById(opts.wrapId);
//     var toggle = document.getElementById(opts.toggleId);
//     var label  = document.getElementById(opts.labelId);
//     var menu   = document.getElementById(opts.menuId);
//     var select = document.getElementById(opts.selectId);
//     if (!wrap) return;

//     function closeMenu() {
//       menu.classList.remove('is-open');
//       toggle.setAttribute('aria-expanded', 'false');
//     }

//     toggle.addEventListener('click', function (e) {
//       e.stopPropagation();
//       var isOpen = menu.classList.toggle('is-open');
//       toggle.setAttribute('aria-expanded', String(isOpen));
//     });

//     menu.addEventListener('click', function (e) {
//       var li = e.target.closest('li[data-value]');
//       if (!li) return;

//       menu.querySelectorAll('li').forEach(function (el) { el.classList.remove('is-selected'); });
//       li.classList.add('is-selected');
//       label.textContent = li.textContent;

//       select.value = li.dataset.value;
//       select.dispatchEvent(new Event('change', { bubbles: true }));

//       closeMenu();
//     });

//     document.addEventListener('click', function (e) {
//       if (!wrap.contains(e.target)) closeMenu();
//     });

//     document.addEventListener('keydown', function (e) {
//       if (e.key === 'Escape') closeMenu();
//     });

//     // Keeps the button label + highlighted <li> in sync whenever something
//     // else (e.g. the sidebar category links, or the "Clear" button) sets the
//     // hidden <select>'s value directly without going through this dropdown's
//     // own click handler.
//     wrap.__syncFromSelect = function () {
//       var value = select.value;
//       var match = menu.querySelector('li[data-value="' + value + '"]');
//       menu.querySelectorAll('li').forEach(function (el) { el.classList.remove('is-selected'); });
//       if (match) {
//         match.classList.add('is-selected');
//         label.textContent = match.textContent;
//       }
//     };
//   }

//   initSimpleDropdown({
//     wrapId: 'mktCategoryDropdown',
//     toggleId: 'mktCategoryToggle',
//     labelId: 'mktCategoryLabel',
//     menuId: 'mktCategoryMenu',
//     selectId: 'mktCategory'
//   });

//   initSimpleDropdown({
//     wrapId: 'mktConditionDropdown',
//     toggleId: 'mktConditionToggle',
//     labelId: 'mktConditionLabel',
//     menuId: 'mktConditionMenu',
//     selectId: 'mktCondition'
//   });

//   // Sidebar "Categories" links set #mktCategory.value directly (without
//   // dispatching "change"), so keep the custom dropdown's label in sync by
//   // watching for clicks there too.
//   var catNavEl = document.getElementById('mktCatNav');
//   if (catNavEl) {
//     catNavEl.addEventListener('click', function () {
//       var dd = document.getElementById('mktCategoryDropdown');
//       if (dd && dd.__syncFromSelect) setTimeout(dd.__syncFromSelect, 0);
//     });
//   }

//   // "Clear" button (if present) resets #mktCategory / #mktCondition directly too.
//   var clearBtnEl = document.getElementById('mktClear');
//   if (clearBtnEl) {
//     clearBtnEl.addEventListener('click', function () {
//       ['mktCategoryDropdown', 'mktConditionDropdown'].forEach(function (id) {
//         var dd = document.getElementById(id);
//         if (dd && dd.__syncFromSelect) setTimeout(dd.__syncFromSelect, 0);
//       });
//     });
//   }
// })();

// // ====== THE FIX: the region dropdown (with North/Central/South groups and
// // sub-areas) had NO click handling at all before — that's why it did nothing
// // while Category/Condition worked. This wires it up the same way. ======
// (function () {
//   var wrap   = document.getElementById('mktRegionDropdown');
//   var toggle = document.getElementById('mktRegionToggle');
//   var label  = document.getElementById('mktRegionLabel');
//   var menu   = document.getElementById('mktRegionMenu');
//   var regionSelectEl = document.getElementById('mktRegion');
//   var areaInputEl = document.getElementById('mktArea');
//   if (!wrap || !toggle || !menu || !regionSelectEl || !areaInputEl) return;

//   function closeMenu() {
//     menu.classList.remove('is-open');
//     toggle.setAttribute('aria-expanded', 'false');
//     menu.querySelectorAll('.mkt-dropdown__group.is-open').forEach(function (g) {
//       g.classList.remove('is-open');
//     });
//   }

//   function clearSelected() {
//     menu.querySelectorAll('.is-selected').forEach(function (el) {
//       el.classList.remove('is-selected');
//     });
//   }

//   function fireChange() {
//     regionSelectEl.dispatchEvent(new Event('change', { bubbles: true }));
//     areaInputEl.dispatchEvent(new Event('change', { bubbles: true }));
//   }

//   toggle.addEventListener('click', function (e) {
//     e.stopPropagation();
//     var isOpen = menu.classList.toggle('is-open');
//     toggle.setAttribute('aria-expanded', String(isOpen));
//   });

//   menu.addEventListener('click', function (e) {
//     // "All Regions"
//     var allLi = e.target.closest('li[data-value="all"][data-scope="region"]');
//     if (allLi) {
//       regionSelectEl.value = 'all';
//       areaInputEl.value = '';
//       label.textContent = 'All Regions';
//       clearSelected();
//       allLi.classList.add('is-selected');
//       fireChange();
//       closeMenu();
//       return;
//     }

//     // North / Central / South group header — expands/collapses its sub-areas.
//     var groupToggle = e.target.closest('.mkt-dropdown__group-toggle');
//     if (groupToggle) {
//       var group = groupToggle.closest('.mkt-dropdown__group');
//       var wasOpen = group.classList.contains('is-open');
//       menu.querySelectorAll('.mkt-dropdown__group.is-open').forEach(function (g) {
//         if (g !== group) g.classList.remove('is-open');
//       });
//       group.classList.toggle('is-open', !wasOpen);
//       return;
//     }

//     // A specific sub-area, e.g. "Beit Lahia"
//     var areaLi = e.target.closest('li[data-scope="area"]');
//     if (areaLi) {
//       var parentRegion = areaLi.getAttribute('data-parent') || 'all';
//       var areaValue = areaLi.getAttribute('data-value') || '';
//       regionSelectEl.value = parentRegion;
//       areaInputEl.value = areaValue;
//       label.textContent = areaLi.textContent.trim();
//       clearSelected();
//       areaLi.classList.add('is-selected');
//       fireChange();
//       closeMenu();
//       return;
//     }
//   });

//   document.addEventListener('click', function (e) {
//     if (!wrap.contains(e.target)) closeMenu();
//   });

//   document.addEventListener('keydown', function (e) {
//     if (e.key === 'Escape') closeMenu();
//   });
// })();

// })();