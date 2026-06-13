const crypto = require('crypto');
const { issueSignedToken, parseStoreIdFromDelegationToken, presignUrl } = require('@vercel/blob');
const express = require('express');
const path = require('path');
const { Readable } = require('stream');
const multer = require('multer');
const serveStatic = require('serve-static');
const {
  authMiddleware,
  clearAdminSession,
  getAuthConfigurationError,
  isValidCsrfRequest,
  startAdminSession
} = require('./auth');
const {
  IMAGES_DIR,
  STORAGE_WRITE_CONFIGURATION_ERROR,
  loadEnquiries: loadStoredEnquiries,
  loadMetadata: loadStoredMetadata,
  loadSiteContent: loadStoredSiteContent,
  localImageExists,
  readStoredImage,
  resolveStoredImageUrl,
  removeStoredImage,
  sanitizeFilename,
  saveEnquiries: saveStoredEnquiries,
  saveMetadata: saveStoredMetadata,
  saveSiteContent: saveStoredSiteContent,
  storeUploadedImage
} = require('./storage');

const app = express();
const PORT = process.env.PORT || 3000;

const ROOT_DIR = __dirname;

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password';
const IS_VERCEL = process.env.VERCEL === '1';
const IS_PRODUCTION_RUNTIME = process.env.NODE_ENV === 'production' || IS_VERCEL;
const DIRECT_UPLOADS_ENABLED = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const DIRECT_CLIENT_UPLOADS_ENABLED = IS_VERCEL && DIRECT_UPLOADS_ENABLED;
const AUTH_CONFIGURATION_ERROR = getAuthConfigurationError();
const ADMIN_CONFIGURATION_ERROR =
  IS_PRODUCTION_RUNTIME && ADMIN_USER === 'admin' && ADMIN_PASSWORD === 'password'
    ? 'ADMIN_USER and ADMIN_PASSWORD must be set in production.'
    : '';
const ADMIN_RUNTIME_CONFIGURATION_ERROR = [AUTH_CONFIGURATION_ERROR, ADMIN_CONFIGURATION_ERROR]
  .filter(Boolean)
  .join(' ');
const PORTFOLIO_WRITE_CONFIGURATION_ERROR = STORAGE_WRITE_CONFIGURATION_ERROR;
const PORTFOLIO_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const categories = ['Wedding', 'Portrait', 'Event', 'Brand', 'Other'];
const enquiryStatuses = ['new', 'responded', 'archived'];

const defaultSiteContent = {
  settings: {
    heroTag: '— Visual Storytelling Studio',
    heroTitlePrefix: 'Crafting',
    heroTitleEmphasis: 'Luminous',
    heroTitleSuffix: 'Narratives',
    heroSubtitle:
      'Where light becomes language. We create images that transcend documentation — photographs that breathe, emote, and endure.',
    aboutQuote:
      '"Photography is not about the camera. It is about the photographer — their patience, their eye, their willingness to wait for the world to become itself."',
    aboutYears: '12+',
    metricClients: '340+',
    metricAwards: '28',
    metricCountries: '14',
    aboutParagraphs: [
      'Éclat Media was founded on a simple belief: that every subject — human or otherwise — has an inner light.',
      'We shape calm, editorial imagery with a documentary instinct, creating photographs that feel luxurious without losing honesty.',
      'From intimate portraits to large celebrations and commercial campaigns, every project is guided by detail, atmosphere, and story.'
    ],
    instagramUrl: 'https://instagram.com',
    pinterestUrl: 'https://pinterest.com',
    linkedinUrl: 'https://linkedin.com',
    contactEmail: 'hello@eclatmedia.co',
    bookingTitlePrefix: "Let's create something",
    bookingTitleEmphasis: 'extraordinary',
    bookingTitleSuffix: 'together.',
    bookingSubtitle: "Tell us about your project. We'll be in touch within 24 hours.",
    footerTagline:
      'Visual storytelling for those who\nbelieve images should endure.\n\nLondon, UK — Available Worldwide'
  },
  services: [
    {
      id: 'service-wedding',
      name: 'Wedding Photography',
      description:
        'Elegant coverage for intimate ceremonies and destination celebrations, crafted with a cinematic eye.',
      order: 1
    },
    {
      id: 'service-portrait',
      name: 'Portrait Sessions',
      description:
        'Modern portraiture for individuals, couples, and families with gentle direction and timeless styling.',
      order: 2
    },
    {
      id: 'service-brand',
      name: 'Brand Storytelling',
      description:
        'Refined visual assets for founders, products, and campaigns that need atmosphere as much as clarity.',
      order: 3
    },
    {
      id: 'service-fine-art-exhibition',
      name: 'Fine Art & Exhibition',
      description:
        'Thoughtful imagery for artists, galleries, and curated exhibitions that deserves a refined, immersive presentation.',
      order: 4
    },
    {
      id: 'service-lifestyle-family',
      name: 'Lifestyle & Family',
      description:
        'Warm, natural sessions that preserve connection, personality, and everyday beauty with polished direction.',
      order: 5
    },
    {
      id: 'service-video-motion',
      name: 'Video & Motion',
      description:
        'Cinematic motion coverage for campaigns, events, and stories that need atmosphere, movement, and strong visual rhythm.',
      order: 6
    }

  ],
  process: [
    {
      id: 'process-discovery',
      name: 'Discovery',
      description:
        'We start with a conversation about your vision, references, schedule, and the feeling you want the work to carry.',
      order: 1
    },
    {
      id: 'process-planning',
      name: 'Planning',
      description:
        'Locations, styling notes, timelines, and shot priorities are shaped into a clear production plan.',
      order: 2
    },
    {
      id: 'process-capture',
      name: 'Capture',
      description:
        'On the day, we direct lightly and observe carefully so the final images feel polished and alive.',
      order: 3
    },
    {
      id: 'process-delivery',
      name: 'Delivery',
      description:
        'Your gallery is edited with consistency and care, then delivered in a format ready for print and digital use.',
      order: 4
    }
  ],
  testimonials: [
    {
      id: 'testimonial-amelia',
      text: 'The photos felt editorial and deeply personal at the same time. Every frame looked like a memory already preserved.',
      author: 'Amelia Hart',
      role: 'Bride',
      order: 1
    },
    {
      id: 'testimonial-marcus',
      text: 'Éclat gave our launch campaign warmth and sophistication. The images elevated the brand instantly.',
      author: 'Marcus Lee',
      role: 'Creative Director',
      order: 2
    },
    {
      id: 'testimonial-sofia',
      text: 'The entire process was calm, intentional, and beautifully organised. We felt looked after from start to finish.',
      author: 'Sofia Bennett',
      role: 'Portrait Client',
      order: 3
    }
  ],
  team: [
    {
      id: 'team-arielle',
      name: 'Arielle Bennett',
      role: 'Creative Director',
      bio:
        'Arielle shapes the visual direction of every commission, translating brand vision and personal stories into imagery with polish, warmth, and intention.',
      imageUrl: '',
      order: 1
    },
    {
      id: 'team-julian',
      name: 'Julian Hart',
      role: 'Lead Photographer',
      bio:
        'Julian leads production on set and on location, balancing calm direction with documentary instincts to create refined photographs that still feel alive.',
      imageUrl: '',
      order: 2
    },
    {
      id: 'team-naomi',
      name: 'Naomi Clarke',
      role: 'Client Experience Producer',
      bio:
        'Naomi keeps each project seamless from planning through delivery, ensuring every timeline, detail, and client touchpoint feels considered and effortless.',
      imageUrl: '',
      order: 3
    }
  ]
};

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(authMiddleware);

app.use(
  serveStatic(ROOT_DIR, {
    index: false
  })
);
app.use('/images', express.static(IMAGES_DIR));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: PORTFOLIO_IMAGE_MAX_BYTES,
    files: 12
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      cb(new Error('Only image uploads are allowed.'));
      return;
    }

    cb(null, true);
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

app.get('/api/site-content', async (req, res) => {
  const siteContent = await loadSiteContent();
  const portfolio = (await loadMetadata()).map((image, index) => ({
    id: image.id,
    imageUrl: resolveImageUrl(image),
    fallbackImageUrl: resolveFallbackImageUrl(image),
    title: image.title || createPortfolioTitle(image.originalname),
    category: image.category,
    order: index + 1
  }));

  res.json({
    ...siteContent,
    portfolio
  });
});

app.post('/api/enquiries', async (req, res) => {
  const payload = normalizeEnquiryInput(req.body);
  const validationError = validateEnquiry(payload);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const enquiries = await loadEnquiries();
  enquiries.push({
    id: createId('enquiry'),
    ...payload,
    status: 'new',
    createdAt: new Date().toISOString()
  });
  await saveEnquiries(enquiries);

  res.status(201).json({ success: true });
});

