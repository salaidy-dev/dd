// /**
//  * listing-storage.js
//  * -------------------------------------------------------------------------
//  * Bridges the "Add Listing" form (in the #addListingModal on home.html)
//  * with the Market page. Nothing in the existing project ever persisted the
//  * listing form's data anywhere — this file is the missing piece.
//  *
//  * How it works:
//  *   1. On home.html: listens for the click on #submitListingBtn. Since that
//  *      same button is reused as "Next" for steps 1-7 and only becomes the
//  *      real "Publish Listing" action on step 8, we check the visible step
//  *      counter before treating the click as a real submission.
//  *   2. Reads every field the wizard collected, builds one listing object,
//  *      and appends it to a localStorage array under LISTINGS_KEY.
//  *   3. On Market.html: reads that same array and turns each entry into a
//  *      real .mkt-card element, inserted at the top of #mktGrid — using the
//  *      exact same data-* attribute contract Market.js already expects
//  *      (data-title, data-region, data-area, data-category, data-condition,
//  *      data-price, data-created, data-mine), so every existing filter /
//  *      sort / search / tab in Market.js works on these cards unmodified.
//  *
//  * Include this file on BOTH pages, after Home.js/Market.js:
//  *   home.html   -> after js/Home.js, before js/main.js is fine
//  *   Market.html -> after js/Market.js
//  * -------------------------------------------------------------------------
//  * NOTE ON SELECTORS:
//  * The category/condition "selected" classes below are guesses based on the
//  * markup visible in home.html (".npw-region-btn" get some active class when
//  * clicked, and the Condition group already ships with `active`/
//  * `aria-pressed="true"` on the "New" button by default). If your Home.js
//  * uses a different class name when marking a button as selected, update
//  * SELECTED_CLASS_CANDIDATES below to match it — everything else keeps
//  * working unchanged.
//  * -------------------------------------------------------------------------
//  */
// 'use strict';

// (function () {
//   var LISTINGS_KEY = 'gm_user_listings';
//   var SELECTED_CLASS_CANDIDATES = ['is-active', 'active', 'is-selected', 'selected'];

//   function findSelected(container) {
//     if (!container) return null;
//     for (var i = 0; i < SELECTED_CLASS_CANDIDATES.length; i++) {
//       var el = container.querySelector('.' + SELECTED_CLASS_CANDIDATES[i]);
//       if (el) return el;
//     }
//     // Fallback: condition buttons use aria-pressed="true"
//     return container.querySelector('[aria-pressed="true"]');
//   }

//   function getStoredListings() {
//     try {
//       var raw = localStorage.getItem(LISTINGS_KEY);
//       var parsed = raw ? JSON.parse(raw) : [];
//       return Array.isArray(parsed) ? parsed : [];
//     } catch (e) {
//       return [];
//     }
//   }

//   function saveListing(listing) {
//     var all = getStoredListings();
//     all.unshift(listing);
//     try {
//       localStorage.setItem(LISTINGS_KEY, JSON.stringify(all));
//     } catch (e) {
//       console.error('listing-storage: failed to save listing', e);
//     }
//   }

//   // ---- 1. Capture on home.html --------------------------------------

//   function collectListingFromForm() {
//     var titleEl = document.getElementById('listingProductName');
//     var priceEl = document.getElementById('listingPrice');
//     var descEl = document.getElementById('listingDescription');
//     var phoneEl = document.getElementById('listingPhone');
//     var waEl = document.getElementById('listingWhatsapp');
//     var negotiableEl = document.getElementById('listingNegotiable');

//     var categoryBtn = findSelected(document.getElementById('listingCategoryGrid'));
//     var conditionBtn = findSelected(document.getElementById('listingConditionGroup'));

//     var images = Array.prototype.map.call(
//       document.querySelectorAll('#listingImageGrid .gm-image-tile-img'),
//       function (img) { return img.src; }
//     );

//     var title = titleEl ? titleEl.value.trim() : '';
//     var category = categoryBtn ? categoryBtn.dataset.value : 'other';
//     var condition = conditionBtn ? conditionBtn.dataset.value : 'used';
//     var price = priceEl ? parseFloat(priceEl.value) || 0 : 0;

