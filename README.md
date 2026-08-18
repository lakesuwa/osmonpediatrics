# osmonpediatrics

## Directus Blog Integration

The website already hydrates blog cards and blog detail content from Directus via `assets/js/main.js`.

### 1. Configure collection name in HTML

The pages use `data-directus-url` and `data-directus-collection` on `<body>`.

Example:

```html
<body data-directus-url="http://localhost:8055" data-directus-collection="blog_posts">
```

You can provide multiple fallback collections:

```html
<body data-directus-url="http://localhost:8055" data-directus-collection="blog_posts,blogs,posts">
```

### 2. Create/verify collection in Directus

Create a collection named `blog_posts` (or update the HTML value to match your actual name).

Recommended fields used by the frontend:

- `title` (string)
- `slug` (string, unique)
- `excerpt` (text)
- `body` (rich text / text)
- `topic` (string)
- `featured_image` (file)
- `author_name` (string)
- `published_at` (datetime)
- `status` (string: published/draft)
- `meta_description` (text)

### 3. Enable public read permission (required)

If you get `403` when loading `http://localhost:8055/items/blog_posts`, enable read access for the Public role:

1. Open Directus Admin.
2. Go to `Settings -> Access Policies`.
3. Edit the Public policy/role.
4. Grant `Read` permission on your blog collection.
5. Allow needed fields (or all fields during setup).

Without this, the website cannot render posts from the browser.

### 4. Publish your posts

Set each post status to `published` (or `live`), otherwise it will be filtered out by the frontend.

### 5. Where it renders

- Homepage blog cards: `index.html` (`#home-blog-grid`)
- Resources blog list: `resources.html` (`#resources-blog-grid`)
- Blog detail page: `blog.html?slug=your-post-slug`