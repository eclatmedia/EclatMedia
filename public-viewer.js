const VIEWER_FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

document.addEventListener('DOMContentLoaded', () => {
  initializePublicViewer();
});

function initializePublicViewer() {
  const viewer = ensurePublicViewer();
  const dialog = viewer.querySelector('[data-viewer-dialog]');
  const image = viewer.querySelector('[data-viewer-image]');
  const category = viewer.querySelector('[data-viewer-category]');
  const title = viewer.querySelector('[data-viewer-title]');
  const copy = viewer.querySelector('[data-viewer-copy]');
  const closeButton = viewer.querySelector('[data-viewer-close]');
  const backdrop = viewer.querySelector('[data-viewer-backdrop]');

  let lastTrigger = null;

  document.addEventListener('click', (event) => {
    const trigger =
      event.target instanceof Element ? event.target.closest('[data-viewer-trigger]') : null;
    if (!trigger) {
      return;
    }

    event.preventDefault();
    lastTrigger = trigger;
    openViewer({
      src: trigger.dataset.viewerSrc,
      fallbackSrc: trigger.dataset.viewerFallbackSrc || '',
      title: trigger.dataset.viewerTitle || 'Selected image',
      category: trigger.dataset.viewerCategory || 'Portfolio',
      image,
      categoryNode: category,
      titleNode: title,
      copyNode: copy,
      viewer,
      closeButton
    });
  });

  closeButton.addEventListener('click', () => closeViewer(viewer, lastTrigger));
  backdrop.addEventListener('click', () => closeViewer(viewer, lastTrigger));

  viewer.addEventListener('click', (event) => {
    if (event.target === viewer) {
      closeViewer(viewer, lastTrigger);
    }
  });

  document.addEventListener('keydown', (event) => {
    const trigger =
      event.target instanceof Element ? event.target.closest('[data-viewer-trigger]') : null;
    if (
      viewer.hidden &&
      trigger &&
      (event.key === 'Enter' || event.key === ' ')
    ) {
      event.preventDefault();
      lastTrigger = trigger;
      openViewer({
        src: trigger.dataset.viewerSrc,
        fallbackSrc: trigger.dataset.viewerFallbackSrc || '',
        title: trigger.dataset.viewerTitle || 'Selected image',
        category: trigger.dataset.viewerCategory || 'Portfolio',
        image,
        categoryNode: category,
        titleNode: title,
        copyNode: copy,
        viewer,
        closeButton
      });
      return;
    }

    if (viewer.hidden) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeViewer(viewer, lastTrigger);
      return;
    }

    if (event.key === 'Tab') {
      trapViewerFocus(event, dialog);
    }
  });
}

function openViewer({
  src,
  fallbackSrc,
  title,
  category,
  image,
  categoryNode,
  titleNode,
  copyNode,
  viewer,
  closeButton
}) {
  if (!src) {
    return;
  }

  image.onerror = null;
  if (fallbackSrc && fallbackSrc !== src) {
    image.onerror = () => {
      if (image.src !== fallbackSrc) {
        image.onerror = null;
        image.src = fallbackSrc;
      }
    };
  }
  image.src = src;
  image.alt = `${title} — enlarged view`;
  categoryNode.textContent = category;
  titleNode.textContent = title;
  copyNode.textContent = 'A full-screen preview so clients can inspect the photograph with more clarity and presence.';

  viewer.hidden = false;
  document.body.classList.add('viewer-open');
  closeButton.focus();
}

function closeViewer(viewer, lastTrigger) {
  viewer.hidden = true;
  document.body.classList.remove('viewer-open');

  const image = viewer.querySelector('[data-viewer-image]');
  if (image) {
    image.onerror = null;
    image.removeAttribute('src');
  }

  if (lastTrigger) {
    lastTrigger.focus();
  }
}

function trapViewerFocus(event, dialog) {
  const focusableElements = [...dialog.querySelectorAll(VIEWER_FOCUSABLE)].filter(
    (node) => !node.hasAttribute('disabled')
  );

  if (!focusableElements.length) {
    event.preventDefault();
    return;
  }

  const first = focusableElements[0];
  const last = focusableElements[focusableElements.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function ensurePublicViewer() {
  const existing = document.getElementById('public-viewer');
  if (existing) {
    return existing;
  }

  const viewer = document.createElement('div');
  viewer.id = 'public-viewer';
  viewer.className = 'public-viewer';
  viewer.hidden = true;
  viewer.innerHTML = `
    <div class="public-viewer-backdrop" data-viewer-backdrop></div>
    <div class="public-viewer-dialog" role="dialog" aria-modal="true" aria-labelledby="public-viewer-title" data-viewer-dialog>
      <figure class="public-viewer-figure">
        <img class="public-viewer-image" data-viewer-image alt="">
      </figure>
      <div class="public-viewer-sidebar">
        <div>
          <p class="public-viewer-kicker" data-viewer-category></p>
          <h2 class="public-viewer-title" id="public-viewer-title" data-viewer-title></h2>
          <p class="public-viewer-copy" data-viewer-copy></p>
        </div>
        <button class="public-viewer-close" type="button" data-viewer-close>Close view</button>
      </div>
    </div>
  `;

  document.body.append(viewer);
  return viewer;
}
