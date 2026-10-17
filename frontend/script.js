const defaultContent = {
  settings: {
    heroTag: '— Visual Storytelling Studio',
    heroTitlePrefix: 'Capturing Moments.',
    heroTitleEmphasis: 'Crafting',
    heroTitleSuffix: 'Memories.',
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

const portfolioCategoryOrder = ['Wedding', 'Portrait', 'Event', 'Brand', 'Other'];
const portfolioLayoutClasses = [
  'portfolio-strip--empty',
  'portfolio-strip--single',
  'portfolio-strip--duo',
  'portfolio-strip--grid'
];
const portfolioAllCategory = 'All';
const fallbackPortfolioCategory = 'Other';
const bookingFieldIds = ['f-name', 'f-email', 'f-service', 'f-date', 'f-message'];
const heroCategoryPriority = new Map([
  ['Portrait', 0],
  ['Wedding', 1],
  ['Editorial', 2],
  ['Brand', 3],
  ['Commercial', 4],
  ['Event', 5],
  ['Other', 6]
]);

document.addEventListener('DOMContentLoaded', () => {
  initializePage();
});

async function initializePage() {
  initializeMobileNav();
  initializeScrollEffects();

  const content = await loadSiteContent();
  renderPage(content);
  initializeBookingForm();
}

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
  renderHero(safePortfolio);
  renderServices(content.services || []);
  renderPortfolio(safePortfolio);
  renderAbout(content.settings);
  renderTeam(safeTeamMembers);
  renderProcess(content.process || []);
  renderTestimonials(content.testimonials || []);
}

function renderSettings(settings) {
  // Older content stores labels with a leading dash ("— Studio"); the new design doesn't use it.
  setText('hero-tag', stripLeadingDash(settings.heroTag));
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
  setText('footer-year', String(new Date().getFullYear()));

  setLink('footer-instagram', settings.instagramUrl, 'Instagram');
  setLink('footer-pinterest', settings.pinterestUrl, 'Pinterest');
  setLink('footer-linkedin', settings.linkedinUrl, 'LinkedIn');
  setLink('footer-email', `mailto:${settings.contactEmail}`, settings.contactEmail);
  setLink('booking-email', `mailto:${settings.contactEmail}`, settings.contactEmail);
}

function renderServices(services) {
  const container = document.getElementById('services-grid');
  if (!container) {
    return;
  }

  container.replaceChildren();

  services.forEach((service, index) => {
    const item = createElement('li', 'service-item reveal');
    item.append(createElement('span', 'service-num', String(index + 1).padStart(2, '0')));
    item.append(createElement('h3', 'service-name', service.name));
    item.append(createElement('p', 'service-desc', service.description));
    container.append(item);
  });

  renderServiceOptions(services);
  refreshRevealObserver();
}

function renderServiceOptions(services) {
  const select = document.getElementById('f-service');
  if (!select) {
    return;
  }

  const placeholder = createElement('option', '', 'Select one');
  placeholder.value = '';
  select.replaceChildren(placeholder);

  [...services.map((service) => service.name).filter(Boolean), 'Something else'].forEach((name) => {
    const option = createElement('option', '', name);
    option.value = name;
    select.append(option);
  });
}

function renderPortfolio(portfolio) {
  const portfolioElements = getPortfolioElements();
  if (!portfolioElements) {
    return;
  }

  const { container, filters, status, galleryLink } = portfolioElements;
  container.replaceChildren();
  filters.replaceChildren();

  if (!portfolio.length) {
    renderEmptyPortfolioState(portfolioElements);
    return;
  }

  const counts = countPortfolioItemsByCategory(portfolio);
  const availableCategories = getAvailablePortfolioCategories(counts);
  let activeCategory = portfolioAllCategory;

  // A filter bar with a single choice is noise, so only show it when there is something to filter.
  filters.hidden = availableCategories.length <= 2;

  availableCategories.forEach((category) => {
    filters.append(
      createPortfolioFilterButton({
        category,
        portfolio,
        counts,
        activeCategory,
        onSelect: () => {
          if (activeCategory === category) {
            return;
          }

          activeCategory = category;
          renderPortfolioSelection();
        }
      })
    );
  });

  renderPortfolioSelection();

  function renderPortfolioSelection() {
    const visibleItems = getPortfolioItemsForCategory(portfolio, activeCategory);
    setPortfolioLayout(container, visibleItems.length);

    filters.querySelectorAll('.portfolio-filter').forEach((button) => {
      const isActive = button.dataset.category === activeCategory;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    container.replaceChildren();

    visibleItems.forEach((item) => {
      container.append(createPortfolioCard(item));
    });

    updatePortfolioFeedback({
      activeCategory,
      visibleCount: visibleItems.length,
      status,
      galleryLink
    });

    refreshRevealObserver();
  }
}

function getPortfolioElements() {
  const container = document.getElementById('portfolio-strip');
  const filters = document.getElementById('portfolio-filters');
  const status = document.getElementById('portfolio-status');
  const galleryLink = document.getElementById('portfolio-gallery-link');

  if (!container || !filters || !status || !galleryLink) {
    return null;
  }

  return { container, filters, status, galleryLink };
}

function renderEmptyPortfolioState({ container, filters, status, galleryLink }) {
  setPortfolioLayout(container, 0);
  filters.hidden = true;
  container.append(createElement('p', 'portfolio-empty', 'New work is being added. Check back soon.'));
  status.textContent = '';
  galleryLink.href = '/gallery';
  galleryLink.textContent = 'View all work';
}

function countPortfolioItemsByCategory(portfolio) {
  return portfolio.reduce((counts, item) => {
    const category = item.category || fallbackPortfolioCategory;
    counts.set(category, (counts.get(category) || 0) + 1);
    return counts;
  }, new Map());
}

function getAvailablePortfolioCategories(categoryCounts) {
  return [
    portfolioAllCategory,
    ...portfolioCategoryOrder.filter((category) => categoryCounts.has(category)),
    ...[...categoryCounts.keys()].filter((category) => !portfolioCategoryOrder.includes(category))
  ];
}

function createPortfolioFilterButton({ category, portfolio, counts, activeCategory, onSelect }) {
  const button = createElement('button', 'portfolio-filter');
  button.type = 'button';
  button.dataset.category = category;
  button.setAttribute('aria-pressed', String(category === activeCategory));

  const label = createElement('span', 'portfolio-filter-label', category);
  const count = createElement(
    'sup',
    'portfolio-filter-count',
    String(category === portfolioAllCategory ? portfolio.length : counts.get(category) || 0)
  );

  button.append(label, count);
  button.addEventListener('click', onSelect);
  return button;
}

function getPortfolioItemsForCategory(portfolio, category) {
  if (category === portfolioAllCategory) {
    return portfolio;
  }

  return portfolio.filter((item) => (item.category || fallbackPortfolioCategory) === category);
}

function createPortfolioCard(item) {
  const card = createElement('figure', 'portfolio-item reveal');
  const media = createElement('div', 'portfolio-media');
  applyViewerData(media, item, `Open ${getDisplayTitle(item)} full size`);
  media.setAttribute('role', 'button');
  media.setAttribute('tabindex', '0');

  const image = document.createElement('img');
  image.className = 'pimg';
  image.src = getPrimaryImageUrl(item);
  image.alt = item.title ? `${item.title}, ${item.category} photography` : `${item.category} photography`;
  image.loading = 'lazy';
  image.decoding = 'async';
  applyImageFallback(image, item);
  media.append(image);

  const caption = createElement('figcaption', 'portfolio-caption');
  caption.append(createElement('span', 'portfolio-caption-category', item.category));
  if (item.title) {
    caption.append(createElement('span', 'portfolio-caption-title', item.title));
  }

  card.append(media, caption);
  return card;
}

function setPortfolioLayout(container, itemCount) {
  container.classList.remove(...portfolioLayoutClasses);

  if (itemCount <= 0) {
    container.classList.add('portfolio-strip--empty');
  } else if (itemCount === 1) {
    container.classList.add('portfolio-strip--single');
  } else if (itemCount === 2) {
    container.classList.add('portfolio-strip--duo');
  } else {
    container.classList.add('portfolio-strip--grid');
  }
}

function updatePortfolioFeedback({ activeCategory, visibleCount, status, galleryLink }) {
  const noun = visibleCount === 1 ? 'image' : 'images';

  if (activeCategory === portfolioAllCategory) {
    status.textContent = `${visibleCount} ${noun}`;
    galleryLink.href = '/gallery';
    galleryLink.textContent = 'View all work';
    return;
  }

  status.textContent = `${visibleCount} ${activeCategory.toLowerCase()} ${noun}`;
  galleryLink.href = `/gallery?category=${encodeURIComponent(activeCategory)}`;
  galleryLink.textContent = `View ${activeCategory.toLowerCase()} gallery`;
}

function renderHero(portfolio) {
  const container = document.getElementById('hero-stage-media');
  if (!container) {
    return;
  }

  const featuredItem = getHeroPriorityPortfolio(portfolio)[0] || null;
  container.replaceChildren();

  const heroVideoSrc = typeof container.dataset.heroVideoSrc === 'string'
    ? container.dataset.heroVideoSrc.trim()
    : '';
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (heroVideoSrc && !prefersReducedMotion) {
    const video = document.createElement('video');
    video.className = 'hero-video';
    video.src = heroVideoSrc;
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.defaultMuted = true;
    video.preload = 'auto';
    video.disablePictureInPicture = true;
    video.setAttribute('autoplay', '');
    video.setAttribute('muted', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', 'true');
    video.addEventListener(
      'error',
      () => {
        container.replaceChildren();
        if (featuredItem) {
          container.append(createHeroImage(featuredItem));
        }
      },
      { once: true }
    );
    container.append(video);
    keepHeroVideoPlaying(video);
    return;
  }

  if (featuredItem) {
    container.append(createHeroImage(featuredItem));
  }
}

function createHeroImage(item) {
  const image = document.createElement('img');
  image.className = 'hero-photo';
  image.src = getPrimaryImageUrl(item);
  image.alt = '';
  image.loading = 'eager';
  image.decoding = 'async';
  const fallbackImageUrl = getFallbackImageUrl(item);
  image.addEventListener('error', () => {
    if (fallbackImageUrl && image.src !== fallbackImageUrl) {
      image.src = fallbackImageUrl;
      return;
    }

    image.remove();
  });
  return image;
}

function keepHeroVideoPlaying(video) {
  const attemptPlayback = () => {
    if (!video.isConnected || document.hidden) {
      return;
    }

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        console.warn('Hero video playback was interrupted by the browser.');
      });
    }
  };

  ['loadedmetadata', 'canplay'].forEach((eventName) => {
    video.addEventListener(eventName, attemptPlayback, { once: true });
  });

  video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true });
  document.addEventListener('visibilitychange', attemptPlayback);
  window.addEventListener('pageshow', attemptPlayback);

  requestAnimationFrame(attemptPlayback);
}

