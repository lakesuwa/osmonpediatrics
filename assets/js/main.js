function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getDirectusConfig() {
  const fromWindow = window.OSMON_DIRECTUS_CONFIG || {};
  const localhostDefault = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8055'
    : '';

  const rawBaseUrl = (fromWindow.url || document.body.dataset.directusUrl || localhostDefault || '').trim();
  const rawCollectionValue = (fromWindow.collection || document.body.dataset.directusCollection || 'blog_posts').trim();
  const collections = rawCollectionValue
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);

  return {
    baseUrl: rawBaseUrl.replace(/\/+$/, ''),
    collection: collections[0] || 'blog_posts',
    collections: collections.length ? collections : ['blog_posts'],
    token: (fromWindow.token || document.body.dataset.directusToken || '').trim()
  };
}

function resolveTopic(topicValue) {
  const raw = String(topicValue || '').trim();
  const key = slugify(raw);

  if (key.indexOf('speech') !== -1) return { key: 'speech', label: raw || 'Speech Therapy', className: 'tag--speech' };
  if (key.indexOf('language') !== -1) return { key: 'language', label: raw || 'Language', className: 'tag--language' };
  if (key.indexOf('occupational') !== -1 || key === 'ot') return { key: 'ot', label: raw || 'Occupational Therapy', className: 'tag--ot' };
  if (key.indexOf('feeding') !== -1) return { key: 'feeding', label: raw || 'Feeding', className: 'tag--feeding' };
  if (key.indexOf('parent') !== -1) return { key: 'parent', label: raw || 'Parent Tips', className: 'tag--parent' };
  if (key.indexOf('early') !== -1) return { key: 'early', label: raw || 'Early Intervention', className: 'tag--early' };

  return { key: key || 'all', label: raw || 'General', className: 'tag--parent' };
}

function extractAssetId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.id) return String(value.id);
  return '';
}

function toDateValue(value) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value) {
  const dateValue = toDateValue(value);
  if (!dateValue) return '';
  return new Date(dateValue).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function buildMetaText(post) {
  const bits = [];
  const dateText = formatDate(post.publishedAt);
  if (dateText) bits.push(dateText);
  if (post.readTimeMinutes > 0) bits.push(post.readTimeMinutes + ' min read');
  return bits.join(' · ');
}

function estimateReadTimeMinutes(content) {
  const plainText = String(content || '').replace(/<[^>]*>/g, ' ').trim();
  if (!plainText) return 0;
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / 200));
}

function isPublishedPost(item) {
  if (typeof item.published === 'boolean') return item.published;
  if (typeof item.status === 'string') {
    const status = item.status.toLowerCase();
    return status === 'published' || status === 'live';
  }
  return true;
}

function normalizePost(item) {
  const title = String(item.title || item.name || '').trim();
  const topic = resolveTopic(item.topic || item.category || item.tag);
  const bodyHtml = String(item.body || item.content || '').trim();
  const readTime = Number(item.read_time_minutes || item.read_time || item.read_minutes || 0);
  const publishedAt = item.published_at || item.publishedAt || item.date_published || item.date_created || item.created_at;
  const slug = slugify(item.slug || title || item.id);
  const excerpt = String(item.excerpt || item.summary || item.description || '').trim();

  return {
    id: item.id,
    slug: slug || String(item.id || ''),
    title: title || 'Untitled Post',
    excerpt,
    topic,
    featuredImageId: extractAssetId(item.featured_image || item.featuredImage || item.image),
    publishedAt,
    publishedDateValue: toDateValue(publishedAt),
    readTimeMinutes: Number.isFinite(readTime) && readTime > 0 ? Math.round(readTime) : estimateReadTimeMinutes(bodyHtml || excerpt),
    authorName: String(item.author_name || item.author || '').trim(),
    bodyHtml,
    metaDescription: String(item.meta_description || excerpt || '').trim(),
    isPublished: isPublishedPost(item)
  };
}

async function fetchDirectusPosts(config) {
  if (!config.baseUrl) return [];

  const headers = { Accept: 'application/json' };
  if (config.token) {
    headers.Authorization = 'Bearer ' + config.token;
  }

  let lastError = null;

  for (const collectionName of config.collections) {
    const endpoint = config.baseUrl
      + '/items/' + encodeURIComponent(collectionName)
      + '?limit=100&sort=-id&fields=*';

    const response = await fetch(endpoint, { headers });

    if (!response.ok) {
      if (response.status === 403 || response.status === 404) {
        lastError = new Error('Collection "' + collectionName + '" is unavailable to the public API (' + response.status + ').');
        continue;
      }
      throw new Error('Directus request failed with status ' + response.status + ' for "' + collectionName + '".');
    }

    const payload = await response.json();
    const items = Array.isArray(payload.data) ? payload.data : [];

    return items
      .map(normalizePost)
      .filter(post => post.isPublished)
      .sort((a, b) => b.publishedDateValue - a.publishedDateValue);
  }

  throw lastError || new Error('No readable blog collection was found in Directus.');
}

function buildAssetUrl(baseUrl, assetId) {
  if (!assetId) return '';
  return baseUrl + '/assets/' + encodeURIComponent(assetId);
}

