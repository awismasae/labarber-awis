const API = 'https://script.google.com/macros/s/AKfycbyj7vglCTIY835MkNGMqC1Tu0jYgQybZzYhZS1MFvjFAFNRntB2kyWacIyN6OnQx5F1/exec';
const ADMIN_CODE = 'zola123';

function formatDateThai(dateStr) {
  if (!dateStr) return '';
  const d = new Date(String(dateStr).slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return String(dateStr);
  const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return days[d.getDay()] + ' ' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + (d.getFullYear() + 543);
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const s = String(timeStr);
  if (s.includes('T')) {
    const match = s.match(/T(\d{2}):(\d{2})/);
    if (match) return match[1] + ':' + match[2];
  }
  return s.slice(0, 5);
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
  } catch (e) { return false; }
}

async function fetchBookings() {
  const res = await fetch(API);
  if (!res.ok) throw new Error('load failed');
  const list = await res.json();
  return (Array.isArray(list) ? list : []).sort((a, b) => {
    const da = String(a.date).slice(0, 10);
    const db = String(b.date).slice(0, 10);
    if (da !== db) return da.localeCompare(db);
    return formatTime(a.time).localeCompare(formatTime(b.time));
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

function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const sec = document.getElementById(id);
  if (sec) sec.classList.add('active');
  document.querySelectorAll('[data-section="' + id + '"]').forEach(l => l.classList.add('active'));
  const mobile = document.getElementById('mobileNav');
  if (mobile) mobile.classList.remove('open');
  if (id === 'queue') renderQueue();
  window.scrollTo(0, 0);
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
      alert('วันจันทร์ร้านหยุดครับ');
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
      alert('วันจันทร์ร้านหยุดครับ');
      return;
    }
    try {
      const existing = await fetchBookings();
      if (existing.find(b => String(b.date).slice(0, 10) === booking.date && formatTime(b.time) === booking.time)) {
        alert('ช่วงเวลานี้มีคนจองแล้ว');
        return;
      }
    } catch (err) {
      alert('เชื่อมต่อไม่ได้ ลองใหม่');
      return;
    }
    pendingBooking = booking;
    const details = document.getElementById('confirmDetails');
    if (details) {
      details.innerHTML = '<p><strong>ชื่อ:</strong> ' + escapeHtml(booking.customerName) + '</p>' +
        '<p><strong>โทร:</strong> ' + escapeHtml(booking.phone) + '</p>' +
        '<p><strong>ที่อยู่:</strong> ' + escapeHtml(booking.address) + '</p>' +
        '<p><strong>วันเวลา:</strong> ' + formatDateThai(booking.date) + ' ' + booking.time + ' น.</p>';
    }
    const modal = document.getElementById('confirmModal');
    if (modal) modal.classList.remove('hidden');
  });
}

function hideConfirmModal() {
  const modal = document.getElementById('confirmModal');
  if (modal) modal.classList.add('hidden');
  pendingBooking = null;
}

async function confirmAndSave() {
  if (!pendingBooking) return;
  const btn = document.getElementById('confirmBooking');
  if (btn) btn.disabled = true;
  try {
    const result = await postJson(pendingBooking);
    if (result && result.id) saveMyBooking(result.id);
    const msg = document.getElementById('successMessage');
    if (msg) msg.textContent = 'จองสำเร็จ ' + formatDateThai(pendingBooking.date) + ' ' + pendingBooking.time + ' น.';
    const success = document.getElementById('bookingSuccess');
    if (success) success.classList.remove('hidden');
    document.getElementById('bookingForm').reset();
    hideConfirmModal();
  } catch (err) {
    alert('บันทึกไม่สำเร็จ');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function renderQueue(filterDate) {
  const listEl = document.getElementById('queueList');
  const emptyEl = document.getElementById('queueEmpty');
  if (!listEl) return;
  listEl.innerHTML = '<p style="text-align:center">กำลังโหลด...</p>';
  try {
    let bookings = await fetchBookings();
    if (filterDate) {
      bookings = bookings.filter(b => String(b.date).slice(0, 10) === filterDate);
    }
    if (!bookings.length) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');

    const isAdmin = sessionStorage.getItem('labarber_admin') === '1';

    listEl.innerHTML = bookings.map(function(b) {
      const canCancel = isMyBooking(b.id) || isAdmin;
      const timeDisplay = formatTime(b.time);
      return '<div class="queue-item"><div class="queue-time"><div class="date">' + formatDateThai(b.date) + '</div><div class="time">' + timeDisplay + ' น.</div></div><div class="queue-info"><h4>' + escapeHtml(b.customerName) + '</h4>' +
        (isAdmin ? '<p>📞 ' + escapeHtml(b.phone || '') + '</p><p>📍 ' + escapeHtml(b.address || '') + '</p>' : '') +
        '</div><div class="queue-actions">' +
        (canCancel ? '<button class="btn btn-danger btn-cancel" data-id="' + b.id + '">' + (isAdmin ? 'ลบคิว' : 'ยกเลิก') + '</button>' : '') +
        '</div></div>';
    }).join('');

    listEl.querySelectorAll('.btn-cancel').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        if (!confirm('ลบคิวนี้ใช่หรือไม่?')) return;
        await postJson({ action: 'delete', id: btn.dataset.id });
        try {
          const list = JSON.parse(localStorage.getItem('labarber_my_bookings') || '[]');
          localStorage.setItem('labarber_my_bookings', JSON.stringify(list.filter(id => id !== btn.dataset.id)));
        } catch {}
        renderQueue(document.getElementById('filterDate').value || null);
      });
    });
  } catch (err) {
    listEl.innerHTML = '<p>โหลดไม่ได้</p>';
  }
}

