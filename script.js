function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const sec = document.getElementById(id);
  if (sec) sec.classList.add('active');
  document.querySelectorAll('[data-section="' + id + '"]').forEach(l => l.classList.add('active'));
  const mobile = document.getElementById('mobileNav');
  if (mobile) mobile.classList.remove('open');
  window.scrollTo(0, 0);
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
  showSection('home');
});