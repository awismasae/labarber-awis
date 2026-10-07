/**
 * LA Barber – ระบบจองคิวตัดผมถึงบ้าน
 * เก็บข้อมูลใน localStorage
 */

const STORAGE_KEY = 'la_barber_bookings';

// ---------- Helpers ----------
function getBookings() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveBookings(bookings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

function formatDateThai(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const months = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------- Navigation ----------
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const section = document.getElementById(sectionId);
  if (section) section.classList.add('active');

  document.querySelectorAll(`.nav-link[data-section="${sectionId}"]`).forEach(l => {
    l.classList.add('active');
  });

  // Close mobile menu
  document.getElementById('mobileNav').classList.remove('open');

  // Load queue when switching to queue section
  if (sectionId === 'queue') {
    renderQueue();
  }

  // Hide success message when leaving booking
  if (sectionId !== 'booking') {
    document.getElementById('bookingSuccess').classList.add('hidden');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------- Booking Form ----------
let pendingBooking = null;

function setupForm() {
  const form = document.getElementById('bookingForm');
  const dateInput = document.getElementById('date');

  // Min date = tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  dateInput.min = tomorrow.toISOString().split('T')[0];

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const booking = {
      id: generateId(),
      customerName: document.getElementById('customerName').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      address: document.getElementById('address').value.trim(),
      date: document.getElementById('date').value,
      time: document.getElementById('time').value,
      service: document.getElementById('service').value,
      note: document.getElementById('note').value.trim(),
      createdAt: new Date().toISOString()
    };

    // Check duplicate slot
    const bookings = getBookings();
    const conflict = bookings.find(
      b => b.date === booking.date && b.time === booking.time
    );
    if (conflict) {
      alert(`ขออภัย ช่วงเวลา ${booking.time} น. ของวันที่ ${formatDateThai(booking.date)} มีคนจองแล้ว กรุณาเลือกเวลาอื่น`);
      return;
    }

    pendingBooking = booking;
    showConfirmModal(booking);
  });
}

function showConfirmModal(booking) {
  const details = document.getElementById('confirmDetails');
  details.innerHTML = `
    <p><strong>ชื่อ:</strong> ${escapeHtml(booking.customerName)}</p>
    <p><strong>โทร:</strong> ${escapeHtml(booking.phone)}</p>
    <p><strong>ที่อยู่:</strong> ${escapeHtml(booking.address)}</p>
    <p><strong>วันเวลา:</strong> ${formatDateThai(booking.date)} เวลา ${booking.time} น.</p>
    <p><strong>บริการ:</strong> ${escapeHtml(booking.service)}</p>
    ${booking.note ? `<p><strong>หมายเหตุ:</strong> ${escapeHtml(booking.note)}</p>` : ''}
  `;
  document.getElementById('confirmModal').classList.remove('hidden');
}

function hideConfirmModal() {
  document.getElementById('confirmModal').classList.add('hidden');
  pendingBooking = null;
}

function confirmAndSave() {
  if (!pendingBooking) return;

  const bookings = getBookings();
  bookings.push(pendingBooking);
  // Sort by date then time
  bookings.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });
  saveBookings(bookings);

  // Show success
  const msg = document.getElementById('successMessage');
  msg.textContent = `จองคิวสำเร็จสำหรับ ${formatDateThai(pendingBooking.date)} เวลา ${pendingBooking.time} น. ช่างซอลาจะติดต่อกลับเพื่อยืนยันอีกครั้ง`;
  document.getElementById('bookingSuccess').classList.remove('hidden');
  document.getElementById('bookingForm').reset();

  hideConfirmModal();
  window.scrollTo({ top: document.getElementById('bookingSuccess').offsetTop - 80, behavior: 'smooth' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ---------- Queue ----------
function renderQueue(filterDate = null) {
  const listEl = document.getElementById('queueList');
  const emptyEl = document.getElementById('queueEmpty');
  let bookings = getBookings();

  if (filterDate) {
    bookings = bookings.filter(b => b.date === filterDate);
  }

  if (bookings.length === 0) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');

  listEl.innerHTML = bookings.map(b => `
    <div class="queue-item" data-id="${b.id}">
      <div class="queue-time">
        <div class="date">${formatDateThai(b.date)}</div>
        <div class="time">${b.time} น.</div>
      </div>
      <div class="queue-info">
        <h4>${escapeHtml(b.customerName)}</h4>
        <p>📞 ${escapeHtml(b.phone)}</p>
        <p>📍 ${escapeHtml(b.address)}</p>
        ${b.note ? `<p>💬 ${escapeHtml(b.note)}</p>` : ''}
        <span class="service-tag">${escapeHtml(b.service)}</span>
      </div>
      <div class="queue-actions">
        <button type="button" class="btn btn-danger btn-cancel" data-id="${b.id}">ยกเลิกคิว</button>
      </div>
    </div>
  `).join('');

  // Cancel buttons
  listEl.querySelectorAll('.btn-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (confirm('ต้องการยกเลิกคิวนี้ใช่หรือไม่?')) {
        cancelBooking(id);
      }
    });
  });
}

function cancelBooking(id) {
  let bookings = getBookings();
  bookings = bookings.filter(b => b.id !== id);
  saveBookings(bookings);
  renderQueue(document.getElementById('filterDate').value || null);
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
  // Year
  document.getElementById('year').textContent = new Date().getFullYear() + 543;

  // Nav links
  document.querySelectorAll('[data-section]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const section = el.dataset.section;
      if (section) showSection(section);
    });
  });

  // Mobile menu
  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('mobileNav').classList.toggle('open');
  });

  // Form
  setupForm();

  // Modal
  document.getElementById('cancelConfirm').addEventListener('click', hideConfirmModal);
  document.getElementById('confirmBooking').addEventListener('click', confirmAndSave);
  document.querySelector('.modal-backdrop').addEventListener('click', hideConfirmModal);

  // Queue controls
  document.getElementById('filterDate').addEventListener('change', (e) => {
    renderQueue(e.target.value || null);
  });
  document.getElementById('clearFilter').addEventListener('click', () => {
    document.getElementById('filterDate').value = '';
    renderQueue();
  });
  document.getElementById('refreshQueue').addEventListener('click', () => {
    renderQueue(document.getElementById('filterDate').value || null);
  });
  document.getElementById('goToQueue').addEventListener('click', () => showSection('queue'));

  // Default section from hash
  const hash = window.location.hash.slice(1);
  if (['home', 'booking', 'queue', 'about'].includes(hash)) {
    showSection(hash);
  } else {
    showSection('home');
  }
});