//     return {
//       id: 'user-' + Date.now(),
//       title: title,
//       category: category,
//       condition: condition,
//       price: price,
//       negotiable: !!(negotiableEl && negotiableEl.checked),
//       description: descEl ? descEl.value.trim() : '',
//       phone: phoneEl ? phoneEl.value.trim() : '',
//       whatsapp: waEl ? waEl.value.trim() : '',
//       images: images,
//       // No region-picker step exists yet in the Add-Listing wizard, so we
//       // can't know where the seller is. Defaulting to "all" keeps the
//       // listing visible under every region filter until that's added.
//       region: 'all',
//       area: '',
//       created: new Date().toISOString(),
//       mine: true
//     };
//   }

//   function isOnFinalStep() {
//     var stepCountEl = document.querySelector('#addListingModal [data-step-count]');
//     if (!stepCountEl) return true; // if we can't find it, don't block saving
//     var text = stepCountEl.textContent.trim();
//     // Expected text format is "8 / 8" per the progress bar markup.
//     var parts = text.split('/').map(function (s) { return s.trim(); });
//     return parts.length === 2 && parts[0] === parts[1];
//   }

//   function initCapture() {
//     var submitBtn = document.getElementById('submitListingBtn');
//     if (!submitBtn) return; // not on a page that has this modal

//     submitBtn.addEventListener('click', function () {
//       if (!isOnFinalStep()) return;

//       var listing = collectListingFromForm();
//       if (!listing.title) return; // safety guard against empty submissions

//       saveListing(listing);
//     });
//   }

//   // ---- 2. Render on Market.html --------------------------------------

//   function escapeHtml(str) {
//     return String(str).replace(/[&<>"']/g, function (c) {
//       return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
//     });
//   }

//   function priceFmt(n) {
//     return '₪' + Number(n).toLocaleString('en-US');
//   }

//   function buildCardHtml(listing) {
//     var img = listing.images && listing.images[0]
//       ? '<img src="' + escapeHtml(listing.images[0]) + '" alt="" loading="lazy" />'
//       : '';

//     return (
//       '<a href="listing.html?id=' + encodeURIComponent(listing.id) + '" class="mkt-card" ' +
//         'data-title="' + escapeHtml(listing.title) + '" ' +
//         'data-region="' + escapeHtml(listing.region || 'all') + '" ' +
//         'data-area="' + escapeHtml(listing.area || '') + '" ' +
//         'data-category="' + escapeHtml(listing.category || 'other') + '" ' +
//         'data-condition="' + escapeHtml(listing.condition || 'used') + '" ' +
//         'data-price="' + (listing.price || 0) + '" ' +
//         'data-created="' + escapeHtml(listing.created) + '" ' +
//         'data-mine="true">' +
//         '<div class="mkt-card__media">' + img +
//           '<button class="mkt-save" type="button" aria-label="Save listing">' +
//             '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mkt-save-icon" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' +
//           '</button>' +
//         '</div>' +
//         '<div class="mkt-card__body">' +
//           '<h3 class="mkt-card__title">' + escapeHtml(listing.title) + '</h3>' +
//           '<div class="mkt-card__meta">' +
//             '<span class="mkt-card__location"><i class="fas fa-location-dot"></i> ' + escapeHtml(listing.area || '') + '</span>' +
//             '<span class="mkt-card__condition mkt-card__condition--' + escapeHtml(listing.condition || 'used') + '">' +
//               escapeHtml((listing.condition || 'used').replace(/^\w/, function (c) { return c.toUpperCase(); })) +
//             '</span>' +
//           '</div>' +
//           '<div class="mkt-card__footer">' +
//             '<span class="mkt-card__price">' + priceFmt(listing.price) + '</span>' +
//             '<span class="mkt-card__time"></span>' +
//           '</div>' +
//         '</div>' +
//       '</a>'
//     );
//   }

//   function initRenderOnMarket() {
//     var grid = document.getElementById('mktGrid');
//     if (!grid) return; // not on the Market page

//     var listings = getStoredListings();
//     if (!listings.length) return;

//     // Build all cards, then insert them before whatever is already first in
//     // the grid, so user listings show up first while the static demo cards
//     // stay right after them.
//     var fragment = document.createDocumentFragment();
//     var temp = document.createElement('div');

//     listings.forEach(function (listing) {
//       temp.innerHTML = buildCardHtml(listing);
//       fragment.appendChild(temp.firstElementChild);
//     });

//     grid.insertBefore(fragment, grid.firstChild);
//   }

//   document.addEventListener('DOMContentLoaded', function () {
//     initCapture();
//     initRenderOnMarket();
//   });

//   window.GM_getUserListings = getStoredListings;
// })();