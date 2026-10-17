document.addEventListener('DOMContentLoaded', () => {
  const flash = document.querySelector('[data-flash]');
  if (flash) {
    hideFlashAfterDelay(flash, 5000);
  }

  document.querySelectorAll('form[data-confirm]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      if (!window.confirm(form.dataset.confirm || 'Are you sure?')) {
        event.preventDefault();
      }
    });
  });
});

function hideFlashAfterDelay(element, delay) {
  window.setTimeout(() => {
    element.classList.add('is-hidden');
  }, delay);
}