document.addEventListener('DOMContentLoaded', function() {
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

  const cancelBtn = document.getElementById('cancelConfirm');
  if (cancelBtn) cancelBtn.addEventListener('click', hideConfirmModal);
  const confirmBtn = document.getElementById('confirmBooking');
  if (confirmBtn) confirmBtn.addEventListener('click', confirmAndSave);

  const goToQueue = document.getElementById('goToQueue');
  if (goToQueue) {
    goToQueue.addEventListener('click', function() {
      showSection('queue');
    });
  }

  const filterDate = document.getElementById('filterDate');
  if (filterDate) {
    filterDate.addEventListener('change', function() {
      renderQueue(filterDate.value || null);
    });
  }
  const clearFilter = document.getElementById('clearFilter');
  if (clearFilter) {
    clearFilter.addEventListener('click', function() {
      if (filterDate) filterDate.value = '';
      renderQueue();
    });
  }
  const refreshQueue = document.getElementById('refreshQueue');
  if (refreshQueue) {
    refreshQueue.addEventListener('click', function() {
      renderQueue(filterDate ? filterDate.value || null : null);
    });
  }

  // ช่องล็อกอินแอดมิน
  const queueSection = document.getElementById('queue');
  if (queueSection) {
    const adminBox = document.createElement('div');
    adminBox.style.cssText = 'margin: 1rem 0; padding: 1rem; background: #f8f4ef; border-radius: 12px; text-align: center;';
    adminBox.innerHTML = `
      <input type="password" id="adminInput" placeholder="รหัสแอดมิน" style="padding: 0.5rem; border-radius: 8px; border: 1px solid #ddd; margin-right: 0.5rem;">
      <button type="button" id="adminLogin" class="btn btn-outline btn-sm">เข้าสู่ระบบแอดมิน</button>
      <button type="button" id="adminLogout" class="btn btn-outline btn-sm" style="display:none; margin-left:0.5rem;">ออกจากระบบ</button>
    `;
    const controls = queueSection.querySelector('.queue-controls');
    if (controls) controls.after(adminBox);

    const loginBtn = document.getElementById('adminLogin');
    const logoutBtn = document.getElementById('adminLogout');
    const adminInput = document.getElementById('adminInput');

    function updateAdminUI() {
      const isAdmin = sessionStorage.getItem('labarber_admin') === '1';
      if (loginBtn) loginBtn.style.display = isAdmin ? 'none' : 'inline-block';
      if (logoutBtn) logoutBtn.style.display = isAdmin ? 'inline-block' : 'none';
      if (adminInput) adminInput.style.display = isAdmin ? 'none' : 'inline-block';
    }
    updateAdminUI();

    if (loginBtn) {
      loginBtn.addEventListener('click', function() {
        if (adminInput.value === ADMIN_CODE) {
          sessionStorage.setItem('labarber_admin', '1');
          adminInput.value = '';
          updateAdminUI();
          renderQueue(filterDate ? filterDate.value || null : null);
          alert('เข้าสู่โหมดแอดมินแล้ว');
        } else {
          alert('รหัสไม่ถูกต้อง');
        }
      });
    }
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        sessionStorage.removeItem('labarber_admin');
        updateAdminUI();
        renderQueue(filterDate ? filterDate.value || null : null);
      });
    }
  }

  const getLoc = document.getElementById('getLocation');
  if (getLoc) {
    getLoc.addEventListener('click', function() {
      if (!navigator.geolocation) { alert('ไม่รองรับ'); return; }
      getLoc.disabled = true;
      getLoc.textContent = 'กำลังหา...';
      navigator.geolocation.getCurrentPosition(function(pos) {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        if (document.getElementById('lat')) document.getElementById('lat').value = lat;
        if (document.getElementById('lng')) document.getElementById('lng').value = lng;
        const addr = document.getElementById('address');
        if (addr && !addr.value.trim()) addr.value = 'พิกัด: ' + lat + ', ' + lng;
        alert('บันทึกตำแหน่งแล้ว');
        getLoc.textContent = '📍 ใช้ตำแหน่งปัจจุบัน';
        getLoc.disabled = false;
      }, function() {
        alert('ไม่สามารถหาตำแหน่งได้');
        getLoc.textContent = '📍 ใช้ตำแหน่งปัจจุบัน';
        getLoc.disabled = false;
      });
    });
  }

  showSection('home');
});