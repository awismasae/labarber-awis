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