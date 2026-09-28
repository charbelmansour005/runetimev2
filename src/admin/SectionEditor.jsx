import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { FieldList } from './fields';
import { describePath } from './schema';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export default function SectionEditor({ section, initial, onSaved, onDirtyChange, notify }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState(null);
  const dirty = useMemo(() => !same(value, saved), [value, saved]);

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const save = useCallback(async () => {
    setSaving(true);
    setProblem(null);
    try {
      const { data } = await api.saveSection(section.key, value);
      setSaved(data);
      setValue(data);
      onSaved(section.key, data);
      notify('Saved — the live site updates within a few seconds.');
    } catch (err) {
      // API paths look like "hero.slides.1.tabTitle"; drop the section prefix.
      const fields = err.fields
        ? Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k.replace(`${section.key}.`, ''), v]))
        : null;
      setProblem({ message: err.message, fields });
      notify('Couldn’t save — check the highlighted fields.', 'error');
    } finally {
      setSaving(false);
    }
  }, [section.key, value, onSaved, notify]);

  const discard = () => {
    setValue(saved);
    setProblem(null);
  };

  // Cmd/Ctrl + S saves.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirty && !saving) save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty, saving, save]);

  return (
    <div className="cms-editor">
      <header className="cms-page-head">
        <div>
          <p className="cms-eyebrow">{section.group}</p>
          <h1>{section.label}</h1>
          <p className="cms-page-desc">{section.description}</p>
        </div>
        <div className="cms-page-actions">
          <span className={`cms-state${dirty ? ' is-dirty' : ''}`}>{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
          <button type="button" className="cms-btn" disabled={!dirty || saving} onClick={discard}>
            Discard
          </button>
          <button type="button" className="cms-btn cms-btn--primary" disabled={!dirty || saving} onClick={save}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </header>

      {problem && (
        <div className="cms-alert" role="alert">
          <strong>{problem.message}</strong>
          {problem.fields && (
            <ul>
              {Object.entries(problem.fields).map(([path, message]) => (
                <li key={path}>
                  <b>{describePath(section.fields, path.split('.')) || path}:</b> {message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="cms-card">
        <FieldList fields={section.fields} value={value} onChange={setValue} errors={problem?.fields} />
      </div>
    </div>
  );
}
