import { fail } from '../../../../server/http.js';

// Any other /api path: JSON, not the site's 404 page.
const notFound = () => fail(404, 'Not found');
export { notFound as GET, notFound as POST, notFound as PUT, notFound as PATCH, notFound as DELETE };
