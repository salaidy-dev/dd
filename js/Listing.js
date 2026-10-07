/**
 * listing.js (نسخة مختصرة)
 * مؤقت: يرسم listing.html من window.GM_LISTINGS حسب ?id=
 * عند الانتقال إلى Blade: احذف كل الرسم (الجزء الأول) وابقِ فقط: السلايدر + المشاركة + Show more.
 * تم حذف: syncColumnHeights (الارتفاع صار بالـ CSS)، وحفظ localStorage (الحفظ صار POST).
 */
(function () {
  'use strict';

  var CONDITION_LABEL = { new: 'New', used: 'Used', urgent: 'Urgent' };
  var REGION_LABEL = { north: 'North Gaza', central: 'Central Gaza', south: 'South Gaza' };
  var S = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
  var ICONS = {
    box: '<svg ' + S + '><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg>',
    tv: '<svg ' + S + '><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    mobile: '<svg ' + S + '><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>',
    shirt: '<svg ' + S + '><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 .55.45 1 1 1h10c.55 0 1-.45 1-1V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>',
    bed: '<svg ' + S + '><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/></svg>',
    home: '<svg ' + S + '><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/></svg>',
    fridge: '<svg ' + S + '><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M5 9h14M9 5v2M9 13v4"/></svg>',
    book: '<svg ' + S + '><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>'
  };
  var PIN = '<i class="fas fa-location-dot"></i>';

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function price(n) { return '₪' + Number(n).toLocaleString('en-US'); }
  function cleanNumber(raw) {
    var t = String(raw || '').trim();
    return (t.charAt(0) === '+' ? '+' : '') + t.replace(/[^\d]/g, '');
  }
  function timeAgo(iso) {
    var t = new Date(iso).getTime();
    if (isNaN(t)) return '';
    var m = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (m < 1) return 'Just now';
    if (m < 60) return m + (m === 1 ? ' minute ago' : ' minutes ago');
    var h = Math.floor(m / 60);
    if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
    var d = Math.floor(h / 24);
    if (d < 7) return d + (d === 1 ? ' day ago' : ' days ago');
    var w = Math.floor(d / 7);
    if (w < 5) return w + (w === 1 ? ' week ago' : ' weeks ago');
    var mo = Math.floor(d / 30);
    if (mo < 12) return mo + (mo === 1 ? ' month ago' : ' months ago');
    var y = Math.floor(d / 365);
    return y + (y === 1 ? ' year ago' : ' years ago');
  }

  var root = $('lstRoot'), notFound = $('lstNotFound');
  if (!root) return;

  var listings = window.GM_LISTINGS || [];
  var id = new URLSearchParams(location.search).get('id');
  var listing = listings.filter(function (l) { return l.id === id; })[0];

  if (!listing) {
    root.style.display = 'none';
    if (notFound) notFound.style.display = 'block';
    return;
  }

  /* ================= الرسم (يُحذف كله عند Blade) ================= */
  document.title = listing.title + ' | Gaza Market';
  $('lstCrumbCategory').textContent = listing.categoryLabel;
  $('lstCrumbCategory').href = 'Market.html?category=' + encodeURIComponent(listing.category);
  $('lstCrumbTitle').textContent = listing.title;

  $('lstBadges').innerHTML =
    (listing.negotiable
      ? '<span class="lst-chip lst-chip--negotiable">Negotiable</span>'
      : '<span class="lst-chip lst-chip--fixed">Fixed Price</span>') +
    '<span class="lst-chip lst-chip--condition-' + esc(listing.condition) + '">' +
    esc(CONDITION_LABEL[listing.condition] || listing.condition) + '</span>';

  $('lstTitle').textContent = listing.title;
  $('lstPrice').textContent = price(listing.price);
  $('lstRegion').textContent = (REGION_LABEL[listing.region] || '') + ' – ' + listing.regionLabel;
  $('lstPosted').textContent = 'Posted ' + timeAgo(listing.created);
  $('lstCategory').textContent = listing.categoryLabel;

  var seller = listing.seller || {};
  $('lstSellerAvatar').textContent = (seller.name || '?').trim().charAt(0);
  $('lstSellerName').textContent = seller.name || 'Seller';
  $('lstSellerMeta').textContent = (seller.kind || 'Seller') + ' · Member since ' + (seller.memberSince || '—') +
    (seller.responseRate ? ' · ' + seller.responseRate + ' response rate' : '');

  if (listing.phone) {
    $('lstPhoneNumber').textContent = listing.phone;
    $('lstPhoneBtn').href = 'tel:' + cleanNumber(listing.phone);
  } else { $('lstPhoneBtn').style.display = 'none'; }

  if (listing.whatsapp) {
    $('lstWhatsappNumber').textContent = listing.whatsapp;
    $('lstWhatsappBtn').href = 'https://wa.me/' + cleanNumber(listing.whatsapp).replace('+', '');
  } else { $('lstWhatsappBtn').style.display = 'none'; }

  $('lstDescription').textContent = listing.description || 'No description provided.';

  var images = listing.images || [];
  var frame = $('lstMainMedia');
  frame.innerHTML = images.length
    ? images.map(function (src, i) {
        return '<img src="' + esc(src) + '" alt="' + esc(listing.title) + '"' + (i ? ' hidden' : '') + '>';
      }).join('')
    : '<div class="lst-icon-fallback">' + (ICONS[listing.icon] || ICONS.box) + '</div>';

  var similar = listings.filter(function (l) {
    return l.id !== listing.id && l.category === listing.category;
  }).slice(0, 4);
  if (!similar.length) {
    $('lstSimilarSection').style.display = 'none';
  } else {
    $('lstSimilarGrid').innerHTML = similar.map(function (l) {
      var media = l.images && l.images.length
        ? '<img src="' + esc(l.images[0]) + '" alt="" loading="lazy">'
        : (ICONS[l.icon] || ICONS.box);
      return '<a href="listing.html?id=' + encodeURIComponent(l.id) + '" class="mkt-card">' +
        '<div class="mkt-card__media">' + media + '</div>' +
        '<div class="mkt-card__body">' +
          '<h3 class="mkt-card__title">' + esc(l.title) + '</h3>' +
          '<div class="mkt-card__meta">' +
            '<span class="mkt-card__location">' + PIN + ' ' + esc(l.regionLabel) + '</span>' +
            '<span class="mkt-card__condition mkt-card__condition--' + esc(l.condition) + '">' + esc(CONDITION_LABEL[l.condition] || l.condition) + '</span>' +
          '</div>' +
          '<div class="mkt-card__footer"><span class="mkt-card__price">' + price(l.price) + '</span>' +
          '<span class="mkt-card__time">' + timeAgo(l.created) + '</span></div>' +
        '</div></a>';
    }).join('');
  }

  /* ================= يبقى عند Blade ================= */

  // --- السلايدر: يشتغل على أي <img> داخل #lstMainMedia ---
  var slides = frame.querySelectorAll('img');
  var dots = $('lstDots'), prev = $('lstPrevBtn'), next = $('lstNextBtn');
  var current = 0;

  function go(i) {
    current = (i + slides.length) % slides.length;
    slides.forEach(function (img, k) { img.hidden = k !== current; });
    dots.querySelectorAll('button').forEach(function (b, k) { b.classList.toggle('is-active', k === current); });
  }

  if (slides.length > 1) {
    dots.innerHTML = Array.prototype.map.call(slides, function (_, i) {
      return '<button type="button" class="' + (i ? '' : 'is-active') + '" data-i="' + i + '" aria-label="Image ' + (i + 1) + '"></button>';
    }).join('');
    dots.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (b) go(+b.dataset.i);
    });
    prev.addEventListener('click', function () { go(current - 1); });
    next.addEventListener('click', function () { go(current + 1); });
    var x0 = null, box = frame.parentElement;
    box.addEventListener('touchstart', function (e) { x0 = e.changedTouches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) go(dx < 0 ? current + 1 : current - 1);
      x0 = null;
    }, { passive: true });
  } else {
    prev.hidden = next.hidden = dots.hidden = true;
  }

  // --- Show more / Show less (الأفضل لاحقاً <details> بدون JS) ---
  var desc = $('lstDescription'), full = desc.textContent, LIMIT = 150;
  if (full.length > LIMIT) {
    var short = full.slice(0, LIMIT).trim() + '…', open = false;
    desc.textContent = short;
    var t = document.createElement('button');
    t.type = 'button'; t.className = 'lst-desc-toggle'; t.textContent = 'Show more';
    t.addEventListener('click', function () {
      open = !open;
      desc.textContent = open ? full : short;
      t.textContent = open ? 'Show less' : 'Show more';
    });
    desc.insertAdjacentElement('afterend', t);
  }

  // --- المشاركة ---
  var share = $('lstShareBtn');
  share.addEventListener('click', function () {
    if (navigator.share) {
      navigator.share({ title: listing.title, url: location.href }).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(location.href).then(function () {
        share.setAttribute('data-tip', 'Link copied');
        setTimeout(function () { share.removeAttribute('data-tip'); }, 1500);
      });
    }
  });
})();