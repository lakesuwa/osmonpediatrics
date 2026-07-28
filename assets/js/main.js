document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
  }

  const filterPills = document.querySelectorAll('.pill[data-filter]');
  const blogCards = document.querySelectorAll('.blog-card[data-topic]');
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const filter = pill.dataset.filter;
      blogCards.forEach(card => {
        card.style.display = (filter === 'all' || card.dataset.topic === filter) ? '' : 'none';
      });
    });
  });

  const newsletterForm = document.querySelector('.newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', e => {
      e.preventDefault();
      newsletterForm.reset();
      alert('Thanks for subscribing! You will hear from us soon.');
    });
  }

  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', e => {
      e.preventDefault();
      contactForm.reset();
      alert('Thanks for reaching out! Our team will get back to you shortly.');
    });
  }
});
