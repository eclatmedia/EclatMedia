const defaultContent = {
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
    footerTagline: 'Visual storytelling for those who\nbelieve images should endure.\n\nLondon, UK — Available Worldwide'
  },
  services: [
    {
      name: 'Wedding Photography',
      description: 'Elegant coverage for intimate ceremonies and destination celebrations, crafted with a cinematic eye.'
    },
    {
      name: 'Portrait Sessions',
      description: 'Modern portraiture for individuals, couples, and families with gentle direction and timeless styling.'
    },
    {
      name: 'Brand Storytelling',
      description: 'Refined visual assets for founders, products, and campaigns that need atmosphere as much as clarity.'
    },
    {
      name: 'Fine Art & Exhibition',
      description: 'Thoughtful imagery for artists, galleries, and curated exhibitions that deserves a refined, immersive presentation.'
    },
    {
      name: 'Lifestyle & Family',
      description: 'Warm, natural sessions that preserve connection, personality, and everyday beauty with polished direction.'
    },
    {
      name: 'Video & Motion',
      description: 'Cinematic motion coverage for campaigns, events, and stories that need atmosphere, movement, and strong visual rhythm.'
    }
  ],
  process: [
    {
      name: 'Discovery',
      description: 'We start with a conversation about your vision, references, schedule, and the feeling you want the work to carry.'
    },
    {
      name: 'Planning',
      description: 'Locations, styling notes, timelines, and shot priorities are shaped into a clear production plan.'
    },
    {
      name: 'Capture',
      description: 'On the day, we direct lightly and observe carefully so the final images feel polished and alive.'
    },
    {
      name: 'Delivery',
      description: 'Your gallery is edited with consistency and care, then delivered in a format ready for print and digital use.'
    }
  ],
  testimonials: [
    {
      text: 'The photos felt editorial and deeply personal at the same time. Every frame looked like a memory already preserved.',
      author: 'Amelia Hart',
      role: 'Bride'
    },
    {
      text: 'Éclat gave our launch campaign warmth and sophistication. The images elevated the brand instantly.',
      author: 'Marcus Lee',
      role: 'Creative Director'
    },
    {
      text: 'The entire process was calm, intentional, and beautifully organised. We felt looked after from start to finish.',
      author: 'Sofia Bennett',
      role: 'Portrait Client'
    }
  ],
  team: [
    {
      name: 'Arielle Bennett',
      role: 'Creative Director',
      bio:
        'Arielle shapes the visual direction of every commission, translating brand vision and personal stories into imagery with polish, warmth, and intention.',
      imageUrl: ''
    },
    {
      name: 'Julian Hart',
      role: 'Lead Photographer',
      bio:
        'Julian leads production on set and on location, balancing calm direction with documentary instincts to create refined photographs that still feel alive.',
      imageUrl: ''
    },
    {
      name: 'Naomi Clarke',
      role: 'Client Experience Producer',
      bio:
        'Naomi keeps each project seamless from planning through delivery, ensuring every timeline, detail, and client touchpoint feels considered and effortless.',
      imageUrl: ''
    }
  ],
  portfolio: []
};

const portfolioCategoryOrder = ['All', 'Wedding', 'Portrait', 'Event', 'Brand', 'Other'];
const heroMosaicRotationDelay = 3200;

let heroMosaicRotationTimer;

document.addEventListener('DOMContentLoaded', async () => {
  initializeMobileNav();
  initializeScrollEffects();

  const content = await loadSiteContent();
  renderPage(content);
  initializeBookingForm();
});

async function loadSiteContent() {
  try {
    const response = await fetch('/api/site-content');
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const payload = await response.json();
    return {
      ...defaultContent,
      ...payload,
      settings: {
        ...defaultContent.settings,
        ...payload.settings
      }
    };
  } catch (error) {
    console.error('Failed to load site content:', error);
    return defaultContent;
  }
}

