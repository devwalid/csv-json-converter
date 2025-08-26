import React, { useMemo, useState } from 'react'
import Papa from 'papaparse'
import { saveAs } from 'file-saver'
import FileUpload from './components/FileUpload.jsx'
import { validateRow } from './utils/validators.js'

const DEFAULT_SCHEMA = [
  { name: 'name', type: 'string', required: true },
  { name: 'email', type: 'email', required: true },
  { name: 'age', type: 'number', required: false },
]

export default function App() {
  const [file, setFile] = useState(null)
  const [schemaText, setSchemaText] = useState(JSON.stringify(DEFAULT_SCHEMA, null, 2))
  const [rows, setRows] = useState([])
  const [errors, setErrors] = useState([])
  const [headers, setHeaders] = useState([])

  function parseCSV(selectedFile) {
    if (!selectedFile) return
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // We handle coercion ourselves
      complete: (results) => {
        const data = results.data
        setRows(data)
        setHeaders(results.meta?.fields || [])
        setErrors([])
      },
      error: (err) => setErrors([`Parse error: ${err.message}`]),
    })
  }

  function handleFileSelected(f) {
    setFile(f)
    setRows([])
    setErrors([])
    if (f) parseCSV(f)
  }

  function currentSchema() {
    try {
      const parsed = JSON.parse(schemaText)
      if (!Array.isArray(parsed)) throw new Error('Schema must be an array')
      return parsed
    } catch (e) {
      setErrors([`Schema error: ${e.message}`])
      return DEFAULT_SCHEMA
    }
  }

  const validationReport = useMemo(() => {
    if (!rows.length) return []
    const schema = currentSchema()
    return rows.map((row, idx) => ({
      index: idx + 1,
      errors: validateRow(row, schema),
    }))
  }, [rows, schemaText])

  const hasErrors = validationReport.some(r => r.errors.length > 0)

  const errorIndexSet = useMemo(() => {
    const s = new Set()
    for (const r of validationReport) if (r.errors.length > 0) s.add(r.index)
    return s
  }, [validationReport])

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json;charset=utf-8' })
    saveAs(blob, 'converted.json')
  }

  function downloadErrorsCSV() {
    if (!validationReport.length) return
    const lines = ["row,errors"]
    for (const r of validationReport) {
      if (r.errors.length) {
        const msg = r.errors.join(' | ').replaceAll('/n', ' ')
        lines.push(`${r.index},"${msg.replaceAll('"','""')}"`)
      }
    }
    const blob = new Blob([lines.join('/n')], { type: 'text/csv;charset=utf-8' })
    saveAs(blob, 'validation_errors.csv')
  }

  function clearAll() {
    setFile(null)
    setRows([])
    setHeaders([])
    setErrors([])
  }

  return (
    <div className="container">
      <h1>CSV → JSON Converter</h1>
      <p className="success">Upload a CSV, validate against a simple schema, and export as JSON.</p>

      <FileUpload onFileSelected={handleFileSelected} />

      <div className="card">
        <h2>2) Define schema (JSON)</h2>
        <small>Example: [{"{"} "name": "age", "type": "number", "required": false {"}"}]</small>
        <textarea rows={10} className="code" value={schemaText} onChange={(e)=>setSchemaText(e.target.value)} />
      </div>

      <div className="card">
        <h2>3) Preview</h2>
        {headers.length ? (
          <div style={{overflowX:'auto'}}>
            <table className="table">
              <thead>
                <tr>
                  {headers.map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((row, i) => {
                  const rowIndex = i + 1
                  const rowClass = errorIndexSet.has(rowIndex) ? 'row-error' : ''
                  return (
                    <tr key={i} className={rowClass}>
                      {headers.map(h => <td key={h}>{String(row[h] ?? '')}</td>)}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <small>Showing first 10 of {rows.length} rows.</small>
          </div>
        ) : <small>No data parsed yet.</small>}
      </div>

      <div className="card">
        <h2>4) Validation Report</h2>
        {rows.length === 0 && <small>Upload a CSV to see validation results.</small>}
        {rows.length > 0 && (
          <div>
            <p>
              Rows: <span className="badge">{rows.length}</span> &nbsp;|&nbsp;
              Headers: <span className="badge">{headers.length}</span> &nbsp;|&nbsp;
              Errors present: {hasErrors ? <span className="err">Yes</span> : <span className="success">No</span>}
            </p>
            <ul>
              {validationReport.map(r => (
                r.errors.length > 0 ? (
                  <li key={r.index} className="err">
                    Row {r.index}: {r.errors.join('; ')}
                  </li>
                ) : null
              ))}
            </ul>
            {!hasErrors && rows.length > 0 && (
              <button className="primary" onClick={downloadJSON}>Download JSON</button>
            )}
            {hasErrors && <small className="err">Fix your CSV or adjust the schema, then re-upload.</small>}
            <div className="row" style={{marginTop:8}}>
            <button className="ghost" onClick={clearAll}>Clear</button>
            {!hasErrors && rows.length > 0 && (
              <button className="primary" onClick={downloadJSON}>Download JSON</button>
            )}
            {hasErrors && (
              <button onClick={downloadErrorsCSV}>Download Errors (CSV)</button>
            )}
          </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Sample CSV (copy/paste into a file)</h2>
        <pre className='code'>{`name,email,age,Alice,alice@example.com,30,Bob.bob[at]example.com,thirty`}</pre>
        <small>In this sample: Row 2 has invalid email; Row 3 has invalid email and non-numeric age.</small>
      </div>

      <footer>
        Built for Walid — CSV → JSON Converter demo.
      </footer>
    </div>
  )
}