function getHeroPriorityPortfolio(portfolio) {
  return [...portfolio].sort((left, right) => {
    const leftRank = heroCategoryPriority.get(left.category) ?? 99;
    const rightRank = heroCategoryPriority.get(right.category) ?? 99;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return left.title.localeCompare(right.title);
  });
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
    const item = createElement('li', 'process-step reveal');
    item.append(createElement('span', 'step-num', String(index + 1).padStart(2, '0')));
    item.append(createElement('h3', 'step-name', step.name));
    item.append(createElement('p', 'step-desc', step.description));
    container.append(item);
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

  teamMembers.forEach((member) => {
    const card = createElement('article', 'team-card reveal');
    const media = createElement('div', 'team-media');

    if (member.imageUrl) {
      const image = document.createElement('img');
      image.className = 'team-photo';
      image.src = member.imageUrl;
      image.alt = `${member.name}, ${member.role}`;
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
    content.append(createElement('h3', 'team-name', member.name));
    content.append(createElement('p', 'team-role', member.role));
    content.append(createElement('p', 'team-bio', member.bio));

    card.append(media, content);
    container.append(card);
  });

  refreshRevealObserver();
}

function renderTestimonials(testimonials) {
  const section = document.getElementById('testimonials');
  const container = document.getElementById('testimonials-grid');
  if (!section || !container) {
    return;
  }

  container.replaceChildren();
  section.hidden = !testimonials.length;

  testimonials.forEach((testimonial) => {
    const card = createElement('figure', 'testimonial reveal');
    const quote = createElement('blockquote', 'testimonial-text');
    quote.append(createElement('p', '', `“${stripQuotes(testimonial.text)}”`));

    const meta = createElement('figcaption', 'testimonial-meta');
    meta.append(createElement('span', 'testimonial-author', testimonial.author));
    if (testimonial.role) {
      meta.append(createElement('span', 'testimonial-role', testimonial.role));
    }

    card.append(quote, meta);
    container.append(card);
  });

  refreshRevealObserver();
}

function initializeBookingForm() {
  const form = document.getElementById('booking-form');
  const submitButton = document.getElementById('form-submit');
  const status = document.getElementById('form-status');
  if (!form || !submitButton || !status) {
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const fields = collectBookingFields();
    const clientError = validateBookingFields(fields);
    if (clientError) {
      setFormStatus(status, clientError.message, 'error');
      document.getElementById(clientError.fieldId)?.focus();
      return;
    }

    submitButton.disabled = true;
    const originalLabel = submitButton.textContent;
    submitButton.textContent = 'Sending…';
    setFormStatus(status, '', '');

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
      setFormStatus(status, "Thank you. Your enquiry is with us and we'll reply shortly.", 'success');
    } catch (error) {
      console.error('Enquiry submission failed:', error);
      setFormStatus(status, error.message, 'error');
    } finally {
      submitButton.textContent = originalLabel;
      submitButton.disabled = false;
    }
  });
}