function renderPage(content) {
  const safePortfolio = normalizePortfolioItems(content.portfolio);
  const safeTeamMembers = normalizeTeamMembers(content.team);

  renderSettings(content.settings);
  renderHeroMosaic(safePortfolio);
  renderServices(content.services || []);
  renderPortfolio(safePortfolio);
  renderAbout(content.settings);
  renderTeam(safeTeamMembers);
  renderProcess(content.process || []);
  renderTestimonials(content.testimonials || []);
}

function renderSettings(settings) {
  setText('hero-tag', settings.heroTag);
  setText('hero-title-prefix', settings.heroTitlePrefix);
  setText('hero-title-emphasis', settings.heroTitleEmphasis);
  setText('hero-title-suffix', settings.heroTitleSuffix);
  setText('hero-subtitle', settings.heroSubtitle);
  setText('about-quote', settings.aboutQuote);
  setText('about-years', settings.aboutYears);
  setText('metric-clients', settings.metricClients);
  setText('metric-awards', settings.metricAwards);
  setText('metric-countries', settings.metricCountries);
  setText('booking-title-prefix', settings.bookingTitlePrefix);
  setText('booking-title-emphasis', settings.bookingTitleEmphasis);
  setText('booking-title-suffix', settings.bookingTitleSuffix);
  setText('booking-subtitle', settings.bookingSubtitle);
  setText('footer-tagline', settings.footerTagline);

  setLink('footer-instagram', settings.instagramUrl, 'Instagram');
  setLink('footer-pinterest', settings.pinterestUrl, 'Pinterest');
  setLink('footer-linkedin', settings.linkedinUrl, 'LinkedIn');
  setLink('footer-email', `mailto:${settings.contactEmail}`, settings.contactEmail);
}

function renderServices(services) {
  const container = document.getElementById('services-grid');
  if (!container) {
    return;
  }

  container.replaceChildren();

  services.forEach((service, index) => {
    const card = createElement('div', 'service-card reveal');
    card.append(createElement('span', 'service-num', String(index + 1).padStart(2, '0')));
    card.append(createElement('div', 'service-icon'));
    card.append(createElement('h3', 'service-name', service.name));
    card.append(createElement('p', 'service-desc', service.description));
    container.append(card);
  });

  refreshRevealObserver();
}

