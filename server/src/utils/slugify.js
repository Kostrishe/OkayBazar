export function slugify(input = '') {
  return input
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // удалить диакритику
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .toLowerCase();
}
