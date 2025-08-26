// Simple validators for demo purposes.
export function required(value) {
  return value !== undefined && value !== null && String(value).trim() !== ''
}

export function isNumber(value) {
  if (value === '' || value === null || value === undefined) return false
  return !isNaN(Number(value))
}

export function isEmail(value) {
  if (!required(value)) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).toLowerCase())
}

export function isBoolean(value) {
  if (typeof value === 'boolean') return true
  const v = String(value).toLocaleLowerCase().trim()
  return v === 'true' || v === 'false' || v === '0' || v === '1'
}

export function toBoolean(value) {
  const v = String(value).toLocaleLowerCase().trim()
  return v === 'true' || v === '1'
}

export function stripCurrency(value) {
  return String(value).replace(/[$€£, ]/g, '')
}

export function isCurrency(value) {
  if (!required(value)) return false
  const n = Number(stripCurrency(value))
  return Number.isFinite(n)
}

export function isDate(value) {
  if (!required(value)) return false

  const ts = Date.parse(String(value))
  return !Number.isNaN(ts)
}

export function coerceType(value, type) {
  if (type === 'number') return value === '' ? null : Number(value)
  if (type === 'currency') return value === '' ? null : Number(stripCurrency(value))
  if (type === 'boolean') return toBoolean(value)
  if (type === 'date') return String(value)
  if (type === 'email') return String(value)
  if (type === 'string') return value === null || value === undefined ? '' : String(value)
  return value
}

// Given a row object and schema (array of {name, type, required:bool})
export function validateRow(row, schema) {
  const errors = []
  for (const field of schema) {
    if (!(field.name in row)) {
      errors.push(`Missing column: ${field.name}`)
      continue
    }
    const raw = row[field.name]
    const val = coerceType(raw, field.type)

    if (field.required && !required(val)) {
      errors.push(`Field "${field.name}" is required`)
    }

    if (field.type === 'number' && required(raw) && !isNumber(raw)) {
      errors.push(`Field "${field.name}" must be a number`)
    }
    if (field.type === 'currency' && required(raw) && !isCurrency(raw)) {
      errors.push(`Field "${field.name}" must be currency/number`)
    }
    if (field.type === 'email' && required(raw) && !isEmail(raw)) {
      errors.push(`Field "${field.name}" must be a valid email`)
    }
    if (field.type === 'boolean' && required(raw) && !isBoolean(raw)) {
      errors.push(`Field "${field.name}" must be boolean (true/false/1/0)`)
    }
    if (field.type === 'date' && required(raw) && !isDate(raw)) {
      errors.push(`Field "${field.name}" must be a valid date`)
    }
  }
  return errors
}
