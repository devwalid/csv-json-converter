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

export function coerceType(value, type) {
  if (type === 'number') return value === '' ? null : Number(value)
  if (type === 'string') return value === null || value === undefined ? '' : String(value)
  return value
}

// Given a row object and schema (array of {name, type, required:bool})
export function validateRow(row, schema) {
  const errors = []
  for (const field of schema) {
    const raw = row[field.name]
    // Missing header or value
    if (!(field.name in row)) {
      errors.push(`Missing column: ${field.name}`)
      continue
    }
    const val = coerceType(raw, field.type)
    if (field.required && !required(val)) {
      errors.push(`Field "${field.name}" is required`)
    }
    if (field.type === 'number' && val !== null && !isNumber(val)) {
      errors.push(`Field "${field.name}" must be a number`)
    }
    if (field.type === 'email' && !isEmail(val)) {
      errors.push(`Field "${field.name}" must be a valid email`)
    }
  }
  return errors
}
