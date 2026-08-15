export const TERMINAL_OPTIONS = [
  'TIPER', 'GAPCO', 'ORYX', 'OILCOM', 'MOIL', 'KALAHARI',
  'WORLD OIL T1', 'WORLD OIL T2', 'LAKE OIL', 'MERU', 'AFROIL',
  'VIVO', 'HASS', 'GBP', 'SSF', 'CAMEL OIL', 'SAHARA', 'PUMA',
  'TOTAL', 'ENGEN', 'Other (type below)',
];

export const PRODUCT_OPTIONS = [
  'GASOLINE (PMS)',
  'GASOIL (AGO)',
  'JET A1',
];

/**
 * Reusable dropdown + optional custom input for terminal name.
 * Usage:
 *   <TerminalSelect value={val} onChange={setVal} inputCls={inputCls} />
 */
export const TerminalSelect = ({ value, onChange, inputCls, name = 'terminal' }) => {
  const isOther = value && !TERMINAL_OPTIONS.slice(0, -1).includes(value);
  const selectVal = isOther ? 'Other (type below)' : value;

  return (
    <>
      <select
        name={name}
        value={selectVal}
        onChange={e => {
          if (e.target.value !== 'Other (type below)') onChange(e.target.value);
          else onChange('');
        }}
        className={inputCls}
      >
        <option value="">-- Select Terminal --</option>
        {TERMINAL_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      {(selectVal === 'Other (type below)' || isOther) && (
        <input
          type="text"
          value={isOther ? value : ''}
          onChange={e => onChange(e.target.value)}
          placeholder="Type terminal name"
          className={`${inputCls} mt-1.5 border-amber-400`}
          autoFocus
        />
      )}
    </>
  );
};

/**
 * Reusable product dropdown.
 */
export const ProductSelect = ({ value, onChange, inputCls, name = 'product_name', required = false }) => (
  <select
    name={name}
    value={value}
    onChange={e => onChange(e.target.value)}
    required={required}
    className={inputCls}
  >
    <option value="">-- Select Product --</option>
    {PRODUCT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
  </select>
);
