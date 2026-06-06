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

  initializeDirectUploadForm();
});

function initializeDirectUploadForm() {
  const form = document.querySelector('.upload-form[data-direct-upload="true"]');
  if (!form) {
    return;
  }

  const fileInput = form.querySelector('input[type="file"][name="images"]');
  const categorySelect = form.querySelector('select[name="category"]');
  const csrfInput = form.querySelector('input[name="csrfToken"]');
  const submitButton = form.querySelector('button[type="submit"]');
  const status = form.querySelector('[data-upload-status]');
  if (!fileInput || !categorySelect || !csrfInput || !submitButton) {
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const files = Array.from(fileInput.files || []);
    const category = categorySelect.value;
    const csrfToken = csrfInput.value;

    if (!files.length) {
      setStatus('Select at least one image to upload.', true);
      return;
    }

    if (!category) {
      setStatus('Choose a category before uploading.', true);
      return;
    }

    submitButton.disabled = true;
    fileInput.disabled = true;
    categorySelect.disabled = true;

    try {
      const { upload } = await import('/node_modules/@vercel/blob/dist/client.js');

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setStatus(`Uploading ${index + 1} of ${files.length}: ${file.name}`);

        const uploadedBlob = await upload(createUploadPathname(file, index), file, {
          access: 'public',
          handleUploadUrl: '/api/admin/portfolio/upload-token',
          headers: {
            'x-csrf-token': csrfToken
          },
          multipart: file.size > 4 * 1024 * 1024
        });

        const response = await fetch('/api/admin/portfolio/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken
          },
          body: JSON.stringify({
            category,
            originalname: file.name,
            blob: uploadedBlob
          })
        });

        const payload = await readJsonResponse(response);
        if (!response.ok) {
          throw new Error(payload.error || 'Unable to save uploaded image.');
        }
      }

      window.location.assign(`/admin?flash=${encodeURIComponent(
        files.length === 1 ? '1 image posted to the portfolio.' : `${files.length} images posted to the portfolio.`
      )}&flashType=success#portfolio`);
    } catch (error) {
      console.error('Direct upload failed:', error);
      setStatus(error.message || 'Unable to upload images.', true);
      submitButton.disabled = false;
      fileInput.disabled = false;
      categorySelect.disabled = false;
    }
  });

  function setStatus(message, isError = false) {
    if (!status) {
      return;
    }

    status.textContent = message;
    status.style.color = isError ? 'var(--admin-danger)' : 'var(--admin-muted)';
  }
}

function createUploadPathname(file, index) {
  const safeName = String(file?.name || 'upload')
    .split('/')
    .pop()
    .split('\\')
    .pop()
    .replace(/[^a-zA-Z0-9._-]+/g, '-');

  return `images/${Date.now()}-${index}-${safeName || 'upload'}`;
}

async function readJsonResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return {
    error: text ? text.trim() : 'Unexpected server response.'
  };
}
