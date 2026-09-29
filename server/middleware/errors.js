import mongoose from 'mongoose';

export function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof mongoose.Error.ValidationError) {
    const fields = Object.fromEntries(Object.entries(err.errors).map(([path, e]) => [path, e.message]));
    return res.status(400).json({ error: 'Some fields need attention.', fields });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: `Invalid value for ${err.path}.` });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'The request body is not valid JSON.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'That file is too large — keep uploads under 4 MB.' });

  console.error(err);
  return res.status(500).json({ error: 'Something went wrong on our side.' });
}