function renderPortfolio(portfolio) {
  const container = document.getElementById('portfolio-strip');
  const filters = document.getElementById('portfolio-filters');
  const status = document.getElementById('portfolio-status');
  const galleryLink = document.getElementById('portfolio-gallery-link');
  if (!container || !filters || !status || !galleryLink) {
    return;
  }

  container.replaceChildren();
  filters.replaceChildren();

  if (!portfolio.length) {
    const emptyState = createElement('p', 'portfolio-empty', 'Portfolio images will appear here once work is uploaded.');
    container.append(emptyState);
    status.textContent = '';
    galleryLink.href = '/gallery';
    galleryLink.textContent = 'View All Work';
    return;
  }

  const counts = portfolio.reduce((map, item) => {
    const category = item.category || 'Other';
    map.set(category, (map.get(category) || 0) + 1);
    return map;
  }, new Map());
  const availableCategories = [
    ...portfolioCategoryOrder,
    ...[...counts.keys()].filter((category) => !portfolioCategoryOrder.includes(category))
  ];

  let activeCategory = 'All';

  availableCategories.forEach((category) => {
    const button = createElement('button', 'portfolio-filter');
    button.type = 'button';
    button.dataset.category = category;
    button.setAttribute('aria-pressed', category === activeCategory ? 'true' : 'false');

    const label = createElement('span', 'portfolio-filter-label', category);
    const count = createElement(
      'span',
      'portfolio-filter-count',
      String(category === 'All' ? portfolio.length : counts.get(category) || 0)
    );

    button.append(label, count);
    button.addEventListener('click', () => {
      if (activeCategory === category) {
        return;
      }

      activeCategory = category;
      renderPortfolioSelection();
    });
    filters.append(button);
  });

  renderPortfolioSelection();

  function renderPortfolioSelection() {
    const matchingItems =
      activeCategory === 'All'
        ? portfolio
        : portfolio.filter((item) => (item.category || 'Other') === activeCategory);
    const visibleItems = matchingItems;

    filters.querySelectorAll('.portfolio-filter').forEach((button) => {
      const isActive = button.dataset.category === activeCategory;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    container.replaceChildren();

    visibleItems.forEach((item) => {
      const card = createElement('article', 'portfolio-item reveal');
      const media = createElement('div', 'portfolio-media');
      applyViewerData(media, item, `View ${item.title || 'portfolio image'} in full size`);
      media.setAttribute('role', 'button');
      media.setAttribute('tabindex', '0');
      const image = document.createElement('img');
      image.className = 'pimg';
      image.src = getPrimaryImageUrl(item);
      image.alt = item.title ? `${item.title} — ${item.category || 'Portfolio image'}` : 'Portfolio image';
      image.loading = 'lazy';
      image.decoding = 'async';
      applyImageFallback(image, item);

      const overlay = createElement('div', 'portfolio-overlay');
      const viewButton = createViewerButton(item, 'portfolio-view-button');

      overlay.append(viewButton);
      media.append(image, overlay);
      card.append(media);
      container.append(card);
    });

    if (!visibleItems.length) {
      container.append(
        createElement(
          'p',
          'portfolio-empty',
          `No ${activeCategory.toLowerCase()} images are available yet.`
        )
      );
    }

    if (activeCategory === 'All') {
      status.textContent =
        `Showing all ${portfolio.length} uploaded photographs. Choose a category like Wedding to focus the gallery.`;
      galleryLink.href = '/gallery';
      galleryLink.textContent = 'View All Work';
    } else {
      status.textContent = `Showing all ${matchingItems.length} ${activeCategory.toLowerCase()} images.`;
      galleryLink.href = `/gallery?category=${encodeURIComponent(activeCategory)}`;
      galleryLink.textContent = `View ${activeCategory} Gallery`;
    }

    refreshRevealObserver();
  }
}

function renderHeroMosaic(portfolio) {
  const cells = [...document.querySelectorAll('.mosaic-cell')];
  const stageMedia = document.getElementById('hero-stage-media');
  if (!cells.length) {
    return;
  }

  window.clearInterval(heroMosaicRotationTimer);

  const prioritizedPortfolio = getHeroPriorityPortfolio(portfolio);
  const featuredItem = prioritizedPortfolio[0] || null;
  const mosaicPortfolio =
    prioritizedPortfolio.length > 1
      ? [...prioritizedPortfolio.slice(1), prioritizedPortfolio[0]]
      : prioritizedPortfolio;

  renderHeroStage(stageMedia, featuredItem);

  let startIndex = 0;
  renderMosaicState(startIndex);

  if (mosaicPortfolio.length > 1) {
    heroMosaicRotationTimer = window.setInterval(() => {
      cells.forEach((cell) => cell.classList.add('is-rotating'));

      window.setTimeout(() => {
        startIndex = (startIndex + 1) % mosaicPortfolio.length;
        renderMosaicState(startIndex);

        requestAnimationFrame(() => {
          cells.forEach((cell) => cell.classList.remove('is-rotating'));
        });
      }, 220);
    }, heroMosaicRotationDelay);
  }

  function renderMosaicState(offset) {
    const visibleItems = getVisibleHeroMosaicItems(mosaicPortfolio, offset, cells.length);

    cells.forEach((cell, index) => {
      const item = visibleItems[index];
      const layer = createElement('div', 'layer');
      cell.replaceChildren();

      if (item) {
        cell.dataset.label = item.category || 'Featured Work';
        applyViewerData(cell, item, `View ${item.title || 'featured image'} from the hero section`);
        cell.setAttribute('role', 'button');
        cell.setAttribute('tabindex', '0');

        const image = document.createElement('img');
        image.className = 'mosaic-photo';
        image.src = getPrimaryImageUrl(item);
        image.alt = item.title
          ? `${item.title} — ${item.category || 'Featured image'}`
          : 'Featured image';
        image.loading = index === 0 ? 'eager' : 'lazy';
        image.decoding = 'async';
        applyImageFallback(image, item);

        const button = createViewerButton(item, 'mosaic-view-button');
        button.textContent = 'View';
        button.setAttribute(
          'aria-label',
          `View ${item.title || 'featured image'} from the hero section`
        );

        cell.append(image, layer, button);
        return;
      }

      cell.removeAttribute('data-viewer-trigger');
      cell.removeAttribute('data-viewer-src');
      cell.removeAttribute('data-viewer-title');
      cell.removeAttribute('data-viewer-category');
      cell.removeAttribute('role');
      cell.removeAttribute('tabindex');
      cell.append(layer);
      if (index === 0) {
        cell.append(createElement('div', 'figure'));
      }
    });
  }
}

function renderHeroStage(container, item) {
  if (!container) {
    return;
  }

  container.replaceChildren();

  const heroVideoSrc = typeof container.dataset.heroVideoSrc === 'string'
    ? container.dataset.heroVideoSrc.trim()
    : '';

  if (heroVideoSrc) {
    const video = document.createElement('video');
    video.className = 'hero-stage-video';
    video.src = heroVideoSrc;
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.defaultMuted = true;
    video.setAttribute('aria-hidden', 'true');
    video.addEventListener(
      'error',
      () => {
        container.replaceChildren(item ? createHeroStageImage(item) : createHeroStagePlaceholder());
      },
      { once: true }
    );
    container.append(video);
    return;
  }

  if (!item) {
    container.append(createHeroStagePlaceholder());
    return;
  }

  container.append(createHeroStageImage(item));
}

function createHeroStageImage(item) {
  const image = document.createElement('img');
  image.className = 'hero-stage-photo';
  image.src = getPrimaryImageUrl(item);
  image.alt = item.title ? `${item.title} — featured portrait` : 'Featured portrait';
  image.loading = 'eager';
  image.decoding = 'async';
  const fallbackImageUrl = getFallbackImageUrl(item);
  image.addEventListener(
    'error',
    () => {
      if (fallbackImageUrl && image.src !== fallbackImageUrl) {
        image.src = fallbackImageUrl;
        return;
      }

      image.replaceWith(createHeroStagePlaceholder());
    },
    { once: false }
  );
  return image;
}

function getVisibleHeroMosaicItems(portfolio, startIndex, count) {
  if (!portfolio.length) {
    return Array.from({ length: count }, () => null);
  }

  return Array.from({ length: count }, (_, index) => portfolio[(startIndex + index) % portfolio.length]);
}

function getHeroPriorityPortfolio(portfolio) {
  const categoryPriority = new Map([
    ['Portrait', 0],
    ['Wedding', 1],
    ['Editorial', 2],
    ['Brand', 3],
    ['Commercial', 4],
    ['Event', 5],
    ['Other', 6]
  ]);

  return [...portfolio].sort((left, right) => {
    const leftRank = categoryPriority.get(left.category) ?? 99;
    const rightRank = categoryPriority.get(right.category) ?? 99;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return left.title.localeCompare(right.title);
  });
}

function createHeroStagePlaceholder() {
  const placeholder = createElement('div', 'hero-stage-placeholder');
  placeholder.append(createElement('span', 'hero-stage-glow'));
  placeholder.append(createElement('span', 'hero-stage-silhouette'));
  return placeholder;
}

function renderAbout(settings) {
  const container = document.getElementById('about-text');
  if (!container) {
    return;
  }

  container.replaceChildren();
  (settings.aboutParagraphs || []).forEach((paragraph) => {
    container.append(createElement('p', '', paragraph));
  });
}

function renderProcess(steps) {
  const container = document.getElementById('process-steps');
  if (!container) {
    return;
  }

  container.replaceChildren();

  steps.forEach((step, index) => {
    const card = createElement('div', 'process-step reveal');
    card.append(createElement('div', 'step-num', String(index + 1).padStart(2, '0')));
    card.append(createElement('h3', 'step-name', step.name));
    card.append(createElement('p', 'step-desc', step.description));
    container.append(card);
  });

  refreshRevealObserver();
}

function renderTeam(teamMembers) {
  const section = document.getElementById('team');
  const container = document.getElementById('team-grid');
  if (!section || !container) {
    return;
  }

  container.replaceChildren();

  if (!teamMembers.length) {
    section.hidden = true;
    return;
  }

  section.hidden = false;

  teamMembers.forEach((member, index) => {
    const card = createElement('article', 'team-card reveal');
    const media = createElement('div', 'team-media');

    if (member.imageUrl) {
      const image = document.createElement('img');
      image.className = 'team-photo';
      image.src = member.imageUrl;
      image.alt = member.name ? `${member.name} — ${member.role || 'Team member'}` : 'Team member';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.addEventListener('error', () => {
        media.replaceChildren(createTeamPhotoPlaceholder(member));
      }, { once: true });
      media.append(image);
    } else {
      media.append(createTeamPhotoPlaceholder(member));
    }

    const content = createElement('div', 'team-card-content');
    content.append(createElement('span', 'team-card-index', String(index + 1).padStart(2, '0')));
    content.append(createElement('h3', 'team-name', member.name));
    content.append(createElement('p', 'team-role', member.role));
    content.append(createElement('p', 'team-bio', member.bio));

    card.append(media, content);
    container.append(card);
  });

  refreshRevealObserver();
}

function renderTestimonials(testimonials) {
  const container = document.getElementById('testimonials-grid');
  if (!container) {
    return;
  }

  container.replaceChildren();

  testimonials.forEach((testimonial) => {
    const card = createElement('article', 'testimonial reveal');
    card.append(createElement('p', 'testimonial-text', `“${testimonial.text}”`));

    const meta = createElement('div', 'testimonial-meta');
    meta.append(createElement('div', 'testimonial-author', testimonial.author));
    meta.append(createElement('div', 'testimonial-role', testimonial.role));

    card.append(meta);
    container.append(card);
  });

  refreshRevealObserver();
}

function initializeBookingForm() {
  const submitButton = document.getElementById('form-submit');
  if (!submitButton) {
    return;
  }

  submitButton.addEventListener('click', async () => {
    const fields = {
      name: document.getElementById('f-name')?.value.trim() || '',
      email: document.getElementById('f-email')?.value.trim() || '',
      service: document.getElementById('f-service')?.value.trim() || '',
      date: document.getElementById('f-date')?.value.trim() || '',
      message: document.getElementById('f-message')?.value.trim() || ''
    };

    submitButton.disabled = true;
    const originalLabel = submitButton.textContent;
    submitButton.textContent = 'Sending…';

    try {
      const response = await fetch('/api/enquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fields)
      });

      const payload = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to send enquiry.');
      }

      clearBookingForm();
      submitButton.textContent = 'Enquiry Sent';
      window.setTimeout(() => {
        submitButton.textContent = originalLabel;
        submitButton.disabled = false;
      }, 1800);
    } catch (error) {
      console.error('Enquiry submission failed:', error);
      submitButton.textContent = error.message;
      window.setTimeout(() => {
        submitButton.textContent = originalLabel;
        submitButton.disabled = false;
      }, 2200);
    }
  });
}

