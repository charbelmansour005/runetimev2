// A title whose words light up one after another as it scrolls into view
// (the styles are in global.css, under "Scroll motion"). Where the browser
// can't tie animations to scrolling, or motion is turned down, it's just text.
export default function LitText({ text }) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  return (
    <span className="lit">
      {words.map((word, i) => (
        <span key={i} className="lit__w" style={{ '--i': i }}>
          {word}
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  );
}
