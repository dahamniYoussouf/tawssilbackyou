export const slugify = (value = '') => {
  if (!value) return '';
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const normalizeCategoryList = (categories = []) => {
  if (!Array.isArray(categories)) return [];
  const normalized = categories
    .map((category) => slugify(category))
    .filter((category) => category.length > 0);
  return [...new Set(normalized)];
};