function clearBookingForm() {
  ['f-name', 'f-email', 'f-service', 'f-date', 'f-message'].forEach((id) => {
    const field = document.getElementById(id);
    if (field) {
      field.value = '';
    }
  });
}

let revealObserver;

function initializeScrollEffects() {
  const nav = document.querySelector('nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('nav-scrolled', window.scrollY > 20);
    });
  }

  refreshRevealObserver();
}

function initializeMobileNav() {
  const nav = document.querySelector('nav');
  const toggle = document.getElementById('nav-toggle');
  const panel = document.getElementById('site-nav-panel');
  if (!nav || !toggle || !panel) {
    return;
  }

  const closeNavigation = () => {
    nav.classList.remove('nav-open');
    document.body.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', () => {
    const shouldOpen = !nav.classList.contains('nav-open');
    nav.classList.toggle('nav-open', shouldOpen);
    document.body.classList.toggle('nav-open', shouldOpen);
    toggle.setAttribute('aria-expanded', String(shouldOpen));
  });

  panel.querySelectorAll('a, button.nav-cta').forEach((element) => {
    element.addEventListener('click', () => {
      closeNavigation();
    });
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
      closeNavigation();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeNavigation();
    }
  });
}

function refreshRevealObserver() {
  if (typeof IntersectionObserver !== 'function') {
    document.querySelectorAll('.reveal').forEach((element) => {
      element.classList.add('visible');
    });
    return;
  }

  if (revealObserver) {
    revealObserver.disconnect();
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll('.reveal').forEach((element) => {
    revealObserver.observe(element);
  });
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (typeof text === 'string') {
    element.textContent = text;
  }
  return element;
}

function createViewerButton(item, className) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  if (!applyViewerData(button, item, `View ${item.title || 'image'} in full size`)) {
    button.disabled = true;
  }
  button.textContent = 'View image';
  return button;
}