app.post('/api/admin/portfolio/upload-url', ensureAdminConfigured, async (req, res) => {
  if (!DIRECT_UPLOADS_ENABLED) {
    return res.status(503).json({
      error: PORTFOLIO_WRITE_CONFIGURATION_ERROR || 'Direct uploads are not configured for this deployment.'
    });
  }

  if (!req.body || typeof req.body !== 'object' || typeof req.body.type !== 'string') {
    return res.status(400).json({ error: 'Invalid upload request.' });
  }

  if (req.body.type === 'blob.generate-client-token') {
    if (!(req.auth && req.auth.isAdmin)) {
      return res.status(401).json({ error: 'Sign in to upload images.' });
    }

    if (!isValidCsrfRequest(req)) {
      return res.status(403).json({ error: 'Invalid request token.' });
    }
  }

  try {
    const pathname = req.body.payload?.pathname;
    const clientPayload = req.body.payload?.clientPayload;
    validateDirectUploadRequest(pathname, clientPayload);

    const signedToken = await issueSignedToken({
      pathname,
      operations: ['put'],
      allowedContentTypes: ['image/*'],
      maximumSizeInBytes: PORTFOLIO_IMAGE_MAX_BYTES
    });
    const { presignedUrl } = await presignUrl(signedToken, {
      access: 'public',
      operation: 'put',
      pathname
    });

    res.status(200).json({
      uploadUrl: presignedUrl,
      storeId: parseStoreIdFromDelegationToken(signedToken.delegationToken),
      pathname
    });
  } catch (error) {
    res.status(400).json({
      error: error && typeof error.message === 'string' ? error.message : 'Unable to prepare upload.'
    });
  }
});

app.post('/api/admin/portfolio/register', requireAdmin, verifyCsrf, async (req, res) => {
  if (!DIRECT_UPLOADS_ENABLED) {
    return res.status(503).json({
      error: PORTFOLIO_WRITE_CONFIGURATION_ERROR || 'Direct uploads are not configured for this deployment.'
    });
  }

  const category = normalizeCategory(req.body.category);
  if (!category) {
    return res.status(400).json({ error: 'Choose a valid portfolio category.' });
  }

  const uploadEntries = normalizeDirectUploadEntries(req.body.uploads);
  if (!uploadEntries.length) {
    return res.status(400).json({ error: 'Select at least one image to upload.' });
  }

  const images = await loadMetadata();
  const startingOrder = images.length;

  try {
    uploadEntries.forEach((file, index) => {
      images.push({
        id: createId('asset'),
        filename: file.filename,
        imageUrl: file.imageUrl,
        storagePath: file.storagePath,
        originalname: file.originalname,
        title: createPortfolioTitle(file.originalname),
        category,
        order: startingOrder + index + 1,
        createdAt: new Date().toISOString()
      });
    });
    await saveMetadata(images);
  } catch (error) {
    await cleanupDirectUploadEntries(uploadEntries);
    return res.status(500).json({
      error: getStorageErrorMessage(error, 'Unable to upload the selected images.')
    });
  }

  res.status(201).json({
    success: true,
    uploadedCount: uploadEntries.length
  });
});

app.post('/api/admin/portfolio/cleanup', requireAdmin, verifyCsrf, async (req, res) => {
  if (!DIRECT_UPLOADS_ENABLED) {
    return res.status(503).json({
      error: PORTFOLIO_WRITE_CONFIGURATION_ERROR || 'Direct uploads are not configured for this deployment.'
    });
  }

  const uploadEntries = normalizeDirectUploadEntries(req.body.uploads);
  if (!uploadEntries.length) {
    return res.status(200).json({ success: true });
  }

  try {
    await cleanupDirectUploadEntries(uploadEntries);
  } catch (error) {
    return res.status(500).json({
      error: getStorageErrorMessage(error, 'Unable to clean up uploaded images.')
    });
  }

  res.status(200).json({ success: true });
});

app.get('/images/:filename', async (req, res, next) => {
  try {
    const filename = path.basename(typeof req.params.filename === 'string' ? req.params.filename : '');
    if (!filename) {
      return res.status(404).end();
    }

    const image = (await loadMetadata()).find((entry) => entry.filename === filename);
    if (!image) {
      return res.status(404).end();
    }

    const storedImage = await readStoredImage(image);
    if (!storedImage) {
      return res.status(404).end();
    }

    if (storedImage.kind === 'local') {
      return res.sendFile(storedImage.filePath);
    }

    if (storedImage.stream) {
      res.setHeader('Content-Type', storedImage.contentType);
      res.setHeader('Cache-Control', storedImage.cacheControl);
      Readable.fromWeb(storedImage.stream).pipe(res);
      return;
    }

    if (storedImage.url) {
      res.setHeader('Cache-Control', storedImage.cacheControl);
      return res.redirect(storedImage.url);
    }

    return res.status(404).end();
  } catch (error) {
    next(error);
  }
});

app.get('/gallery', async (req, res) => {
  res.send(renderGalleryPage(await loadMetadata(), normalizeCategory(req.query.category)));
});

app.get('/admin/login', (req, res) => {
  if (ADMIN_RUNTIME_CONFIGURATION_ERROR) {
    return res.status(503).send(
      renderAdminLoginPage({
        csrfToken: '',
        error: false,
        configurationError: ADMIN_RUNTIME_CONFIGURATION_ERROR
      })
    );
  }

  if (req.auth.isAdmin) {
    return res.redirect('/admin');
  }

  res.send(
    renderAdminLoginPage({
      csrfToken: req.csrfToken,
      error: req.query.error === '1',
      configurationError: ''
    })
  );
});

app.post('/admin/login', ensureAdminConfigured, verifyCsrf, (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (timingSafeCredentialMatch(username, ADMIN_USER) && timingSafeCredentialMatch(password, ADMIN_PASSWORD)) {
    startAdminSession(res);
    return res.redirect('/admin');
  }

  res.redirect('/admin/login?error=1');
});

app.get('/admin/logout', (req, res) => {
  clearAdminSession(res);
  res.redirect('/admin/login');
});

app.get('/admin', requireAdmin, async (req, res) => {
  const [siteContent, images, enquiries] = await Promise.all([
    loadSiteContent(),
    loadMetadata(),
    loadEnquiries()
  ]);

  res.send(
    renderAdminDashboardPage({
      siteContent,
      images,
      enquiries,
      csrfToken: req.csrfToken,
      flash: normalizeFlash(req.query.flash, req.query.flashType)
    })
  );
});

app.post('/admin/content/settings', requireAdmin, verifyCsrf, async (req, res) => {
  const nextSettings = normalizeSettings({
    heroTag: req.body.heroTag,
    heroTitlePrefix: req.body.heroTitlePrefix,
    heroTitleEmphasis: req.body.heroTitleEmphasis,
    heroTitleSuffix: req.body.heroTitleSuffix,
    heroSubtitle: req.body.heroSubtitle,
    aboutQuote: req.body.aboutQuote,
    aboutYears: req.body.aboutYears,
    metricClients: req.body.metricClients,
    metricAwards: req.body.metricAwards,
    metricCountries: req.body.metricCountries,
    aboutParagraphs: ensureArray(req.body.aboutParagraphs),
    instagramUrl: req.body.instagramUrl,
    pinterestUrl: req.body.pinterestUrl,
    linkedinUrl: req.body.linkedinUrl,
    contactEmail: req.body.contactEmail,
    bookingTitlePrefix: req.body.bookingTitlePrefix,
    bookingTitleEmphasis: req.body.bookingTitleEmphasis,
    bookingTitleSuffix: req.body.bookingTitleSuffix,
    bookingSubtitle: req.body.bookingSubtitle,
    footerTagline: req.body.footerTagline
  });

  const validationError = validateSettings(nextSettings);
  if (validationError) {
    return redirectToAdmin(res, validationError, 'error', 'settings');
  }

  const siteContent = await loadSiteContent();
  siteContent.settings = nextSettings;
  await saveSiteContent(siteContent);

  redirectToAdmin(res, 'Site settings published.', 'success', 'settings');
});

app.post('/admin/content/services', requireAdmin, verifyCsrf, async (req, res) => {
  const services = parseNamedItems(req.body, 'service');
  if (!services.length) {
    return redirectToAdmin(res, 'Add at least one service before publishing.', 'error', 'services');
  }

  const siteContent = await loadSiteContent();
  siteContent.services = services;
  await saveSiteContent(siteContent);

  redirectToAdmin(res, 'Services updated.', 'success', 'services');
});

app.post('/admin/content/process', requireAdmin, verifyCsrf, async (req, res) => {
  const steps = parseNamedItems(req.body, 'process');
  if (!steps.length) {
    return redirectToAdmin(res, 'Add at least one process step before publishing.', 'error', 'process');
  }

  const siteContent = await loadSiteContent();
  siteContent.process = steps;
  await saveSiteContent(siteContent);

  redirectToAdmin(res, 'Process steps updated.', 'success', 'process');
});