function validateBookingFields(fields) {
  if (!fields.name) {
    return { fieldId: 'f-name', message: 'Please add your name.' };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    return { fieldId: 'f-email', message: 'Please add a valid email address.' };
  }

  return null;
}

function setFormStatus(element, message, tone) {
  element.textContent = message;
  element.dataset.tone = tone;
}

function collectBookingFields() {
  return {
    name: getTrimmedInputValue('f-name'),
    email: getTrimmedInputValue('f-email'),
    service: getTrimmedInputValue('f-service'),
    date: getTrimmedInputValue('f-date'),
    message: getTrimmedInputValue('f-message')
  };
}

function clearBookingForm() {
  bookingFieldIds.forEach((id) => {
    const field = document.getElementById(id);
    if (field) {
      field.value = '';
    }
  });
}

let revealObserver;

function initializeScrollEffects() {
  const header = document.getElementById('site-header');
  const hero = document.getElementById('home');
  if (header) {
    const updateHeader = () => {
      const threshold = hero ? hero.offsetHeight - header.offsetHeight : 20;
      header.classList.toggle('is-solid', window.scrollY > threshold);
    };
    window.addEventListener('scroll', updateHeader, { passive: true });
    window.addEventListener('resize', updateHeader);
    updateHeader();
  }

  document.documentElement.classList.add('js-reveal');
  refreshRevealObserver();
}