function createBlogCard(post, baseUrl) {
  const card = document.createElement('a');
  card.className = 'blog-card';
  card.href = 'blog.html?slug=' + encodeURIComponent(post.slug);
  card.dataset.topic = post.topic.key;

  const image = document.createElement('div');
  image.className = 'blog-card__img';
  const imageUrl = buildAssetUrl(baseUrl, post.featuredImageId);
  if (imageUrl) {
    image.style.backgroundImage = "url('" + imageUrl + "')";
  } else {
    image.classList.add('blog-card__img--placeholder');
  }
  card.appendChild(image);

  const body = document.createElement('div');
  body.className = 'blog-card__body';

  const tag = document.createElement('span');
  tag.className = 'tag ' + post.topic.className;
  tag.textContent = post.topic.label;
  body.appendChild(tag);

  const title = document.createElement('h3');
  title.textContent = post.title;
  body.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'blog-meta';
  meta.textContent = buildMetaText(post);
  body.appendChild(meta);

  card.appendChild(body);
  return card;
}

function renderBlogCards(container, posts, baseUrl) {
  container.innerHTML = '';
  posts.forEach(post => container.appendChild(createBlogCard(post, baseUrl)));
}

function renderIntegrationWarning(container, message) {
  if (!container) return;

  const warning = document.createElement('div');
  warning.className = 'blog-sync-warning';
  warning.textContent = message;
  container.prepend(warning);
}

function getRequestedSlug() {
  const params = new URLSearchParams(window.location.search);
  return slugify(params.get('slug'));
}

function applyCurrentFilter() {
  const activePill = document.querySelector('.pill[data-filter].active');
  const activeFilter = activePill ? activePill.dataset.filter : 'all';
  const cards = document.querySelectorAll('.blog-card[data-topic]');

  cards.forEach(card => {
    card.style.display = (activeFilter === 'all' || card.dataset.topic === activeFilter) ? '' : 'none';
  });
}

function initializeBlogFiltering() {
  const filterPills = document.querySelectorAll('.pill[data-filter]');
  if (!filterPills.length) return;

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      applyCurrentFilter();
    });
  });

  applyCurrentFilter();
}

function renderBlogDetailPage(posts, slug, baseUrl) {
  if (!slug) return;
  const post = posts.find(entry => entry.slug === slug);
  if (!post) return;

  const hero = document.querySelector('.blog-hero');
  if (hero) {
    const background = hero.querySelector('.blog-hero__bg');
    const imageUrl = buildAssetUrl(baseUrl, post.featuredImageId);
    if (background && imageUrl) {
      background.style.backgroundImage = "url('" + imageUrl + "')";
    }

    const breadcrumb = hero.querySelector('.blog-breadcrumb');
    if (breadcrumb) {
      breadcrumb.innerHTML = '<a href="resources.html">Resources</a> &rsaquo; ' + escapeHtml(post.topic.label);
    }

    const heading = hero.querySelector('h1');
    if (heading) heading.textContent = post.title;

    const excerpt = hero.querySelector('.blog-hero__meta');
    if (excerpt) excerpt.textContent = post.excerpt || 'Insights and guidance from the Osmon Pediatric team.';

    const date = hero.querySelector('.blog-hero__date');
    if (date) date.textContent = formatDate(post.publishedAt);

    const author = hero.querySelector('.blog-hero__author');
    if (author) {
      author.innerHTML = post.authorName
        ? 'Written by <strong>' + escapeHtml(post.authorName) + '</strong>'
        : 'Written by <strong>Osmon Pediatric Team</strong>';
    }
  }

  const postBodyWrap = document.querySelector('.post-body .wrap');
  if (postBodyWrap) {
    const bodyContent = post.bodyHtml || '<p>' + escapeHtml(post.excerpt || 'Content coming soon.') + '</p>';
    postBodyWrap.innerHTML = '<article class="post-block"><div class="post-rich-text">' + bodyContent + '</div></article>';
  }

  const relatedGrid = document.querySelector('.more-articles .blog-grid');
  if (relatedGrid) {
    const relatedPosts = posts.filter(entry => entry.slug !== slug).slice(0, 6);
    renderBlogCards(relatedGrid, relatedPosts, baseUrl);
  }

  document.title = post.title + ' | Osmon Pediatric Therapy & Wellness';
  const descriptionTag = document.querySelector('meta[name="description"]');
  if (descriptionTag) {
    descriptionTag.setAttribute('content', post.metaDescription || post.excerpt || descriptionTag.getAttribute('content') || '');
  }
}

async function hydrateBlogContentFromDirectus() {
  const resourcesGrid = document.querySelector('#resources-blog-grid');
  const homeGrid = document.querySelector('#home-blog-grid');
  const isBlogDetailPage = document.body.dataset.page === 'blog-detail';

  if (!resourcesGrid && !homeGrid && !isBlogDetailPage) return;

  const config = getDirectusConfig();
  if (!config.baseUrl) return;

  try {
    const posts = await fetchDirectusPosts(config);
    if (!posts.length) return;

    if (resourcesGrid) {
      renderBlogCards(resourcesGrid, posts, config.baseUrl);
      applyCurrentFilter();
    }

    if (homeGrid) {
      renderBlogCards(homeGrid, posts.slice(0, 3), config.baseUrl);
    }

    if (isBlogDetailPage) {
      renderBlogDetailPage(posts, getRequestedSlug(), config.baseUrl);
    }
  } catch (error) {
    console.error('Unable to load blog posts from Directus. Falling back to static content.', error);
    const warningText = 'Live blog posts are unavailable right now. Showing fallback content.';
    renderIntegrationWarning(resourcesGrid, warningText);
    renderIntegrationWarning(homeGrid, warningText);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
  }

  initializeBlogFiltering();
  hydrateBlogContentFromDirectus();

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