app.post('/admin/content/testimonials', requireAdmin, verifyCsrf, async (req, res) => {
  const testimonials = parseTestimonials(req.body);
  if (!testimonials.length) {
    return redirectToAdmin(
      res,
      'Add at least one testimonial before publishing.',
      'error',
      'testimonials'
    );
  }

  const siteContent = await loadSiteContent();
  siteContent.testimonials = testimonials;
  await saveSiteContent(siteContent);

  redirectToAdmin(res, 'Testimonials updated.', 'success', 'testimonials');
});

app.post('/admin/content/team', requireAdmin, verifyCsrf, async (req, res) => {
  const team = parseTeamMembers(req.body);
  if (!team.length) {
    return redirectToAdmin(res, 'Add at least one team profile before publishing.', 'error', 'team');
  }

  const siteContent = await loadSiteContent();
  siteContent.team = team;
  await saveSiteContent(siteContent);

  redirectToAdmin(res, 'Team profiles updated.', 'success', 'team');
});

app.post(
  '/admin/portfolio/upload',
  requireAdmin,
  verifyCsrf,
  upload.array('images', 12),
  async (req, res) => {
    const uploadedFiles = Array.isArray(req.files) ? req.files : [];
    if (!uploadedFiles.length) {
      return redirectToAdmin(res, 'Select at least one image to upload.', 'error', 'portfolio');
    }

    const category = normalizeCategory(req.body.category);
    if (!category) {
      return redirectToAdmin(res, 'Choose a valid portfolio category.', 'error', 'portfolio');
    }

    const images = await loadMetadata();
    const startingOrder = images.length;
    const storedFiles = [];

    try {
      for (const file of uploadedFiles) {
        storedFiles.push(await storeUploadedImage(file));
      }

      storedFiles.forEach((file, index) => {
        const originalname = uploadedFiles[index].originalname;
        images.push({
          id: createId('asset'),
          filename: file.filename,
          imageUrl: file.imageUrl,
          storagePath: file.storagePath,
          originalname,
          title: createPortfolioTitle(originalname),
          category,
          order: startingOrder + index + 1,
          createdAt: new Date().toISOString()
        });
      });
      await saveMetadata(images);
    } catch (error) {
      for (const file of storedFiles) {
        await removeStoredImage(file);
      }

      return redirectToAdmin(
        res,
        getStorageErrorMessage(error, 'Unable to upload the selected images.'),
        'error',
        'portfolio'
      );
    }

    const uploadLabel =
      uploadedFiles.length === 1
        ? '1 image posted to the portfolio.'
        : `${uploadedFiles.length} images posted to the portfolio.`;
    redirectToAdmin(res, uploadLabel, 'success', 'portfolio');
  }
);

app.post('/admin/portfolio/update', requireAdmin, verifyCsrf, async (req, res) => {
  const id = sanitizeIdentifier(req.body.id);
  const category = normalizeCategory(req.body.category);
  const images = await loadMetadata();
  const image = images.find((entry) => entry.id === id);

  if (!image) {
    return redirectToAdmin(res, 'That portfolio item no longer exists.', 'error', 'portfolio');
  }

  if (!category) {
    return redirectToAdmin(res, 'Choose a valid portfolio category.', 'error', 'portfolio');
  }

  image.title = sanitizeShortText(req.body.title) || createPortfolioTitle(image.originalname);
  image.category = category;
  image.order = coerceOrder(req.body.order, image.order);

  try {
    await saveMetadata(images);
  } catch (error) {
    return redirectToAdmin(res, getStorageErrorMessage(error, 'Unable to update this portfolio item.'), 'error', 'portfolio');
  }
  redirectToAdmin(res, 'Portfolio item updated.', 'success', 'portfolio');
});

app.post('/admin/portfolio/delete', requireAdmin, verifyCsrf, async (req, res) => {
  const id = sanitizeIdentifier(req.body.id);
  const images = await loadMetadata();
  const image = images.find((entry) => entry.id === id);

  if (!image) {
    return redirectToAdmin(res, 'That portfolio item no longer exists.', 'error', 'portfolio');
  }

  const remainingImages = images.filter((entry) => entry.id !== id);

  try {
    await saveMetadata(remainingImages);
  } catch (error) {
    return redirectToAdmin(res, getStorageErrorMessage(error, 'Unable to update the portfolio library.'), 'error', 'portfolio');
  }

  try {
    await removeStoredImage(image);
  } catch (error) {
    console.error('Failed to remove portfolio image from storage:', error);

    let metadataRestored = false;
    try {
      await saveMetadata(images);
      metadataRestored = true;
    } catch (restoreError) {
      console.error('Failed to restore portfolio metadata after delete error:', restoreError);
    }

    const detail = getStorageErrorMessage(error, '');
    const message = metadataRestored
      ? `Unable to delete the stored image.${detail ? ` ${detail}` : ''}`
      : 'Unable to delete the stored image, and the portfolio library could not be restored automatically.';

    return redirectToAdmin(res, message, 'error', 'portfolio');
  }

  redirectToAdmin(res, 'Portfolio item removed.', 'success', 'portfolio');
});

app.post('/admin/enquiries/status', requireAdmin, verifyCsrf, async (req, res) => {
  const id = sanitizeIdentifier(req.body.id);
  const status = normalizeEnquiryStatus(req.body.status);
  const enquiries = await loadEnquiries();
  const enquiry = enquiries.find((entry) => entry.id === id);

  if (!enquiry) {
    return redirectToAdmin(res, 'That enquiry no longer exists.', 'error', 'enquiries');
  }

  if (!status) {
    return redirectToAdmin(res, 'Choose a valid enquiry status.', 'error', 'enquiries');
  }

  enquiry.status = status;
  await saveEnquiries(enquiries);

  redirectToAdmin(res, 'Enquiry status updated.', 'success', 'enquiries');
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === 'LIMIT_FILE_COUNT'
        ? 'You can upload up to 12 images at once.'
        : error.message;
    redirectToAdmin(res, message, 'error', 'portfolio');
    return;
  }

  if (error && error.message === 'Only image uploads are allowed.') {
    redirectToAdmin(res, error.message, 'error', 'portfolio');
    return;
  }

  next(error);
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Éclat Media running at http://localhost:${PORT}`);
  });
}

module.exports = app;

function requireAdmin(req, res, next) {
  if (ADMIN_RUNTIME_CONFIGURATION_ERROR) {
    return res.status(503).send(
      renderAdminLoginPage({
        csrfToken: '',
        error: false,
        configurationError: ADMIN_RUNTIME_CONFIGURATION_ERROR
      })
    );
  }

  if (req.auth && req.auth.isAdmin) {
    return next();
  }

  res.redirect('/admin/login');
}

function ensureAdminConfigured(req, res, next) {
  if (!ADMIN_RUNTIME_CONFIGURATION_ERROR) {
    return next();
  }

  if (req.path.startsWith('/api/')) {
    return res.status(503).json({ error: ADMIN_RUNTIME_CONFIGURATION_ERROR });
  }

  return res.status(503).send(
    renderAdminLoginPage({
      csrfToken: '',
      error: false,
      configurationError: ADMIN_RUNTIME_CONFIGURATION_ERROR
    })
  );
}

function timingSafeCredentialMatch(actual, expected) {
  if (typeof actual !== 'string' || typeof expected !== 'string') {
    return false;
  }

  const actualDigest = crypto.createHash('sha256').update(`credential:${actual}`).digest();
  const expectedDigest = crypto.createHash('sha256').update(`credential:${expected}`).digest();
  return crypto.timingSafeEqual(actualDigest, expectedDigest);
}

function verifyCsrf(req, res, next) {
  if (isValidCsrfRequest(req)) {
    return next();
  }

  res.status(403).send('Invalid request token.');
}

async function loadSiteContent() {
  const raw = await loadStoredSiteContent(defaultSiteContent);
  return normalizeSiteContent(raw);
}

async function saveSiteContent(content) {
  await saveStoredSiteContent(normalizeSiteContent(content));
}

async function loadMetadata() {
  const items = (await loadStoredMetadata([]))
    .map((item, index) => normalizeMetadataItem(item, index))
    .filter(
      (item) =>
        resolveImageUrl(item) &&
        (item.storagePath || item.imageUrl || (item.filename && localImageExists(item.filename)))
    );
  const resolvedItems = await Promise.all(
    items.map(async (item) => ({
      ...item,
      imageUrl: (await resolveStoredImageUrl(item)) || item.imageUrl
    }))
  );
  return sortByOrder(resolvedItems);
}

async function saveMetadata(images) {
  await saveStoredMetadata(
    sortByOrder(images.map((image, index) => normalizeMetadataItem(image, index)))
  );
}

