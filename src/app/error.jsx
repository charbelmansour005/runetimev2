'use client';

// If something fails badly, offer a reload instead of a blank page.
export default function Error() {
  return (
    <div className="crashed" role="alert">
      <p>Something went wrong while loading this page.</p>
      <a href="">Reload</a>
    </div>
  );
}
