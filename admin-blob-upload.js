const BLOB_API_VERSION = '12';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.upload-form[data-direct-upload-enabled="true"]');
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  const fileInput = form.querySelector('input[name="images"]');
  const categoryInput = form.querySelector('select[name="category"]');
  const csrfInput = form.querySelector('input[name="csrfToken"]');
  const submitButton = form.querySelector('button[type="submit"]');
  const status = form.querySelector('[data-upload-status]');

  if (
    !(fileInput instanceof HTMLInputElement) ||
    !(categoryInput instanceof HTMLSelectElement) ||
    !(csrfInput instanceof HTMLInputElement) ||
    !(submitButton instanceof HTMLButtonElement) ||
    !(status instanceof HTMLElement)
  ) {
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const files = [...(fileInput.files || [])];
    if (!files.length) {
      updateStatus(status, 'Select at least one image to upload.');
      return;
    }

    if (!categoryInput.value) {
      updateStatus(status, 'Choose a valid portfolio category.');
      return;
    }

    setSubmittingState({
      categoryInput,
      fileInput,
      isSubmitting: true,
      submitButton
    });

    const uploadedEntries = [];

    try {
      for (const [index, file] of files.entries()) {
        updateStatus(status, `Uploading ${index + 1} of ${files.length}: ${file.name}`);
        const preparedUpload = await createPreparedUpload({
          csrfToken: csrfInput.value,
          file,
          form,
          index
        });
        const blob = await uploadFileToBlob({
          file,
          preparedUpload,
          progressMessage: (message) => updateStatus(status, message)
        });

        uploadedEntries.push({
          originalname: file.name,
          pathname: blob.pathname,
          url: blob.url
        });
      }

      updateStatus(status, 'Saving portfolio entries...');

      const response = await fetch(form.dataset.registerUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': csrfInput.value
        },
        body: JSON.stringify({
          category: categoryInput.value,
          uploads: uploadedEntries
        })
      });
      const payload = await readJson(response);
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to upload the selected images.');
      }

      const message =
        uploadedEntries.length === 1
          ? '1 image posted to the portfolio.'
          : `${uploadedEntries.length} images posted to the portfolio.`;
      window.location.assign(`/admin?${new URLSearchParams({ flash: message, flashType: 'success' })}#portfolio`);
    } catch (error) {
      await cleanupUploadedEntries({
        csrfToken: csrfInput.value,
        form,
        uploadedEntries
      });
      updateStatus(
        status,
        error instanceof Error && error.message ? error.message : 'Unable to upload the selected images.'
      );
    } finally {
      setSubmittingState({
        categoryInput,
        fileInput,
        isSubmitting: false,
        submitButton
      });
    }
  });
});

async function createPreparedUpload({ csrfToken, file, form, index }) {
  const pathname = createUploadPathname(file.name, index);
  const response = await fetch(form.dataset.uploadUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': csrfToken
    },
    body: JSON.stringify({
      type: 'blob.generate-client-token',
      payload: {
        pathname,
        clientPayload: JSON.stringify({
          originalname: file.name
        })
      }
    })
  });
  const payload = await readJson(response);
  if (!response.ok || !payload.uploadUrl || !payload.storeId) {
    throw new Error(payload.error || 'Unable to prepare upload.');
  }

  return payload;
}

async function uploadFileToBlob({ file, preparedUpload, progressMessage }) {
  const response = await fetch(preparedUpload.uploadUrl, {
    method: 'PUT',
    headers: {
      'x-api-version': BLOB_API_VERSION,
      'x-content-length': String(file.size),
      'x-vercel-blob-access': 'public',
      'x-vercel-blob-store-id': preparedUpload.storeId,
      ...(file.type ? { 'x-content-type': file.type } : {})
    },
    body: file
  });

  progressMessage(`Finishing upload: ${file.name}`);

  const payload = await readJson(response);
  if (!response.ok || !payload.url || !payload.pathname) {
    throw new Error(payload.error || `Unable to upload ${file.name}.`);
  }

  return payload;
}

function createUploadPathname(filename, index) {
  const safeName = sanitizeFilename(filename);
  const nonce = `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
  return `images/${nonce}-${safeName}`;
}

function sanitizeFilename(filename) {
  const value = typeof filename === 'string' ? filename : 'upload';
  return value.replace(/^.*[\\/]/, '').replace(/[^a-zA-Z0-9._-]+/g, '-') || 'upload';
}

function updateStatus(node, message) {
  node.textContent = message;
}

function setSubmittingState({ categoryInput, fileInput, isSubmitting, submitButton }) {
  fileInput.disabled = isSubmitting;
  categoryInput.disabled = isSubmitting;
  submitButton.disabled = isSubmitting;
  submitButton.textContent = isSubmitting ? 'Uploading…' : 'Post images';
}

async function cleanupUploadedEntries({ csrfToken, form, uploadedEntries }) {
  if (!uploadedEntries.length || !form.dataset.cleanupUrl) {
    return;
  }

  try {
    await fetch(form.dataset.cleanupUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': csrfToken
      },
      body: JSON.stringify({
        uploads: uploadedEntries
      })
    });
  } catch (error) {
    console.error('Failed to clean up partial uploads:', error);
  }
}

async function readJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
}