async function loadEnquiries() {
  const enquiries = (await loadStoredEnquiries([])).map((entry) => normalizeEnquiryRecord(entry));
  return enquiries.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

async function saveEnquiries(enquiries) {
  await saveStoredEnquiries(enquiries.map((entry) => normalizeEnquiryRecord(entry)));
}

function normalizeSiteContent(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};

  return {
    settings: normalizeSettings(source.settings || {}),
    services: normalizeNamedCollection(source.services, 'service'),
    process: normalizeNamedCollection(source.process, 'process'),
    testimonials: normalizeTestimonialsCollection(source.testimonials),
    team: normalizeTeamCollection(source.team)
  };
}

function normalizeSettings(rawSettings) {
  const settings = rawSettings && typeof rawSettings === 'object' ? rawSettings : {};

  return {
    heroTag: sanitizeShortText(settings.heroTag) || defaultSiteContent.settings.heroTag,
    heroTitlePrefix:
      sanitizeShortText(settings.heroTitlePrefix) || defaultSiteContent.settings.heroTitlePrefix,
    heroTitleEmphasis:
      sanitizeShortText(settings.heroTitleEmphasis) || defaultSiteContent.settings.heroTitleEmphasis,
    heroTitleSuffix:
      sanitizeShortText(settings.heroTitleSuffix) || defaultSiteContent.settings.heroTitleSuffix,
    heroSubtitle:
      sanitizeLongText(settings.heroSubtitle) || defaultSiteContent.settings.heroSubtitle,
    aboutQuote: sanitizeLongText(settings.aboutQuote) || defaultSiteContent.settings.aboutQuote,
    aboutYears: sanitizeShortText(settings.aboutYears) || defaultSiteContent.settings.aboutYears,
    metricClients:
      sanitizeShortText(settings.metricClients) || defaultSiteContent.settings.metricClients,
    metricAwards:
      sanitizeShortText(settings.metricAwards) || defaultSiteContent.settings.metricAwards,
    metricCountries:
      sanitizeShortText(settings.metricCountries) || defaultSiteContent.settings.metricCountries,
    aboutParagraphs: normalizeParagraphs(settings.aboutParagraphs),
    instagramUrl:
      normalizeUrlInput(settings.instagramUrl) || defaultSiteContent.settings.instagramUrl,
    pinterestUrl:
      normalizeUrlInput(settings.pinterestUrl) || defaultSiteContent.settings.pinterestUrl,
    linkedinUrl:
      normalizeUrlInput(settings.linkedinUrl) || defaultSiteContent.settings.linkedinUrl,
    contactEmail:
      normalizeEmail(settings.contactEmail) || defaultSiteContent.settings.contactEmail,
    bookingTitlePrefix:
      sanitizeShortText(settings.bookingTitlePrefix) ||
      defaultSiteContent.settings.bookingTitlePrefix,
    bookingTitleEmphasis:
      sanitizeShortText(settings.bookingTitleEmphasis) ||
      defaultSiteContent.settings.bookingTitleEmphasis,
    bookingTitleSuffix:
      sanitizeShortText(settings.bookingTitleSuffix) ||
      defaultSiteContent.settings.bookingTitleSuffix,
    bookingSubtitle:
      sanitizeLongText(settings.bookingSubtitle) || defaultSiteContent.settings.bookingSubtitle,
    footerTagline:
      sanitizeMultilineText(settings.footerTagline) || defaultSiteContent.settings.footerTagline
  };
}

function normalizeNamedCollection(items, prefix) {
  const rawItems = Array.isArray(items) ? items : defaultSiteContent[prefix === 'service' ? 'services' : 'process'];

  return sortByOrder(
    rawItems
      .map((item, index) => ({
        id: sanitizeIdentifier(item.id) || createId(prefix),
        name: sanitizeShortText(item.name),
        description: sanitizeLongText(item.description),
        order: coerceOrder(item.order, index + 1)
      }))
      .filter((item) => item.name && item.description)
  );
}

function normalizeTestimonialsCollection(items) {
  const rawItems = Array.isArray(items) ? items : defaultSiteContent.testimonials;

  return sortByOrder(
    rawItems
      .map((item, index) => ({
        id: sanitizeIdentifier(item.id) || createId('testimonial'),
        text: sanitizeLongText(item.text),
        author: sanitizeShortText(item.author),
        role: sanitizeShortText(item.role),
        order: coerceOrder(item.order, index + 1)
      }))
      .filter((item) => item.text && item.author && item.role)
  );
}

function normalizeTeamCollection(items) {
  const rawItems = Array.isArray(items) ? items : defaultSiteContent.team;

  return sortByOrder(
    rawItems
      .map((item, index) => ({
        id: sanitizeIdentifier(item.id) || createId('team'),
        name: sanitizeShortText(item.name),
        role: sanitizeShortText(item.role),
        bio: sanitizeLongText(item.bio),
        imageUrl: normalizeAssetUrl(item.imageUrl),
        order: coerceOrder(item.order, index + 1)
      }))
      .filter((item) => item.name && item.role && item.bio)
  );
}

function normalizeParagraphs(value) {
  const defaults = defaultSiteContent.settings.aboutParagraphs;
  const paragraphs = ensureArray(value)
    .map((paragraph) => sanitizeLongText(paragraph))
    .filter(Boolean);

  const combined = paragraphs.length ? paragraphs : defaults;
  return combined.slice(0, 4);
}

function normalizeMetadataItem(item, index) {
  const source = item && typeof item === 'object' ? item : {};
  const filename = typeof source.filename === 'string' ? path.basename(source.filename) : '';
  const originalname =
    sanitizeShortText(source.originalname) || sanitizeShortText(source.title) || filename;
  const imageUrl = normalizeAssetUrl(source.imageUrl);

  return {
    id: sanitizeIdentifier(source.id) || createId('asset'),
    filename,
    imageUrl: imageUrl || (filename ? `/images/${encodeURIComponent(filename)}` : ''),
    storagePath: sanitizeStoragePath(source.storagePath),
    originalname,
    title: sanitizeShortText(source.title) || createPortfolioTitle(originalname),
    category: normalizeCategory(source.category) || 'Other',
    order: coerceOrder(source.order, index + 1),
    createdAt:
      typeof source.createdAt === 'string' && source.createdAt
        ? source.createdAt
        : new Date().toISOString()
  };
}

function normalizeEnquiryRecord(entry) {
  const source = entry && typeof entry === 'object' ? entry : {};

  return {
    id: sanitizeIdentifier(source.id) || createId('enquiry'),
    name: sanitizeShortText(source.name),
    email: normalizeEmail(source.email),
    service: sanitizeShortText(source.service),
    date: sanitizeShortText(source.date),
    message: sanitizeLongText(source.message),
    status: normalizeEnquiryStatus(source.status) || 'new',
    createdAt:
      typeof source.createdAt === 'string' && source.createdAt
        ? source.createdAt
        : new Date().toISOString()
  };
}

function parseNamedItems(body, prefix) {
  const ids = ensureArray(body[`${prefix}_id`]);
  const names = ensureArray(body[`${prefix}_name`]);
  const descriptions = ensureArray(body[`${prefix}_description`]);
  const orders = ensureArray(body[`${prefix}_order`]);

  return sortByOrder(
    names
      .map((name, index) => ({
        id: sanitizeIdentifier(ids[index]) || createId(prefix),
        name: sanitizeShortText(name),
        description: sanitizeLongText(descriptions[index]),
        order: coerceOrder(orders[index], index + 1)
      }))
      .filter((item) => item.name && item.description)
  );
}

function parseTestimonials(body) {
  const ids = ensureArray(body.testimonial_id);
  const texts = ensureArray(body.testimonial_text);
  const authors = ensureArray(body.testimonial_author);
  const roles = ensureArray(body.testimonial_role);
  const orders = ensureArray(body.testimonial_order);

  return sortByOrder(
    texts
      .map((text, index) => ({
        id: sanitizeIdentifier(ids[index]) || createId('testimonial'),
        text: sanitizeLongText(text),
        author: sanitizeShortText(authors[index]),
        role: sanitizeShortText(roles[index]),
        order: coerceOrder(orders[index], index + 1)
      }))
      .filter((item) => item.text && item.author && item.role)
  );
}

function parseTeamMembers(body) {
  const ids = ensureArray(body.team_id);
  const names = ensureArray(body.team_name);
  const roles = ensureArray(body.team_role);
  const bios = ensureArray(body.team_bio);
  const imageUrls = ensureArray(body.team_imageUrl);
  const orders = ensureArray(body.team_order);

  return sortByOrder(
    names
      .map((name, index) => ({
        id: sanitizeIdentifier(ids[index]) || createId('team'),
        name: sanitizeShortText(name),
        role: sanitizeShortText(roles[index]),
        bio: sanitizeLongText(bios[index]),
        imageUrl: normalizeAssetUrl(imageUrls[index]),
        order: coerceOrder(orders[index], index + 1)
      }))
      .filter((item) => item.name && item.role && item.bio)
  );
}

