/**
 * LA Barber – คิวกลางใน Google Sheet
 * หยุดทุกวันจันทร์
 * ลูกค้าลบได้เฉพาะคิวของตัวเองเท่านั้น
 * หน้าเช็คคิวแสดงแค่ชื่อกับเวลา
 */
const API = 'https://script.google.com/macros/s/AKfycbyj7vglCTIY835MkNGMqC1Tu0jYgQybZzYhZS1MFvjFAFNRntB2kyWacIyN6OnQx5F1/exec';

function formatDateThai(dateStr) {
  if (!dateStr) return '';
  const d = new Date(String(dateStr).slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return String(dateStr);
  const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
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
  } catch {}
}

function isMyBooking(id) {
  try {
    const list = JSON.parse(localStorage.getItem('labarber_my_bookings') || '[]');
    return list.includes(String(id));
  } catch {
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
  document.querySelectorAll(`.nav-link[data-section="${sectionId}"]`).forEach(l => l.classList.add('active'));
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
  dateInput.addEventListener('change', () => {
    if (isMonday(dateInput.value)) {
      alert('วันจันทร์ร้านหยุดครับ กรุณาเลือกวันอื่น');
      dateInput.value = '';
    }
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const booking = {
      customerName: document.getElementById('customerName').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      address: document.getElementById('address').value.trim(),
      date: document.getElementById('date').value,
      time: document.getElementById('time').value,
      service: document.getElementById('service').value,
      note: document.getElementById('note').value.trim(),
      lat: document.getElementById('lat').value,
      lng: document.getElementById('lng').value,
      createdAt: new Date().toISOString()
    };
    if (isMonday(booking.date)) {
      alert('วันจันทร์ร้านหยุดครับ กรุณาเลือกวันอื่น');
      return;
    }
    try {
      const existing = await fetchBookings();
      if (existing.find(b => String(b.date).slice(0, 10) === booking.date && b.time === booking.time)) {
        alert(`ขออภัย ช่วงเวลา ${booking.time} น. ของวันที่ ${formatDateThai(booking.date)} มีคนจองแล้ว`);
        return;
      }
    } catch {
      alert('เชื่อมต่อคิวกลางไม่ได้ ลองใหม่อีกครั้ง');
      return;
    }
    pendingBooking = booking;
    document.getElementById('confirmDetails').innerHTML = `
      <p><strong>ชื่อ:</strong> ${escapeHtml(booking.customerName)}</p>
      <p><strong>โทร:</strong> ${escapeHtml(booking.phone)}</p>
      <p><strong>ที่อยู่:</strong> ${escapeHtml(booking.address)}</p>
      <p><strong>วันเวลา:</strong> ${formatDateThai(booking.date)} เวลา ${booking.time} น.</p>
      <p><strong>บริการ:</strong> ${escapeHtml(booking.service)}</p>
      ${booking.note ? `<p><strong>หมายเหตุ:</strong> ${escapeHtml(booking.note)}</p>` : ''}
      ${booking.lat ? `<p><strong>พิกัด:</strong> ${booking.lat}, ${booking.lng}</p>` : ''}
    `;
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
    if (result && result.id) {
      saveMyBooking(result.id);
    }
    document.getElementById('successMessage').textContent =
      `จองคิวสำเร็จสำหรับ ${formatDateThai(pendingBooking.date)} เวลา ${pendingBooking.time} น.`;
    document.getElementById('bookingSuccess').classList.remove('hidden');
    document.getElementById('bookingForm').reset();
    hideConfirmModal();
  } catch {
    alert('บันทึกคิวไม่สำเร็จ ลองใหม่อีกครั้ง');
  } finally {
    btn.disabled = false;
  }
}

async function renderQueue(filterDate = null) {
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
    listEl.innerHTML = bookings.map(b => {
      const canCancel = isMyBooking(b.id);
      return `
        <div class="queue-item">
          <div class="queue-time">
            <div class="date">${formatDateThai(b.date)}</div>
            <div class="time">${b.time} น.</div>
          </div>
          <div class="queue-info">
            <h4>${escapeHtml(b.customerName)}</h4>
            <span class="service-tag">${escapeHtml(b.service)}</span>
          </div>
          <div class="queue-actions">
            ${canCancel
              ? `<button type="button" class="btn btn-danger btn-cancel" data-id="${b.id}">ยกเลิกคิวของฉัน</button>`
              : `<span style="color:#999;font-size:0.85rem;">—</span>`
            }
          </div>
        </div>
      `;
    }).join('');
    listEl.querySelectorAll('.btn-cancel').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('ต้องการยกเลิกคิวนี้ใช่หรือไม่?')) return;
        await postJson({ action: 'delete', id: btn.dataset.id });
        try {
          const list = JSON.parse(localStorage.getItem('labarber_my_bookings') || '[]');
          localStorage.setItem('labarber_my_bookings', JSON.stringify(list.filter(id => id !== btn.dataset.id)));
        } catch {}
        renderQueue(document.getElementById('filterDate').value || null);
      });
    });
  } catch {
    listEl.innerHTML = '<p style="text-align:center;color:#B33A3A">โหลดคิวไม่ได้ ลองกดรีเฟรช</p>';
  }
}

// ปุ่มใช้ตำแหน่งปัจจุบัน
document.getElementById('getLocation')?.addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง');
    return;
  }
  const btn = document.getElementById('getLocation');
  btn.disabled = true;
  btn.textContent = 'กำลังหาตำแหน่ง...';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      document.getElementById('lat').value = lat;
      document.getElementById('lng').value = lng;
      const addressField = document.getElementById('address');
      if (!addressField.value.trim()) {
        addressField.value = `พิกัด: ${lat}, ${lng}`;
      }
      alert(`บันทึกตำแหน่งแล้ว\nพิกัด: ${lat}, ${lng}`);
      btn.textContent = '📍 ใช้ตำแหน่งปัจจุบัน';
      btn.disabled = false;
    },
    () => {
      alert('ไม่สามารถระบุตำแหน่งได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง');
      btn.textContent = '📍 ใช้ตำแหน่งปัจจุบัน';
      btn.disabled = false;
    }
  );
});

document.addEventListener('DOMContentLoaded', () => {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear() + 543;
  document.querySelectorAll('[data-section]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (el.dataset.section) showSection(el.dataset.section);
    });
  });
  const menu = document.getElementById('menuToggle');
  if (menu) menu.addEventListener('click', () => document.getElementById('mobileNav').classList.toggle('open'));
  setupForm();
  document.getElementById('cancelConfirm').addEventListener('click', hideConfirmModal);
  document.getElementById('confirmBooking').addEventListener('click', confirmAndSave);
  document.querySelector('.modal-backdrop').addEventListener('click', hideConfirmModal);
  document.getElementById('filterDate').addEventListener('change', (e) => renderQueue(e.target.value || null));
  document.getElementById('clearFilter').addEventListener('click', () => {
    document.getElementById('filterDate').value = '';
    renderQueue();
  });
  document.getElementById('refreshQueue').addEventListener('click', () => renderQueue(document.getElementById('filterDate').value || null));
  document.getElementById('goToQueue').addEventListener('click', () => showSection('queue'));
  const hash = window.location.hash.slice(1);
  showSection(['home', 'booking', 'queue', 'about'].includes(hash) ? hash : 'home');
});