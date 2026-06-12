document.addEventListener('DOMContentLoaded', () => {
  const flash = document.querySelector('[data-flash]');
  if (flash) {
    window.setTimeout(() => {
      flash.classList.add('is-hidden');
    }, 5000);
  }

  document.querySelectorAll('form[data-confirm]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      if (!window.confirm(form.dataset.confirm || 'Are you sure?')) {
        event.preventDefault();
      }
    });
  });
});