function validateSettings(settings) {
  if (!settings.heroTag || !settings.heroTitlePrefix || !settings.heroTitleEmphasis) {
    return 'The hero section needs a label and title.';
  }

  if (!settings.contactEmail || !isValidEmail(settings.contactEmail)) {
    return 'Enter a valid contact email for the public site.';
  }

  return null;
}

function normalizeEnquiryInput(body) {
  return {
    name: sanitizeShortText(body.name),
    email: normalizeEmail(body.email),
    service: sanitizeShortText(body.service),
    date: sanitizeShortText(body.date),
    message: sanitizeLongText(body.message)
  };
}

function validateEnquiry(enquiry) {
  if (!enquiry.name) {
    return 'Name is required.';
  }

  if (!isValidEmail(enquiry.email)) {
    return 'A valid email is required.';
  }

  if (!enquiry.message) {
    return 'Please tell us about your project.';
  }

  return null;
}

function normalizeCategory(value) {
  return categories.includes(value) ? value : null;
}

function normalizeEnquiryStatus(value) {
  return enquiryStatuses.includes(value) ? value : null;
}

function ensureArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'undefined') {
    return [];
  }

  return [value];
}

function sortByOrder(items) {
  return [...items].sort((left, right) => left.order - right.order);
}

function sanitizeShortText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim();
}

function sanitizeLongText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeMultilineText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeEmail(value) {
  return sanitizeShortText(value).toLowerCase();
}

function normalizeUrlInput(value) {
  const trimmed = sanitizeShortText(value);
  if (!trimmed) {
    return '';
  }

  if (isSafeDataImageUrl(trimmed) || isSafeBlobUrl(trimmed)) {
    return trimmed;
  }

  const withProtocol = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return '';
    }
    return url.toString();
  } catch (error) {
    return '';
  }
}

function normalizeAssetUrl(value) {
  const trimmed = sanitizeShortText(value);
  if (!trimmed) {
    return '';
  }

  if (isSafeRelativeAssetPath(trimmed)) {
    return trimmed;
  }

  return normalizeUrlInput(trimmed);
}

function isSafeRelativeAssetPath(value) {
  return typeof value === 'string' && /^[/.][^\s"'<>]*$/.test(value);
}

function isSafeDataImageUrl(value) {
  return typeof value === 'string' && /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(value);
}

function isSafeBlobUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('blob:')) {
    return false;
  }

  try {
    return new URL(value).protocol === 'blob:';
  } catch (error) {
    return false;
  }
}

function sanitizeStoragePath(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  return /^[a-zA-Z0-9/_\-.%]+$/.test(trimmed) ? trimmed : '';
}

function createImageProxyUrl(pathname) {
  const filename = path.basename(typeof pathname === 'string' ? pathname : '');
  return filename ? `/images/${encodeURIComponent(filename)}` : '';
}

function resolveImageUrl(image) {
  if (!image || typeof image !== 'object') {
    return '';
  }

  if (isPrimaryRemoteAssetUrl(image.imageUrl)) {
    return image.imageUrl;
  }

  const proxiedImageUrl = resolveFallbackImageUrl(image);
  if (proxiedImageUrl) {
    return proxiedImageUrl;
  }

  if (image.imageUrl) {
    return image.imageUrl;
  }

  return '';
}

function isPrimaryRemoteAssetUrl(value) {
  if (typeof value !== 'string' || !value) {
    return false;
  }

  if (isSafeDataImageUrl(value) || isSafeBlobUrl(value)) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

function resolveFallbackImageUrl(image) {
  if (!image || typeof image !== 'object') {
    return '';
  }

  if (image.filename && (image.storagePath || localImageExists(image.filename))) {
    return `/images/${encodeURIComponent(image.filename)}`;
  }

  return '';
}

function renderImageFallbackAttributes(image) {
  const fallbackSrc = resolveFallbackImageUrl(image);
  if (!fallbackSrc || fallbackSrc === resolveImageUrl(image)) {
    return '';
  }

  return `data-fallback-src="${escapeHtml(
    fallbackSrc
  )}" onerror="if(this.dataset.fallbackSrc&&this.src!==this.dataset.fallbackSrc){this.src=this.dataset.fallbackSrc;return;}this.onerror=null;"`;
}

function validateDirectUploadRequest(pathname, clientPayload) {
  if (typeof pathname !== 'string' || !isSafeDirectUploadPathname(pathname)) {
    throw new Error('Invalid upload destination.');
  }

  const metadata = parseDirectUploadClientPayload(clientPayload);
  if (!metadata.originalname) {
    throw new Error('Missing upload file metadata.');
  }
}

function parseDirectUploadClientPayload(value) {
  if (typeof value !== 'string' || !value) {
    return { originalname: '' };
  }

  try {
    const payload = JSON.parse(value);
    return {
      originalname: sanitizeShortText(payload.originalname)
    };
  } catch (error) {
    return { originalname: '' };
  }
}

function isSafeDirectUploadPathname(value) {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith('images/')) {
    return false;
  }

  return sanitizeStoragePath(trimmed) === trimmed && path.basename(trimmed) === sanitizeFilename(trimmed);
}

function normalizeDirectUploadEntries(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeDirectUploadEntry(entry))
    .filter(Boolean);
}

function normalizeDirectUploadEntry(entry) {
  const source = entry && typeof entry === 'object' ? entry : {};
  const storagePath = sanitizeStoragePath(source.pathname || source.storagePath);
  const filename = storagePath.startsWith('images/') ? path.basename(storagePath) : '';
  const imageUrl = normalizeAssetUrl(source.url || source.imageUrl);
  const originalname = sanitizeShortText(source.originalname) || filename;

  if (!storagePath || !filename || !imageUrl || !originalname) {
    return null;
  }

  return {
    filename,
    imageUrl,
    originalname,
    storagePath
  };
}

async function cleanupDirectUploadEntries(entries) {
  for (const entry of entries) {
    await removeStoredImage(entry);
  }
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sanitizeIdentifier(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/[^a-zA-Z0-9_-]/g, '');
}

