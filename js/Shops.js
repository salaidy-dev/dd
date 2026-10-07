// (function () {
//   var grid = document.getElementById('shopGrid');
//   var empty = document.getElementById('shopEmpty');
//   var allBtn = document.getElementById('filterAllBtn');
//   var categoryBtn = document.getElementById('categoryFilterBtn');
//   var categoryLabel = document.getElementById('categoryFilterLabel');
//   var categoryOptions = document.querySelectorAll('.gm-cat-option');
//   var regionBtn = document.getElementById('regionFilterBtn');
//   var regionLabel = document.getElementById('regionFilterLabel');
//   var regionOptions = document.querySelectorAll('.gm-region-option');
//   if (!grid || !allBtn || !categoryOptions.length || !regionOptions.length) return;

//   // state.category: 'all' | 'restaurant' | 'cafe' | 'restaurant-cafe' | 'open'
//   var state = { category: 'all', region: 'all' };

//   // A shop's data-category can hold one or more space-separated tags,
//   // e.g. data-category="restaurant" or data-category="restaurant cafe"
//   // for a shop that is BOTH a restaurant and a café at once.
//   function cardCategories(card) {
//     return (card.dataset.category || '').trim().split(/\s+/).filter(Boolean);
//   }

//   function cardMatchesCategory(card) {
//     var cats = cardCategories(card);
//     switch (state.category) {
//       case 'all':
//         return true;
//       case 'restaurant':
//         return cats.indexOf('restaurant') !== -1;
//       case 'cafe':
//         return cats.indexOf('cafe') !== -1;
//       case 'restaurant-cafe':
//         // Only shops tagged as BOTH restaurant and café at once —
//         // not "either a restaurant or a café".
//         return cats.indexOf('restaurant') !== -1 && cats.indexOf('cafe') !== -1;
//       case 'open':
//         return card.dataset.status === 'open';
//       default:
//         return true;
//     }
//   }

//   function applyFilters() {
//     var cards = grid.querySelectorAll('.gm-card');
//     var visibleCount = 0;

//     cards.forEach(function (card) {
//       var matchesCat = cardMatchesCategory(card);
//       var matchesRegion = state.region === 'all' || card.dataset.region === state.region;
//       var visible = matchesCat && matchesRegion;
//       card.classList.toggle('is-hidden', !visible);
//       if (visible) visibleCount++;
//     });

//     if (empty) empty.style.display = visibleCount === 0 ? '' : 'none';
//     grid.style.display = visibleCount === 0 ? 'none' : '';
//   }

//   function setActiveCategoryUI() {
//     var isAll = state.category === 'all';
//     allBtn.classList.toggle('is-active', isAll);
//     categoryBtn.classList.toggle('is-active', !isAll);

//     categoryOptions.forEach(function (opt) {
//       opt.classList.toggle('is-active', opt.dataset.cat === state.category);
//     });

//     if (isAll) {
//       categoryLabel.textContent = 'Category';
//     } else {
//       var active = document.querySelector('.gm-cat-option[data-cat="' + state.category + '"]');
//       categoryLabel.textContent = active ? active.dataset.label : 'Category';
//     }
//   }

//   // Filter 1: All — resets the category filter only, keeps region as-is
//   allBtn.addEventListener('click', function () {
//     state.category = 'all';
//     setActiveCategoryUI();
//     applyFilters();
//   });

//   // Filter 2: Category dropdown options
//   categoryOptions.forEach(function (opt) {
//     opt.addEventListener('click', function () {
//       state.category = opt.dataset.cat;
//       setActiveCategoryUI();
//       applyFilters();
//     });
//   });

//   // Filter 3: Region dropdown options
//   regionOptions.forEach(function (opt) {
//     opt.addEventListener('click', function () {
//       state.region = opt.dataset.region;
//       regionLabel.textContent = opt.dataset.label;
//       regionBtn.classList.toggle('is-active', state.region !== 'all');
//       regionOptions.forEach(function (o) { o.classList.toggle('is-active', o === opt); });
//       applyFilters();
//     });
//   });

//   // Keep the sidebar "Popular Types" shortcuts in sync with the category filter
//   document.querySelectorAll('.quick-type[data-type]').forEach(function (btn) {
//     btn.addEventListener('click', function () {
//       var map = { cafes: 'cafe', restaurants: 'restaurant' };
//       var target = map[btn.dataset.type] || btn.dataset.type;
//       state.category = target;
//       setActiveCategoryUI();
//       applyFilters();
//       document.querySelectorAll('.quick-type').forEach(function (b) { b.classList.remove('is-active'); });
//       btn.classList.add('is-active');
//     });
//   });
// })();