function initializeMobileNav() {
  const header = document.getElementById('site-header');
  const toggle = document.getElementById('nav-toggle');
  const panel = document.getElementById('site-nav-panel');
  if (!header || !toggle || !panel) {
    return;
  }

  const label = toggle.querySelector('.nav-toggle-label');
  const setOpen = (isOpen) => {
    header.classList.toggle('nav-open', isOpen);
    document.body.classList.toggle('nav-open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    if (label) {
      label.textContent = isOpen ? 'Close' : 'Menu';
    }
  };

  toggle.addEventListener('click', () => {
    setOpen(!header.classList.contains('nav-open'));
  });

  panel.querySelectorAll('a').forEach((element) => {
    element.addEventListener('click', () => setOpen(false));
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
      setOpen(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && header.classList.contains('nav-open')) {
      setOpen(false);
      toggle.focus();
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
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.reveal:not(.visible)').forEach((element) => {
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
    resetViewerData(element);
    return false;
  }

  element.dataset.viewerTrigger = 'true';
  element.dataset.viewerSrc = primaryImageUrl;
  element.dataset.viewerFallbackSrc = getFallbackImageUrl(item);
  element.dataset.viewerTitle = item.title || item.category;
  element.dataset.viewerCategory = item.title ? item.category : 'Portfolio';
  element.setAttribute('aria-label', ariaLabel);
  return true;
}

function resetViewerData(element) {
  element.removeAttribute('data-viewer-trigger');
  element.removeAttribute('data-viewer-src');
  element.removeAttribute('data-viewer-fallback-src');
  element.removeAttribute('data-viewer-title');
  element.removeAttribute('data-viewer-category');
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

function getDisplayTitle(item) {
  return item.title || `${item.category} photograph`;
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

function getTrimmedInputValue(id) {
  const field = document.getElementById(id);
  return typeof field?.value === 'string' ? field.value.trim() : '';
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

function stripLeadingDash(value) {
  return typeof value === 'string' ? value.replace(/^[\s—–-]+/, '') : value;
}

function stripQuotes(value) {
  return String(value || '').trim().replace(/^["“”]+|["“”]+$/g, '');
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
    .map((item) => normalizePortfolioItem(item))
    .filter(Boolean);
}

function normalizePortfolioItem(item) {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const imageUrl = normalizeImageSource(item.imageUrl) || normalizeImageSource(item.fallbackImageUrl);
  if (!imageUrl) {
    return null;
  }

  const fallbackImageUrl = normalizeImageSource(item.fallbackImageUrl);
  const rawTitle = normalizeText(item.title);
  // Placeholder titles like "." or "-" would look broken in captions, so treat them as untitled.
  const title = /[\p{L}\p{N}]/u.test(rawTitle) ? rawTitle : '';
  const category = normalizeText(item.category) || fallbackPortfolioCategory;

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