function coerceOrder(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function createId(prefix) {
  return `${prefix}-${crypto.randomBytes(6).toString('hex')}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createPortfolioTitle(originalName) {
  return String(originalName || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeFlash(message, type) {
  const safeMessage = sanitizeLongText(message);
  return safeMessage
    ? {
        message: safeMessage,
        type: type === 'error' ? 'error' : 'success'
      }
    : null;
}

function redirectToAdmin(res, message, type, section) {
  const params = new URLSearchParams({
    flash: message,
    flashType: type
  });
  const fragment = sanitizeIdentifier(section) || 'overview';
  res.redirect(`/admin?${params.toString()}#${fragment}`);
}

function renderGalleryPage(images, selectedCategory) {
  const groups = Object.fromEntries(categories.map((category) => [category, []]));
  images.forEach((image) => {
    groups[image.category].push(image);
  });

  const activeCategory = categories.includes(selectedCategory) ? selectedCategory : '';
  const visibleCategories = activeCategory
    ? [activeCategory]
    : categories.filter((category) => groups[category].length);
  const visibleImageCount = activeCategory
    ? groups[activeCategory].length
    : images.length;
  const activeLabel = activeCategory || 'All categories';
  const filterLinks = [
    `
      <a class="gallery-filter${activeCategory ? '' : ' is-active'}" href="/gallery">
        <span>All</span>
        <strong>${images.length}</strong>
      </a>
    `,
    ...categories.map(
      (category) => `
        <a
          class="gallery-filter${category === activeCategory ? ' is-active' : ''}"
          href="/gallery?category=${encodeURIComponent(category)}"
        >
          <span>${escapeHtml(category)}</span>
          <strong>${groups[category].length}</strong>
        </a>
      `
    )
  ].join('');
  const emptyState = activeCategory
    ? `<p class="empty-state">No ${escapeHtml(
        activeCategory.toLowerCase()
      )} images have been uploaded yet. Choose another category or add new work from the admin area.</p>`
    : '<p class="empty-state">No portfolio work has been uploaded yet.</p>';

  const sections = visibleCategories
    .map((category) => {
      const items = groups[category];
      if (!items.length) {
        return '';
      }

      return `
        <section class="gallery-group">
          <div class="gallery-group-header">
            <p class="gallery-kicker">Portfolio</p>
            <h2>${escapeHtml(category)}</h2>
            <p>Large-format presentation designed so clients can open each ${escapeHtml(
              category.toLowerCase()
            )} image and browse the collection with ease.</p>
          </div>
          <div class="gallery-grid">
            ${items
              .map(
                (image) => `
                  <article class="gallery-card">
                    <div
                      class="gallery-card-media"
                      ${renderViewerDataAttributes(
                        resolveImageUrl(image),
                        resolveFallbackImageUrl(image),
                        image.title,
                        image.category,
                        `View ${image.title} in full size`
                      )}
                      role="button"
                      tabindex="0"
                    >
                      <img src="${escapeHtml(resolveImageUrl(image))}" ${renderImageFallbackAttributes(
                        image
                      )} alt="${escapeHtml(
                        `${image.title} — ${image.category}`
                      )}" loading="lazy" decoding="async">
                    </div>
                    <div class="gallery-card-copy">
                      <div class="gallery-card-meta">
                        <span class="gallery-card-category">${escapeHtml(image.category)}</span>
                        <strong>${escapeHtml(image.title)}</strong>
                        <span>${escapeHtml(image.originalname)}</span>
                      </div>
                      <button
                        class="admin-button admin-button-secondary gallery-view-button"
                        type="button"
                        data-viewer-trigger="true"
                        data-viewer-src="${escapeHtml(resolveImageUrl(image))}"
                        data-viewer-fallback-src="${escapeHtml(resolveFallbackImageUrl(image))}"
                        data-viewer-title="${escapeHtml(image.title)}"
                        data-viewer-category="${escapeHtml(image.category)}"
                        aria-label="View ${escapeHtml(image.title)} in full size"
                      >
                        View image
                      </button>
                    </div>
                  </article>
                `
              )
              .join('')}
          </div>
        </section>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Gallery - Éclat Media</title>
      <link rel="stylesheet" href="/admin.css">
      <link rel="stylesheet" href="/public-viewer.css">
    </head>
    <body class="admin-page">
      <main class="gallery-shell">
        <header class="gallery-hero">
          <div>
            <p class="admin-kicker">Published work</p>
            <h1>Gallery</h1>
            <p>Choose a category like Wedding, Portrait, or Event to jump straight into the work your client wants to review.</p>
            <div class="gallery-filter-bar" aria-label="Gallery categories">
              ${filterLinks}
            </div>
            <p class="gallery-selection-note">Showing ${visibleImageCount} image${visibleImageCount === 1 ? '' : 's'} in <strong>${escapeHtml(activeLabel)}</strong>.</p>
          </div>
          <div class="panel-actions">
            <a class="admin-button admin-button-secondary" href="/">View site</a>
            <a class="admin-button" href="/admin/login">Admin login</a>
          </div>
        </header>
        ${sections || emptyState}
      </main>
      <script src="/public-viewer.js" defer></script>
    </body>
    </html>
  `;
}

function renderAdminLoginPage({ csrfToken, error, configurationError }) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Login - Éclat Media</title>
      <link rel="stylesheet" href="/admin.css">
    </head>
    <body class="admin-page admin-login-page">
      <main class="login-shell">
        <section class="login-card">
          <div class="panel-header">
            <p class="admin-kicker">Éclat Media</p>
            <h1>Admin Dashboard</h1>
            <p>Manage the live site, publish new portfolio work, and keep track of enquiries in one place.</p>
          </div>
          ${
            configurationError
              ? `<div class="flash-banner flash-banner-error">${escapeHtml(
                  configurationError
                )}</div>
                 <p class="field-hint">Add the required admin environment variables in Vercel, redeploy, and then sign in again.</p>`
              : error
              ? '<div class="flash-banner flash-banner-error" data-flash>Incorrect username or password.</div>'
              : ''
          }
          ${
            configurationError
              ? ''
              : `<form method="POST" action="/admin/login" class="admin-form">
                  ${renderCsrfInput(csrfToken)}
                  <label class="field">
                    <span>Username</span>
                    <input type="text" name="username" autocomplete="username" required>
                  </label>
                  <label class="field">
                    <span>Password</span>
                    <input type="password" name="password" autocomplete="current-password" required>
                  </label>
                  <button class="admin-button admin-button-block" type="submit">Sign in</button>
                </form>`
          }
        </section>
      </main>
      <script src="/admin.js" defer></script>
    </body>
    </html>
  `;
}

function renderAdminDashboardPage({ siteContent, images, enquiries, csrfToken, flash }) {
  const stats = {
    team: siteContent.team.length,
    services: siteContent.services.length,
    process: siteContent.process.length,
    portfolio: images.length,
    newEnquiries: enquiries.filter((entry) => entry.status === 'new').length
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Dashboard - Éclat Media</title>
      <link rel="stylesheet" href="/admin.css">
    </head>
    <body class="admin-page">
      <div class="admin-layout">
        <aside class="admin-sidebar">
          <div class="brand-lockup">
            <p class="admin-kicker">Éclat Media</p>
            <h1>Content Control</h1>
            <p>Publish updates across the home page, portfolio, and enquiry workflow.</p>
          </div>
          <nav class="sidebar-nav">
            <a href="#overview">Overview</a>
            <a href="#settings">Site settings</a>
            <a href="#team">Team</a>
            <a href="#services">Services</a>
            <a href="#process">Process</a>
            <a href="#testimonials">Testimonials</a>
            <a href="#portfolio">Portfolio</a>
            <a href="#enquiries">Enquiries</a>
          </nav>
          <div class="sidebar-actions">
            <a class="admin-button admin-button-secondary" href="/" target="_blank" rel="noreferrer">View site</a>
            <a class="admin-button admin-button-ghost" href="/gallery" target="_blank" rel="noreferrer">Open gallery</a>
            <a class="admin-button admin-button-ghost" href="/admin/logout">Logout</a>
          </div>
        </aside>
        <main class="admin-main">
          <header class="admin-topbar" id="overview">
            <div>
              <p class="admin-kicker">Professional admin dashboard</p>
              <h2>Run the entire site from one workspace.</h2>
              <p>Update messaging, manage live portfolio entries, and work through incoming leads without leaving the dashboard.</p>
            </div>
          </header>

          ${
            flash
              ? `<div class="flash-banner flash-banner-${escapeHtml(flash.type)}" data-flash>${escapeHtml(
                  flash.message
                )}</div>`
              : ''
          }

          <section class="stats-grid">
            <article class="stat-card">
              <span>Team profiles</span>
              <strong>${stats.team}</strong>
              <p>Professional profiles currently featured on the site.</p>
            </article>
            <article class="stat-card">
              <span>Services</span>
              <strong>${stats.services}</strong>
              <p>Live offer cards on the home page.</p>
            </article>
            <article class="stat-card">
              <span>Process steps</span>
              <strong>${stats.process}</strong>
              <p>Client journey stages currently published.</p>
            </article>
            <article class="stat-card">
              <span>Portfolio items</span>
              <strong>${stats.portfolio}</strong>
              <p>Images available across the home page and gallery.</p>
            </article>
            <article class="stat-card">
              <span>New enquiries</span>
              <strong>${stats.newEnquiries}</strong>
              <p>Inbox items waiting for follow-up.</p>
            </article>
          </section>

          <section class="panel" id="settings">
            <div class="panel-header">
              <div>
                <p class="admin-kicker">Site settings</p>
                <h3>Update the public messaging and contact details.</h3>
              </div>
              <p>These fields publish directly to the home page and footer.</p>
            </div>
            <form method="POST" action="/admin/content/settings" class="admin-form admin-form-grid">
              ${renderCsrfInput(csrfToken)}
              <label class="field">
                <span>Hero label</span>
                <input type="text" name="heroTag" value="${escapeHtml(siteContent.settings.heroTag)}" required>
              </label>
              <label class="field">
                <span>Hero title line 1</span>
                <input type="text" name="heroTitlePrefix" value="${escapeHtml(
                  siteContent.settings.heroTitlePrefix
                )}" required>
              </label>
              <label class="field">
                <span>Hero highlight</span>
                <input type="text" name="heroTitleEmphasis" value="${escapeHtml(
                  siteContent.settings.heroTitleEmphasis
                )}" required>
              </label>
              <label class="field">
                <span>Hero title line 3</span>
                <input type="text" name="heroTitleSuffix" value="${escapeHtml(
                  siteContent.settings.heroTitleSuffix
                )}" required>
              </label>
              <label class="field field-full">
                <span>Hero subtitle</span>
                <textarea name="heroSubtitle" rows="3" required>${escapeHtml(
                  siteContent.settings.heroSubtitle
                )}</textarea>
              </label>
              <label class="field field-full">
                <span>About quote</span>
                <textarea name="aboutQuote" rows="3" required>${escapeHtml(
                  siteContent.settings.aboutQuote
                )}</textarea>
              </label>
              ${renderAboutParagraphFields(siteContent.settings.aboutParagraphs)}
              <label class="field">
                <span>Years of practice</span>
                <input type="text" name="aboutYears" value="${escapeHtml(
                  siteContent.settings.aboutYears
                )}" required>
              </label>
              <label class="field">
                <span>Clients served metric</span>
                <input type="text" name="metricClients" value="${escapeHtml(
                  siteContent.settings.metricClients
                )}" required>
              </label>
              <label class="field">
                <span>Awards won metric</span>
                <input type="text" name="metricAwards" value="${escapeHtml(
                  siteContent.settings.metricAwards
                )}" required>
              </label>
              <label class="field">
                <span>Countries shot in metric</span>
                <input type="text" name="metricCountries" value="${escapeHtml(
                  siteContent.settings.metricCountries
                )}" required>
              </label>
              <label class="field">
                <span>Booking title line 1</span>
                <input type="text" name="bookingTitlePrefix" value="${escapeHtml(
                  siteContent.settings.bookingTitlePrefix
                )}" required>
              </label>
              <label class="field">
                <span>Booking highlight</span>
                <input type="text" name="bookingTitleEmphasis" value="${escapeHtml(
                  siteContent.settings.bookingTitleEmphasis
                )}" required>
              </label>
              <label class="field">
                <span>Booking title line 2</span>
                <input type="text" name="bookingTitleSuffix" value="${escapeHtml(
                  siteContent.settings.bookingTitleSuffix
                )}" required>
              </label>
              <label class="field field-full">
                <span>Booking subtitle</span>
                <textarea name="bookingSubtitle" rows="2" required>${escapeHtml(
                  siteContent.settings.bookingSubtitle
                )}</textarea>
              </label>
              <label class="field">
                <span>Contact email</span>
                <input type="email" name="contactEmail" value="${escapeHtml(
                  siteContent.settings.contactEmail
                )}" required>
              </label>
              <label class="field">
                <span>Instagram URL</span>
                <input type="text" name="instagramUrl" value="${escapeHtml(
                  siteContent.settings.instagramUrl
                )}">
              </label>
              <label class="field">
                <span>Pinterest URL</span>
                <input type="text" name="pinterestUrl" value="${escapeHtml(
                  siteContent.settings.pinterestUrl
                )}">
              </label>
              <label class="field">
                <span>LinkedIn URL</span>
                <input type="text" name="linkedinUrl" value="${escapeHtml(
                  siteContent.settings.linkedinUrl
                )}">
              </label>
              <label class="field field-full">
                <span>Footer tagline and location</span>
                <textarea name="footerTagline" rows="4" required>${escapeHtml(
                  siteContent.settings.footerTagline
                )}</textarea>
              </label>
              <div class="panel-actions field-full">
                <button class="admin-button" type="submit">Publish site settings</button>
              </div>
            </form>
          </section>

          <section class="panel" id="team">
            <div class="panel-header">
              <div>
                <p class="admin-kicker">Our team</p>
                <h3>Present the people behind the brand with polished profile cards.</h3>
              </div>
              <p>Paste a full image URL or a local path like <code>/images/your-photo.jpg</code>. Leave it blank to show an elegant initial-based placeholder.</p>
            </div>
            <form method="POST" action="/admin/content/team" class="admin-form">
              ${renderCsrfInput(csrfToken)}
              <div class="collection-grid">
                ${renderTeamCards(siteContent.team, 2)}
              </div>
              <div class="panel-actions">
                <button class="admin-button" type="submit">Publish team profiles</button>
              </div>
            </form>
          </section>

          <section class="panel" id="services">
            <div class="panel-header">
              <div>
                <p class="admin-kicker">Services</p>
                <h3>Post and update the services grid.</h3>
              </div>
              <p>Empty cards are ignored, so you can add new services inline.</p>
            </div>
            <form method="POST" action="/admin/content/services" class="admin-form">
              ${renderCsrfInput(csrfToken)}
              <div class="collection-grid">
                ${renderNamedCards(siteContent.services, 'service', 'Service', 2)}
              </div>
              <div class="panel-actions">
                <button class="admin-button" type="submit">Publish services</button>
              </div>
            </form>
          </section>

          <section class="panel" id="process">
            <div class="panel-header">
              <div>
                <p class="admin-kicker">Process</p>
                <h3>Keep the client journey current.</h3>
              </div>
              <p>Reorder or rewrite the live workflow shown on the site.</p>
            </div>
            <form method="POST" action="/admin/content/process" class="admin-form">
              ${renderCsrfInput(csrfToken)}
              <div class="collection-grid">
                ${renderNamedCards(siteContent.process, 'process', 'Step', 2)}
              </div>
              <div class="panel-actions">
                <button class="admin-button" type="submit">Publish process</button>
              </div>
            </form>
          </section>

          <section class="panel" id="testimonials">
            <div class="panel-header">
              <div>
                <p class="admin-kicker">Testimonials</p>
                <h3>Refresh the social proof on the home page.</h3>
              </div>
              <p>Add new reviews or update the current quotes in place.</p>
            </div>
            <form method="POST" action="/admin/content/testimonials" class="admin-form">
              ${renderCsrfInput(csrfToken)}
              <div class="collection-grid">
                ${renderTestimonialCards(siteContent.testimonials, 2)}
              </div>
              <div class="panel-actions">
                <button class="admin-button" type="submit">Publish testimonials</button>
              </div>
            </form>
          </section>

          <section class="panel" id="portfolio">
            <div class="panel-header">
              <div>
                <p class="admin-kicker">Portfolio</p>
                <h3>Post new work and curate the order on the site.</h3>
              </div>
              <p>Uploads go live immediately on the home page and gallery.</p>
            </div>
            ${
              IS_VERCEL && !DIRECT_UPLOADS_ENABLED
                ? '<div class="flash-banner flash-banner-error">Portfolio uploads, edits, and deletes are disabled on this Vercel deployment until <strong>BLOB_READ_WRITE_TOKEN</strong> is added in project settings.</div>'
                : ''
            }
            <form method="POST" action="/admin/portfolio/upload?csrfToken=${encodeURIComponent(
              csrfToken
            )}" enctype="multipart/form-data" class="admin-form upload-form"${
              DIRECT_CLIENT_UPLOADS_ENABLED
                ? ' data-direct-upload-enabled="true" data-upload-url="/api/admin/portfolio/upload-url" data-register-url="/api/admin/portfolio/register" data-cleanup-url="/api/admin/portfolio/cleanup"'
                : ''
            }>
              ${renderCsrfInput(csrfToken)}
              <label class="field">
                <span>Image files</span>
                <input type="file" name="images" accept="image/*" multiple required>
                <small class="field-hint">${
                  DIRECT_CLIENT_UPLOADS_ENABLED
                    ? 'Upload up to 12 images at once. On Vercel, images upload directly from your browser to Blob storage so large galleries do not hit the function payload limit.'
                    : DIRECT_UPLOADS_ENABLED
                    ? 'Upload up to 12 images at once. Files are uploaded on the server and saved to public Blob storage.'
                    : IS_VERCEL
                    ? 'Uploads are blocked until Vercel Blob is configured for this deployment.'
                    : 'Upload up to 12 images at once from the same source or shoot.'
                }</small>
              </label>
              <label class="field">
                <span>Category</span>
                <select name="category" required>
                  <option value="">Select a category</option>
                  ${renderCategoryOptions('')}
                </select>
              </label>
              <div class="panel-actions">
                <button class="admin-button" type="submit">Post images</button>
                <span class="field-hint" data-upload-status aria-live="polite"></span>
              </div>
            </form>
            <div class="portfolio-admin-grid">
              ${
                images.length
                  ? images
                      .map((image) => renderPortfolioCard(image, csrfToken))
                      .join('')
                  : '<p class="empty-state">No portfolio images uploaded yet.</p>'
              }
            </div>
          </section>

          <section class="panel" id="enquiries">
            <div class="panel-header">
              <div>
                <p class="admin-kicker">Enquiries</p>
                <h3>Track incoming leads and move them through your inbox.</h3>
              </div>
              <p>The newest messages stay at the top so nothing gets missed.</p>
            </div>
            <div class="enquiry-list">
              ${
                enquiries.length
                  ? enquiries.map((entry) => renderEnquiryCard(entry, csrfToken)).join('')
                  : '<p class="empty-state">No enquiries have come in yet.</p>'
              }
            </div>
          </section>
        </main>
      </div>
      <script src="/admin.js" defer></script>
      <script type="module" src="/admin-blob-upload.js"></script>
    </body>
    </html>
  `;
}

