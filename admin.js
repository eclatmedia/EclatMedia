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
  const form = document.querySelector('.upload-form');
  if (!form) {
    return;
  }

  if (form.dataset.directUpload !== 'true') {
    if (form.dataset.runtime === 'vercel') {
      const status = form.querySelector('[data-upload-status]');
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (status) {
          status.textContent =
            'Image uploads are disabled until BLOB_READ_WRITE_TOKEN is added in this Vercel project.';
          status.style.color = 'var(--admin-danger)';
        }
      });
    }
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
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const pathname = createUploadPathname(file, index);
        setStatus(`Uploading ${index + 1} of ${files.length}: ${file.name}`);

        const presignResponse = await fetch('/api/admin/portfolio/upload-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken
          },
          body: JSON.stringify({
            pathname,
            contentType: file.type
          })
        });
        const presignPayload = await readJsonResponse(presignResponse);
        if (!presignResponse.ok || !presignPayload.presignedUrl) {
          throw new Error(presignPayload.error || 'Unable to start upload.');
        }

        const uploadResponse = await fetch(presignPayload.presignedUrl, {
          method: 'PUT',
          headers: {
            'x-content-type': file.type || 'application/octet-stream',
            'x-vercel-blob-access': 'public'
          },
          body: file
        });

        if (!uploadResponse.ok) {
          throw new Error('Unable to upload image to storage.');
        }

        const uploadedBlobUrl =
          createPublicBlobUrl(uploadResponse.url) ||
          createPublicBlobUrl(presignPayload.imageUrl) ||
          createPublicBlobUrl(presignPayload.presignedUrl) ||
          createImageProxyUrl(presignPayload.pathname || pathname);
        const uploadedBlob = {
          url: uploadedBlobUrl,
          pathname: presignPayload.pathname || pathname
        };
        if (!uploadedBlob.url || !uploadedBlob.pathname) {
          throw new Error('Unable to retrieve uploaded image details.');
        }

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
  // Extract just the filename without path
  const filename = String(file?.name || 'upload')
    .split('/')
    .pop()
    .split('\\')
    .pop();
  
  // Sanitize the filename but preserve the original extension
  const safeName = filename.replace(/[^a-zA-Z0-9._-]+/g, '-');

  return `images/${Date.now()}-${index}-${safeName || 'upload'}`;
}

function createImageProxyUrl(pathname) {
  const filename = String(pathname || '').split('/').pop() || 'upload';
  return `/images/${encodeURIComponent(filename)}`;
}

function createPublicBlobUrl(value) {
  if (typeof value !== 'string' || !value) {
    return '';
  }

  try {
    const url = new URL(value);
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch (error) {
    return '';
  }
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
