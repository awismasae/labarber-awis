const API = 'https://script.google.com/macros/s/AKfycbyj7vglCTIY835MkNGMqC1Tu0jYgQybZzYhZS1MFvjFAFNRntB2kyWacIyN6OnQx5F1/exec';

function formatDateThai(dateStr) {
  if (!dateStr) return '';
  const d = new Date(String(dateStr).slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return String(dateStr);
  const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return days[d.getDay()] + ' ' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + (d.getFullYear() + 543);
}

function isMonday(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr + 'T00:00:00').getDay() === 1;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function saveMyBooking(id) {
  try {
    const list = JSON.parse(localStorage.getItem('labarber_my_bookings') || '[]');
    if (!list.includes(id)) list.push(id);
    localStorage.setItem('labarber_my_bookings', JSON.stringify(list));
  } catch (e) {}
}

function isMyBooking(id) {
  try {
    const list = JSON.parse(localStorage.getItem('labarber_my_bookings') || '[]');
    return list.includes(String(id));
  } catch (e) {
    return false;
  }
}

async function fetchBookings() {
  const res = await fetch(API);
  if (!res.ok) throw new Error('load failed');
  const list = await res.json();
  return (Array.isArray(list) ? list : []).sort((a, b) => {
    if (a.date !== b.date) return String(a.date).localeCompare(String(b.date));
    return String(a.time).localeCompare(String(b.time));
  });
}

async function postJson(data) {
  const res = await fetch(API, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('save failed');
  return res.json().catch(() => ({}));
}

function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const section = document.getElementById(sectionId);
  if (section) section.classList.add('active');
  document.querySelectorAll('.nav-link[data-section="' + sectionId + '"]').forEach(l => l.classList.add('active'));
  const mobile = document.getElementById('mobileNav');
  if (mobile) mobile.classList.remove('open');
  if (sectionId === 'queue') renderQueue();
  if (sectionId !== 'booking') {
    const ok = document.getElementById('bookingSuccess');
    if (ok) ok.classList.add('hidden');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

let pendingBooking = null;

function setupForm() {
  const form = document.getElementById('bookingForm');
  const dateInput = document.getElementById('date');
  if (!form || !dateInput) return;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  dateInput.min = tomorrow.toISOString().split('T')[0];
  dateInput.addEventListener('change', function() {
    if (isMonday(dateInput.value)) {
      alert('วันจันทร์ร้านหยุดครับ กรุณาเลือกวันอื่น');
      dateInput.value = '';
    }
  });
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const booking = {
      customerName: document.getElementById('customerName').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      address: document.getElementById('address').value.trim(),
      date: document.getElementById('date').value,
      time: document.getElementById('time').value,
      service: document.getElementById('service').value,
      note: document.getElementById('note').value.trim(),
      lat: document.getElementById('lat') ? document.getElementById('lat').value : '',
      lng: document.getElementById('lng') ? document.getElementById('lng').value : '',
      createdAt: new Date().toISOString()
    };
    if (isMonday(booking.date)) {
      alert('วันจันทร์ร้านหยุดครับ กรุณาเลือกวันอื่น');
      return;
    }
    try {
      const existing = await fetchBookings();
      if (existing.find(b => String(b.date).slice(0, 10) === booking.date && b.time === booking.time)) {
        alert('ขออภัย ช่วงเวลานี้มีคนจองแล้ว');
        return;
      }
    } catch (err) {
      alert('เชื่อมต่อคิวกลางไม่ได้ ลองใหม่อีกครั้ง');
      return;
    }
    pendingBooking = booking;
    document.getElementById('confirmDetails').innerHTML =
      '<p><strong>ชื่อ:</strong> ' + escapeHtml(booking.customerName) + '</p>' +
      '<p><strong>โทร:</strong> ' + escapeHtml(booking.phone) + '</p>' +
      '<p><strong>ที่อยู่:</strong> ' + escapeHtml(booking.address) + '</p>' +
      '<p><strong>วันเวลา:</strong> ' + formatDateThai(booking.date) + ' เวลา ' + booking.time + ' น.</p>' +
      '<p><strong>บริการ:</strong> ' + escapeHtml(booking.service) + '</p>' +
      (booking.note ? '<p><strong>หมายเหตุ:</strong> ' + escapeHtml(booking.note) + '</p>' : '') +
      (booking.lat ? '<p><strong>พิกัด:</strong> ' + booking.lat + ', ' + booking.lng + '</p>' : '');
    document.getElementById('confirmModal').classList.remove('hidden');
  });
}

function hideConfirmModal() {
  document.getElementById('confirmModal').classList.add('hidden');
  pendingBooking = null;
}

async function confirmAndSave() {
  if (!pendingBooking) return;
  const btn = document.getElementById('confirmBooking');
  btn.disabled = true;
  try {
    const result = await postJson(pendingBooking);
    if (result && result.id) saveMyBooking(result.id);
    document.getElementById('successMessage').textContent = 'จองคิวสำเร็จสำหรับ ' + formatDateThai(pendingBooking.date) + ' เวลา ' + pendingBooking.time + ' น.';
    document.getElementById('bookingSuccess').classList.remove('hidden');
    document.getElementById('bookingForm').reset();
    hideConfirmModal();
  } catch (err) {
    alert('บันทึกคิวไม่สำเร็จ ลองใหม่อีกครั้ง');
  } finally {
    btn.disabled = false;
  }
}

async function renderQueue(filterDate) {
  const listEl = document.getElementById('queueList');
  const emptyEl = document.getElementById('queueEmpty');
  if (!listEl) return;
  listEl.innerHTML = '<p style="text-align:center;color:#6B5344">กำลังโหลดคิว...</p>';
  try {
    let bookings = await fetchBookings();
    if (filterDate) bookings = bookings.filter(b => String(b.date).slice(0, 10) === filterDate);
    if (!bookings.length) {
      listEl.innerHTML = '';
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');
    listEl.innerHTML = bookings.map(function(b) {
      const canCancel = isMyBooking(b.id);
      return '<div class="queue-item">' +
        '<div class="queue-time"><div class="date">' + formatDateThai(b.date) + '</div><div class="time">' + b.time + ' น.</div></div>' +
        '<div class="queue-info"><h4>' + escapeHtml(b.customerName) + '</h4><span class="service-tag">' + escapeHtml(b.service) + '</span></div>' +
        '<div class="queue-actions">' +
        (canCancel ? '<button type="button" class="btn btn-danger btn-cancel" data-id="' + b.id + '">ยกเลิกคิวของฉัน</button>' : '<span style="color:#999;font-size:0.85rem;">—</span>') +
        '</div></div>';
    }).join('');
    listEl.querySelectorAll('.btn-cancel').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        if (!confirm('ต้องการยกเลิกคิวนี้ใช่หรือไม่?')) return;
        await postJson({ action: 'delete', id: btn.dataset.id });
        try {
          const list = JSON.parse(localStorage.getItem('labarber_my_bookings') || '[]');
          localStorage.setItem('labarber_my_bookings', JSON.stringify(list.filter(function(id) { return id !== btn.dataset.id; })));
        } catch (e) {}
        renderQueue(document.getElementById('filterDate').value || null);
      });
    });
  } catch (err) {
    listEl.innerHTML = '<p style="text-align:center;color:#B33A3A">โหลดคิวไม่ได้ ลองกดรีเฟรช</p>';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear() + 543;

  document.querySelectorAll('[data-section]').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.preventDefault();
      if (el.dataset.section) showSection(el.dataset.section);
    });
  });

  const menu = document.getElementById('menuToggle');
  if (menu) menu.addEventListener('click', function() {
    document.getElementById('mobileNav').classList.toggle('open');
  });

  setupForm();

  const cancelConfirm = document.getElementById('cancelConfirm');
  if (cancelConfirm) cancelConfirm.addEventListener('click', hideConfirmModal);
  const confirmBooking = document.getElementById('confirmBooking');
  if (confirmBooking) confirmBooking.addEventListener('click', confirmAndSave);
  const backdrop = document.querySelector('.modal-backdrop');
  if (backdrop) backdrop.addEventListener('click', hideConfirmModal);

  const filterDate = document.getElementById('filterDate');
  if (filterDate) filterDate.addEventListener('change', function(e) {
    renderQueue(e.target.value || null);
  });
  const clearFilter = document.getElementById('clearFilter');
  if (clearFilter) clearFilter.addEventListener('click', function() {
    document.getElementById('filterDate').value = '';
    renderQueue();
  });
  const refreshQueue = document.getElementById('refreshQueue');
  if (refreshQueue) refreshQueue.addEventListener('click', function() {
    renderQueue(document.getElementById('filterDate').value || null);
  });
  const goToQueue = document.getElementById('goToQueue');
  if (goToQueue) goToQueue.addEventListener('click', function() {
    showSection('queue');
  });

  const getLocation = document.getElementById('getLocation');
  if (getLocation) {
    getLocation.addEventListener('click', function() {
      if (!navigator.geolocation) {
        alert('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง');
        return;
      }
      getLocation.disabled = true;
      getLocation.textContent = 'กำลังหาตำแหน่ง...';
      navigator.geolocation.getCurrentPosition(
        function(pos) {
          const lat = pos.coords.latitude.toFixed(6);
          const lng = pos.coords.longitude.toFixed(6);
          document.getElementById('lat').value = lat;
          document.getElementById('lng').value = lng;
          const addressField = document.getElementById('address');
          if (!addressField.value.trim()) {
            addressField.value = 'พิกัด: ' + lat + ', ' + lng;
          }
          alert('บันทึกตำแหน่งแล้ว\nพิกัด: ' + lat + ', ' + lng);
          getLocation.textContent = '📍 ใช้ตำแหน่งปัจจุบัน';
          getLocation.disabled = false;
        },
        function() {
          alert('ไม่สามารถระบุตำแหน่งได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง');
          getLocation.textContent = '📍 ใช้ตำแหน่งปัจจุบัน';
          getLocation.disabled = false;
        }
      );
    });
  }

  const hash = window.location.hash.slice(1);
  showSection(['home', 'booking', 'queue', 'about'].indexOf(hash) !== -1 ? hash : 'home');
});