function renderAboutParagraphFields(paragraphs) {
  const values = [...paragraphs];
  while (values.length < 3) {
    values.push('');
  }

  return values
    .slice(0, 3)
    .map(
      (paragraph, index) => `
        <label class="field field-full">
          <span>About paragraph ${index + 1}</span>
          <textarea name="aboutParagraphs" rows="3" required>${escapeHtml(paragraph)}</textarea>
        </label>
      `
    )
    .join('');
}

function renderNamedCards(items, prefix, label, blankCount) {
  const cards = items.map((item, index) => renderNamedCard(item, prefix, label, index + 1));

  for (let index = 0; index < blankCount; index += 1) {
    cards.push(
      renderNamedCard(
        {
          id: '',
          name: '',
          description: '',
          order: items.length + index + 1
        },
        prefix,
        `${label} draft`,
        items.length + index + 1
      )
    );
  }

  return cards.join('');
}

function renderNamedCard(item, prefix, label, position) {
  return `
    <article class="editor-card">
      <div class="editor-card-header">
        <div>
          <span class="eyebrow">${escapeHtml(label)}</span>
          <strong>${String(position).padStart(2, '0')}</strong>
        </div>
        <label class="field compact-field">
          <span>Order</span>
          <input type="number" name="${prefix}_order" min="1" value="${escapeHtml(item.order)}">
        </label>
      </div>
      <input type="hidden" name="${prefix}_id" value="${escapeHtml(item.id)}">
      <label class="field">
        <span>Name</span>
        <input type="text" name="${prefix}_name" value="${escapeHtml(item.name)}">
      </label>
      <label class="field">
        <span>Description</span>
        <textarea name="${prefix}_description" rows="4">${escapeHtml(item.description)}</textarea>
      </label>
    </article>
  `;
}