function createTeamPhotoPlaceholder(member) {
  return createElement(
    'div',
    'team-photo-placeholder',
    createInitials(member?.name || member?.role)
  );
}

function applyViewerData(element, item, ariaLabel) {
  const primaryImageUrl = getPrimaryImageUrl(item);
  if (!primaryImageUrl) {
    element.removeAttribute('data-viewer-trigger');
    element.removeAttribute('data-viewer-src');
    element.removeAttribute('data-viewer-fallback-src');
    element.removeAttribute('data-viewer-title');
    element.removeAttribute('data-viewer-category');
    return false;
  }

  element.dataset.viewerTrigger = 'true';
  element.dataset.viewerSrc = primaryImageUrl;
  element.dataset.viewerFallbackSrc = getFallbackImageUrl(item);
  element.dataset.viewerTitle = item.title || 'Untitled Project';
  element.dataset.viewerCategory = item.category || 'Featured Work';
  element.setAttribute('aria-label', ariaLabel);
  return true;
}

function applyImageFallback(image, item) {
  const fallbackImageUrl = getFallbackImageUrl(item);
  if (!fallbackImageUrl || fallbackImageUrl === getPrimaryImageUrl(item)) {
    return;
  }

  image.addEventListener(
    'error',
    () => {
      if (image.src !== fallbackImageUrl) {
        image.src = fallbackImageUrl;
      }
    },
    { once: true }
  );
}

