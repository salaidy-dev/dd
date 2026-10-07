(function () {
  'use strict';

  /* وضع التصميم: لو true وما في طاولات مخزنة بيعرض طاولات تجريبية.
     خليه false لما يربط الباك إند. */
  var DEMO_MODE = true;
  var DEMO_TABLES = [
    { number: 1, chairs: 4 }, { number: 2, chairs: 2 }, { number: 3, chairs: 6 },
    { number: 4, chairs: 4 }, { number: 5, chairs: 2 }, { number: 6, chairs: 4 }
  ];
  var SLOT_MS = 2 * 60 * 60 * 1000; // مدة الحجز: ساعتين

  var SHOP_ID = document.body.getAttribute('data-shop-id') || 'al-asema-cafe';
  var TABLES_KEY = 'gzm_tables_' + SHOP_ID;
  var RESERVATIONS_KEY = 'gzm_reservations_' + SHOP_ID;

  var modalEl = document.getElementById('reserveModal');
  var form = document.getElementById('reserveForm');
  var success = document.getElementById('rsvSuccess');
  var nameEl = document.getElementById('rsvName');
  var phoneEl = document.getElementById('rsvPhone');
  var timeEl = document.getElementById('rsvTime');
  var tableEl = document.getElementById('rsvTable');
  var hintEl = document.getElementById('rsvTableHint');
  var submitEl = document.getElementById('rsvSubmit');
  var fields = [nameEl, phoneEl, timeEl, tableEl];

  function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch (e) { return []; }
  }

  function getTables() {
    var t = readJSON(TABLES_KEY);
    if (!Array.isArray(t)) t = [];
    if (!t.length && DEMO_MODE) return DEMO_TABLES.slice();
    return t;
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function toLocalInput(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  /* هل الطاولة محجوزة بالوقت المختار؟ */
  function isBooked(tableNumber, arrivalValue) {
    if (!arrivalValue) return false;
    var at = new Date(arrivalValue).getTime();
    if (isNaN(at)) return false;
    return readJSON(RESERVATIONS_KEY).some(function (r) {
      if (String(r.tableNumber) !== String(tableNumber)) return false;
      if (r.status === 'rejected') return false;
      var rt = new Date(r.arrival).getTime();
      return !isNaN(rt) && Math.abs(rt - at) < SLOT_MS;
    });
  }

  /* تعبئة القائمة المنسدلة: "طاولة N — X كراسي" */
  function fillTables() {
    var tables = getTables();
    var previous = tableEl.value;
    tableEl.innerHTML = '';

    var first = document.createElement('option');
    first.value = '';
    first.textContent = tables.length ? 'اختر الطاولة' : 'لا توجد طاولات متاحة حالياً';
    tableEl.appendChild(first);

    var freeCount = 0;

    tables.forEach(function (t) {
      var booked = isBooked(t.number, timeEl.value);
      if (!booked) freeCount++;

      var o = document.createElement('option');
      o.value = t.number;
      o.textContent = 'طاولة ' + t.number + ' — ' + t.chairs + ' كراسي' + (booked ? ' (محجوزة)' : '');
      o.disabled = booked;
      tableEl.appendChild(o);
    });

    // رجّع الاختيار السابق لو لسا متاح
    if (previous) {
      var still = Array.prototype.filter.call(tableEl.options, function (o) {
        return o.value === previous && !o.disabled;
      })[0];
      if (still) tableEl.value = previous;
    }

    tableEl.disabled = !tables.length;
    submitEl.disabled = !tables.length;

    if (!tables.length) {
      hintEl.textContent = 'صاحب الكافيه لسا ما أضاف طاولات.';
    } else if (!freeCount) {
      hintEl.textContent = 'كل الطاولات محجوزة بهذا الموعد، جرب موعد ثاني.';
    } else {
      hintEl.textContent = '';
    }
  }

  function setInvalid(el, bad) {
    el.classList.toggle('is-invalid', bad);
    return !bad;
  }

  function validate() {
    var ok = true;
    ok = setInvalid(nameEl, nameEl.value.trim().length < 2) && ok;
    ok = setInvalid(phoneEl, !/^05\d{8}$/.test(phoneEl.value.trim())) && ok;
    var t = timeEl.value ? new Date(timeEl.value) : null;
    ok = setInvalid(timeEl, !t || t.getTime() < Date.now()) && ok;
    ok = setInvalid(tableEl, !tableEl.value) && ok;
    return ok;
  }

  phoneEl.addEventListener('input', function () {
    phoneEl.value = phoneEl.value.replace(/\D/g, '');
  });

  fields.forEach(function (el) {
    el.addEventListener('input', function () { el.classList.remove('is-invalid'); });
    el.addEventListener('change', function () { el.classList.remove('is-invalid'); });
  });

  /* تغيير الموعد → تحديث الطاولات المحجوزة بالقائمة */
  timeEl.addEventListener('change', fillTables);

  modalEl.addEventListener('show.bs.modal', function () {
    form.reset();
    form.style.display = '';
    success.classList.remove('is-visible');
    fields.forEach(function (el) { el.classList.remove('is-invalid'); });
    timeEl.min = toLocalInput(new Date());
    fillTables();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;

    var chosen = getTables().filter(function (t) {
      return String(t.number) === tableEl.value;
    })[0];

    var reservation = {
      id: Date.now(),
      shopId: SHOP_ID,
      name: nameEl.value.trim(),
      phone: phoneEl.value.trim(),
      arrival: timeEl.value,
      tableNumber: chosen ? chosen.number : tableEl.value,
      chairs: chosen ? chosen.chairs : null,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    var all = readJSON(RESERVATIONS_KEY);
    all.push(reservation);
    localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(all));

    form.style.display = 'none';
    document.getElementById('rsvSuccessText').textContent =
      'طاولة ' + reservation.tableNumber + ' — بنتواصل معك على ' + reservation.phone + ' لتأكيد الحجز.';
    success.classList.add('is-visible');
  });
})();