function renderTestimonialCards(items, blankCount) {
  const cards = items.map((item, index) => renderTestimonialCard(item, index + 1));

  for (let index = 0; index < blankCount; index += 1) {
    cards.push(
      renderTestimonialCard(
        {
          id: '',
          text: '',
          author: '',
          role: '',
          order: items.length + index + 1
        },
        items.length + index + 1
      )
    );
  }

  return cards.join('');
}

function renderTestimonialCard(item, position) {
  return `
    <article class="editor-card">
      <div class="editor-card-header">
        <div>
          <span class="eyebrow">Client story</span>
          <strong>${String(position).padStart(2, '0')}</strong>
        </div>
        <label class="field compact-field">
          <span>Order</span>
          <input type="number" name="testimonial_order" min="1" value="${escapeHtml(item.order)}">
        </label>
      </div>
      <input type="hidden" name="testimonial_id" value="${escapeHtml(item.id)}">
      <label class="field">
        <span>Quote</span>
        <textarea name="testimonial_text" rows="5">${escapeHtml(item.text)}</textarea>
      </label>
      <label class="field">
        <span>Client name</span>
        <input type="text" name="testimonial_author" value="${escapeHtml(item.author)}">
      </label>
      <label class="field">
        <span>Role</span>
        <input type="text" name="testimonial_role" value="${escapeHtml(item.role)}">
      </label>
    </article>
  `;
}

function renderTeamCards(items, blankCount) {
  const cards = items.map((item, index) => renderTeamCard(item, index + 1));

  for (let index = 0; index < blankCount; index += 1) {
    cards.push(
      renderTeamCard(
        {
          id: '',
          name: '',
          role: '',
          bio: '',
          imageUrl: '',
          order: items.length + index + 1
        },
        items.length + index + 1
      )
    );
  }

  return cards.join('');
}

function renderTeamCard(item, position) {
  return `
    <article class="editor-card team-editor-card">
      <div class="editor-card-media">
        ${renderTeamMediaPreview(item)}
      </div>
      <div class="editor-card-header">
        <div>
          <span class="eyebrow">Team profile</span>
          <strong>${String(position).padStart(2, '0')}</strong>
        </div>
        <label class="field compact-field">
          <span>Order</span>
          <input type="number" name="team_order" min="1" value="${escapeHtml(item.order)}">
        </label>
      </div>
      <input type="hidden" name="team_id" value="${escapeHtml(item.id)}">
      <label class="field">
        <span>Full name</span>
        <input type="text" name="team_name" value="${escapeHtml(item.name)}">
      </label>
      <label class="field">
        <span>Role</span>
        <input type="text" name="team_role" value="${escapeHtml(item.role)}">
      </label>
      <label class="field">
        <span>Image URL</span>
        <input type="text" name="team_imageUrl" value="${escapeHtml(item.imageUrl)}" placeholder="/images/team-member.jpg">
      </label>
      <label class="field">
        <span>Profile bio</span>
        <textarea name="team_bio" rows="5">${escapeHtml(item.bio)}</textarea>
      </label>
    </article>
  `;
}

function renderTeamMediaPreview(item) {
  if (item.imageUrl) {
    return `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name || 'Team member preview')}">`;
  }

  return `<div class="editor-card-avatar">${escapeHtml(createInitials(item.name || item.role || 'TM'))}</div>`;
}

function renderPortfolioCard(image, csrfToken) {
  return `
    <article class="portfolio-admin-card">
      <img src="${escapeHtml(resolveImageUrl(image))}" ${renderImageFallbackAttributes(
        image
      )} alt="${escapeHtml(image.title)}">
      <div class="portfolio-admin-copy">
        <div class="portfolio-admin-title">
          <strong>${escapeHtml(image.title)}</strong>
          <span>${escapeHtml(image.originalname)}</span>
        </div>
        <form method="POST" action="/admin/portfolio/update" class="admin-form">
          ${renderCsrfInput(csrfToken)}
          <input type="hidden" name="id" value="${escapeHtml(image.id)}">
          <label class="field">
            <span>Display title</span>
            <input type="text" name="title" value="${escapeHtml(image.title)}" required>
          </label>
          <label class="field">
            <span>Category</span>
            <select name="category" required>
              ${renderCategoryOptions(image.category)}
            </select>
          </label>
          <label class="field compact-field">
            <span>Order</span>
            <input type="number" name="order" min="1" value="${escapeHtml(image.order)}">
          </label>
          <div class="panel-actions">
            <button class="admin-button admin-button-small" type="submit"${
              PORTFOLIO_WRITE_CONFIGURATION_ERROR ? ' disabled' : ''
            }>Update item</button>
          </div>
        </form>
        <form method="POST" action="/admin/portfolio/delete" data-confirm="Delete this portfolio item permanently?">
          ${renderCsrfInput(csrfToken)}
          <input type="hidden" name="id" value="${escapeHtml(image.id)}">
          <button class="admin-button admin-button-small admin-button-danger" type="submit"${
            PORTFOLIO_WRITE_CONFIGURATION_ERROR ? ' disabled' : ''
          }>Delete item</button>
        </form>
      </div>
    </article>
  `;
}

function getStorageErrorMessage(error, fallback) {
  const message = error && error.message ? sanitizeLongText(error.message) : '';
  return message || fallback;
}

function renderEnquiryCard(entry, csrfToken) {
  return `
    <article class="enquiry-card">
      <div class="enquiry-header">
        <div>
          <strong>${escapeHtml(entry.name)}</strong>
          <span>${escapeHtml(entry.email)}</span>
        </div>
        <span class="status-badge status-${escapeHtml(entry.status)}">${escapeHtml(entry.status)}</span>
      </div>
      <div class="enquiry-meta">
        <span>${escapeHtml(entry.service || 'General enquiry')}</span>
        <span>${escapeHtml(entry.date || 'Date not provided')}</span>
        <span>${escapeHtml(formatDate(entry.createdAt))}</span>
      </div>
      <p>${escapeHtml(entry.message)}</p>
      <form method="POST" action="/admin/enquiries/status" class="enquiry-actions">
        ${renderCsrfInput(csrfToken)}
        <input type="hidden" name="id" value="${escapeHtml(entry.id)}">
        <select name="status" aria-label="Update enquiry status">
          ${enquiryStatuses
            .map(
              (status) =>
                `<option value="${escapeHtml(status)}"${
                  status === entry.status ? ' selected' : ''
                }>${escapeHtml(status)}</option>`
            )
            .join('')}
        </select>
        <button class="admin-button admin-button-small" type="submit">Save status</button>
      </form>
    </article>
  `;
}

function renderCategoryOptions(selectedCategory) {
  return categories
    .map(
      (category) =>
        `<option value="${escapeHtml(category)}"${
          category === selectedCategory ? ' selected' : ''
        }>${escapeHtml(category)}</option>`
    )
    .join('');
}

function createInitials(value) {
  const words = sanitizeShortText(value)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2);

  if (!words.length) {
    return 'TM';
  }

  return words.map((word) => word.charAt(0).toUpperCase()).join('');
}

function renderCsrfInput(csrfToken) {
  return `<input type="hidden" name="csrfToken" value="${escapeHtml(csrfToken)}">`;
}

function renderViewerDataAttributes(src, fallbackSrc, title, category, ariaLabel) {
  return `data-viewer-trigger="true" data-viewer-src="${escapeHtml(
    src
  )}" data-viewer-fallback-src="${escapeHtml(
    fallbackSrc || ''
  )}" data-viewer-title="${escapeHtml(title)}" data-viewer-category="${escapeHtml(
    category
  )}" aria-label="${escapeHtml(ariaLabel)}"`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}