function getPrimaryImageUrl(item) {
  return item && typeof item.imageUrl === 'string' ? item.imageUrl : '';
}

function getFallbackImageUrl(item) {
  return item && typeof item.fallbackImageUrl === 'string' ? item.fallbackImageUrl : '';
}

function createInitials(value) {
  const parts = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return 'TM';
  }

  return parts.map((part) => part.charAt(0).toUpperCase()).join('');
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element && typeof value === 'string') {
    element.textContent = value;
  }
}

function setLink(id, href, label) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }

  element.href = href;
  element.textContent = label;
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

function normalizePortfolioItems(portfolio) {
  if (!Array.isArray(portfolio)) {
    return [];
  }

  return portfolio
    .map((item, index) => normalizePortfolioItem(item, index))
    .filter(Boolean);
}

function normalizePortfolioItem(item, index) {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const imageUrl = normalizeImageSource(item.imageUrl) || normalizeImageSource(item.fallbackImageUrl);
  if (!imageUrl) {
    return null;
  }

  const fallbackImageUrl = normalizeImageSource(item.fallbackImageUrl);
  const title = normalizeText(item.title) || `Portfolio Image ${index + 1}`;
  const category = normalizeText(item.category) || 'Other';

  return {
    ...item,
    imageUrl,
    fallbackImageUrl,
    title,
    category
  };
}

function normalizeImageSource(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeTeamMembers(teamMembers) {
  if (!Array.isArray(teamMembers)) {
    return [];
  }

  return teamMembers.filter(
    (member) =>
      member &&
      typeof member === 'object' &&
      typeof member.name === 'string' &&
      member.name &&
      typeof member.role === 'string' &&
      member.role &&
      typeof member.bio === 'string' &&
      member.bio
  );
}
