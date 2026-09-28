import { useEffect, useId, useState } from 'react';
import { IconCopy, IconDown, IconPlus, IconTrash, IconUp } from './icons';

// Renders form controls from the field definitions in schema.jsx. Values are
// plain objects; `path` locates each field for matching API errors.

const pathKey = (path) => path.join('.');
const hasErrorsUnder = (errors, path) => {
  if (!errors) return false;
  const prefix = pathKey(path);
  return Object.keys(errors).some((key) => key === prefix || key.startsWith(`${prefix}.`));
};

const move = (list, index, delta) => {
  const next = [...list];
  [next[index], next[index + delta]] = [next[index + delta], next[index]];
  return next;
};

function IconButton({ label, danger, children, ...props }) {
  return (
    <button type="button" className={`cms-icon-btn${danger ? ' is-danger' : ''}`} aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}

// ---------- Simple controls ----------

function TextControl({ id, field, value, onChange }) {
  return (
    <input
      id={id}
      className="cms-input"
      type={field.inputType ?? 'text'}
      value={value ?? ''}
      maxLength={field.max}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function TextareaControl({ id, field, value, onChange }) {
  return (
    <textarea
      id={id}
      className="cms-input"
      rows={field.rows ?? 3}
      value={value ?? ''}
      maxLength={field.max}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

const toPickerHex = (value) => {
  const v = String(value ?? '').trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(v)) return `#${[...v.slice(1)].map((c) => c + c).join('')}`.toLowerCase();
  return '#000000';
};

function ColorControl({ id, value, onChange }) {
  return (
    <div className="cms-color">
      <input
        type="color"
        className="cms-color__picker"
        value={toPickerHex(value)}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        aria-label="Pick a colour"
      />
      <input
        id={id}
        className="cms-input cms-color__hex"
        value={value ?? ''}
        maxLength={7}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function SelectControl({ id, field, value, onChange }) {
  return (
    <select id={id} className="cms-input cms-select" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      {field.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function DateControl({ id, value, onChange }) {
  return <input id={id} className="cms-input" type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
}

function TagsControl({ id, field, value = [], onChange }) {
  return (
    <div className="cms-tags" role="group" id={id}>
      {field.options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            className={`cms-tag${on ? ' is-on' : ''}`}
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Lists of strings ----------

function LinesControl({ id, field, value = [], onChange }) {
  const Input = field.multiline ? 'textarea' : 'input';
  const full = field.maxItems && value.length >= field.maxItems;
  return (
    <div className="cms-lines">
      {value.map((line, i) => (
        <div className="cms-line" key={i}>
          <Input
            id={i === 0 ? id : undefined}
            className="cms-input"
            value={line}
            maxLength={field.maxLength}
            rows={field.multiline ? 4 : undefined}
            aria-label={`${field.label} ${i + 1}`}
            onChange={(e) => onChange(value.map((v, j) => (j === i ? e.target.value : v)))}
          />
          <div className="cms-line__actions">
            <IconButton label="Move up" disabled={i === 0} onClick={() => onChange(move(value, i, -1))}>
              <IconUp />
            </IconButton>
            <IconButton label="Move down" disabled={i === value.length - 1} onClick={() => onChange(move(value, i, 1))}>
              <IconDown />
            </IconButton>
            <IconButton
              label="Remove"
              danger
              disabled={value.length <= (field.minItems ?? 0)}
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              <IconTrash />
            </IconButton>
          </div>
        </div>
      ))}
      <button type="button" className="cms-add" disabled={full} onClick={() => onChange([...value, ''])}>
        <IconPlus /> {field.addLabel ?? 'Add'}
      </button>
    </div>
  );
}

// ---------- Nested object ----------

function GroupControl({ field, value, onChange, errors, path }) {
  return (
    <fieldset className="cms-group">
      <legend>{field.label}</legend>
      {field.help && <p className="cms-help cms-group__help">{field.help}</p>}
      <FieldList fields={field.fields} value={value ?? {}} onChange={onChange} errors={errors} path={path} />
    </fieldset>
  );
}

// ---------- List of objects ----------

let keySeq = 0;
const newKey = () => `new-${Date.now().toString(36)}-${(keySeq += 1)}`;
const keyOf = (item, index) => item._id ?? item.__key ?? `index-${index}`;

function ListControl({ field, value = [], onChange, errors, path }) {
  const [open, setOpen] = useState(() => new Set());
  const full = field.maxItems && value.length >= field.maxItems;

  // Open any item the API flagged, so the problem is visible.
  useEffect(() => {
    if (!errors) return;
    const flagged = value.filter((item, i) => hasErrorsUnder(errors, [...path, i])).map(keyOf);
    if (flagged.length) setOpen((prev) => new Set([...prev, ...flagged]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errors]);

  const toggle = (key) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const insert = (item, at) => {
    const next = [...value];
    next.splice(at, 0, item);
    onChange(next);
    setOpen((prev) => new Set(prev).add(item.__key));
  };

  const add = () => insert({ ...field.newItem(), __key: newKey() }, value.length);

  const duplicate = (i) => {
    // eslint-disable-next-line no-unused-vars
    const { _id, __key, ...copy } = structuredClone(value[i]);
    insert({ ...copy, __key: newKey() }, i + 1);
  };

  const remove = (i) => {
    const name = field.summary(value[i]) || `this ${field.itemLabel}`;
    if (window.confirm(`Remove “${name}”? You can still discard changes before saving.`)) {
      onChange(value.filter((_, j) => j !== i));
    }
  };

  return (
    <section className="cms-list">
      <header className="cms-list__head">
        <h3>{field.label}</h3>
        <span className="cms-list__count">
          {value.length}
          {field.maxItems ? ` / ${field.maxItems}` : ''}
        </span>
      </header>
      {field.help && <p className="cms-help">{field.help}</p>}

      {value.length > 0 && (
        <ol className="cms-list__items">
          {value.map((item, i) => {
            const key = keyOf(item, i);
            const isOpen = open.has(key);
            return (
              <li
                key={key}
                className={`cms-item${isOpen ? ' is-open' : ''}${hasErrorsUnder(errors, [...path, i]) ? ' has-error' : ''}`}
              >
                <div className="cms-item__head">
                  <button type="button" className="cms-item__toggle" aria-expanded={isOpen} onClick={() => toggle(key)}>
                    <span className="cms-item__index">{i + 1}</span>
                    {field.preview?.(item)}
                    <span className="cms-item__summary">{field.summary(item) || `Untitled ${field.itemLabel}`}</span>
                    <IconDown className="cms-item__chev" />
                  </button>
                  <div className="cms-item__actions">
                    <IconButton label="Move up" disabled={i === 0} onClick={() => onChange(move(value, i, -1))}>
                      <IconUp />
                    </IconButton>
                    <IconButton label="Move down" disabled={i === value.length - 1} onClick={() => onChange(move(value, i, 1))}>
                      <IconDown />
                    </IconButton>
                    <IconButton label="Duplicate" disabled={full} onClick={() => duplicate(i)}>
                      <IconCopy />
                    </IconButton>
                    <IconButton label="Remove" danger disabled={value.length <= (field.minItems ?? 0)} onClick={() => remove(i)}>
                      <IconTrash />
                    </IconButton>
                  </div>
                </div>
                {isOpen && (
                  <div className="cms-item__body">
                    <FieldList
                      fields={field.fields}
                      value={item}
                      onChange={(next) => onChange(value.map((v, j) => (j === i ? next : v)))}
                      errors={errors}
                      path={[...path, i]}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <button type="button" className="cms-add" disabled={full} onClick={add}>
        <IconPlus /> Add {field.itemLabel}
      </button>
    </section>
  );
}

// ---------- Field wrapper ----------

const CONTROLS = {
  text: TextControl,
  textarea: TextareaControl,
  color: ColorControl,
  select: SelectControl,
  date: DateControl,
  tags: TagsControl,
  lines: LinesControl,
  group: GroupControl,
  list: ListControl,
};

const BLOCK_TYPES = new Set(['group', 'list']);

function Field({ field, value, onChange, errors, path }) {
  const id = useId();
  const Control = CONTROLS[field.type];
  const error = errors?.[pathKey(path)];
  const length = typeof value === 'string' ? value.length : 0;

  if (BLOCK_TYPES.has(field.type)) {
    return (
      <div className="cms-field cms-field--full">
        <Control id={id} field={field} value={value} onChange={onChange} errors={errors} path={path} />
        {error && <p className="cms-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className={`cms-field cms-field--${field.width ?? 'full'}${error ? ' has-error' : ''}`}>
      <label className="cms-label" htmlFor={id}>
        <span>{field.label}</span>
        {field.max && ['text', 'textarea'].includes(field.type) && (
          <span className={`cms-count${length > field.max * 0.9 ? ' is-near' : ''}`}>
            {length}/{field.max}
          </span>
        )}
      </label>
      <Control id={id} field={field} value={value} onChange={onChange} errors={errors} path={path} />
      {error && <p className="cms-error">{error}</p>}
      {field.help && <p className="cms-help">{field.help}</p>}
    </div>
  );
}

export function FieldList({ fields, value, onChange, errors, path = [] }) {
  return (
    <div className="cms-fields">
      {fields.map((field) => (
        <Field
          key={field.name}
          field={field}
          value={value?.[field.name]}
          onChange={(next) => onChange({ ...value, [field.name]: next })}
          errors={errors}
          path={[...path, field.name]}
        />
      ))}
    </div>
  );
}
