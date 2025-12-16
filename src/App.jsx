import React, { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import { saveAs } from 'file-saver'
import FileUpload from './components/FileUpload.jsx'
import { required, validateRow } from './utils/validators.js'
import SchemaBuilder from './components/SchemaBuilder.jsx'

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
  const [selectedCols, setSelectedCols] = useState([])
  const [headerOrder, setHeaderOrder] = useState([])
  const [dragCol, setDragCol] = useState(null)

  function detectDelimiter(sample = '') {
    const line = (sample.split(/\r?\n/).find(l => l.trim()) || '')
    const candidates = [',', ';', '\t', '|']
    const scores = candidates.map(d => ({
      delim: d,
      count: (line.match(new RegExp(`\\${d}`, 'g')) || []).length
    }))
    const best = scores.sort((a, b) => b.count - a.count)[0]
    return best && best.count > 0 ? best.delim : '' // '' lets Papa auto-detect
  }

  function looksBinary(textSample = '') {
    return /\u0000/.test(textSample)
  }

  async function parseCSV(selectedFile) {
    if (!selectedFile) return

    try {
      const sample = await selectedFile.slice(0, 4096).text()
      if (looksBinary(sample)) {
        setErrors([`"${selectedFile.name}" does not look like a text/CSV file.`])
        return
      }

      const delimiter = detectDelimiter(sample.replace(/^\uFEFF/, ''))

      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: 'greedy',
        delimiter,
        dynamicTyping: false, // We handle coercion ourselves
        complete: (results) => {
          const data = results.data
          const fields = results.meta?.fields || []
          const parseErrors = results.errors?.length
            ? results.errors.map(e => `Parse error (row ${e.row ?? '?'}): ${e.message}`)
            : []

          setRows(data)
          setHeaders(fields)
          setHeaderOrder(fields)
          setSelectedCols(fields)
          setErrors(parseErrors)
        },
        error: (err) => setErrors([`Parse error: ${err.message}`]),
      })
    } catch (err) {
      setErrors([`Failed to read file: ${err.message}`])
    }
  }

  const orderedHeaders = useMemo(() => {
    const known = headerOrder.filter(h => headers.includes(h)) 
    const extras = headers.filter(h => !headerOrder.includes(h))
    return [...known, ...extras]
  }, [headers, headerOrder])

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

  const parsedSchema = useMemo(() => {
    try {
      const p = JSON.parse(schemaText)
      return Array.isArray(p) ? p : [] 
    } catch {
      return []
    }
  }, [schemaText])

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

  const columnErrorCount = useMemo(() => {
    const counts = {}
    headers.forEach(h => { counts[h] = 0 })
    if (!rows.length || !parsedSchema.length) return counts

    for (const row of rows) {
      for (const h of headers) {
        if (cellHasError(row, parsedSchema, h)) {
          counts[h] = (counts[h] || 0) + 1
        }
      }
    }
    return counts
  }, [rows, headers, parsedSchema])

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json;charset=utf-8' })
    saveAs(blob, 'converted.json')
  }

  function pickColumns(data, keep) {
    const cols = (keep && keep.length ? keep : orderedHeaders)
    return data.map(row => {
      const o = {}
      for (const k of cols) o[k] = row[k]
      return o
    })
  }

  function downloadJSONSelected() {
    const filtered = pickColumns(rows, selectedCols)
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json;charset=utf-8' })
    saveAs(blob, 'converted_selected.json')
  }

  function downloadErrorsCSV() {
    if (!validationReport.length) return
    const lines = ["row,errors"]
    for (const r of validationReport) {
      if (r.errors.length) {
        const msg = r.errors.join(' | ').replaceAll('\n', ' ')
        lines.push(`${r.index},"${msg.replaceAll('"','""')}"`)
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    saveAs(blob, 'validation_errors.csv')
  }

  function clearAll() {
    setFile(null)
    setRows([])
    setHeaders([])
    setErrors([])
  }

  function inferType(sample) {
    if (sample === '' || sample === null || sample === undefined) return 'string'

    if (!isNaN(Number(String(sample).replace(/[$€£, ]/g,'')))) return 'number'

    const v = String(sample).toLowerCase().trim()

    if (['true','false','0','1'].includes(v)) return 'boolean'

    if (!Number.isNaN(Date.parse(sample))) return 'date'
    return 'string'
  }

  function inferSchemaFromData(rows, headers) {
    if (!rows.length || !headers.length) return []
    const first = rows[0]
    return headers.map(h => ({
      name: h,
      type: inferType(first[h]),
      required: false
    }))
  }

  function useHeadersAsSchema() {
    const inferred = inferSchemaFromData(rows, headers)
    if (inferred.length) setSchemaText(JSON.stringify(inferred, null, 2))
  }

  function downloadSchema() {
    const blob = new Blob([schemaText], { type: 'application/json;charset=utf-8' })
    saveAs(blob, 'schema.json')
  }
  function uploadSchema(e) {
    const f = e.target.files?.[0]
    if (!f) return
    f.text().then(txt => setSchemaText(txt))
  }

  useEffect(() => localStorage.setItem('schemaText', schemaText), [schemaText])
  useEffect(() => localStorage.setItem('selectedCols', JSON.stringify(selectedCols)),
  [selectedCols])

  useEffect(() => {
    const s = localStorage.getItem('schemaText')
    const c = localStorage.getItem('selectedCols')
    if (s) setSchemaText(s)
    if (c) setSelectedCols(JSON.parse(c))
  }, [])

  

  function cellHasError(row, schema, colName) {
    const f = schema.find(x => x.name === colName)
    if (!f) return false

    const v = row[colName]
    if (f.required && (v === '' || v === null || v === undefined)) return true
    if (f.type === 'number' && v !== '' && isNaN(Number(v))) return true
    if (f.type === 'currency' && v !== '' && isNaN(Number(String(v).replace(/[$€£, ]/g, '')))) return true
    if (f.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v))) return true
    if (f.type === 'boolean' && v && !['true','false','0','1'].includes(String(v).toLowerCase())) return true
    if (f.type === 'date' && v && Number.isNaN(Date.parse(v))) return true
    return false
  }

  useEffect(() => {
    function onKey(e){
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase()==='i'){ e.preventDefault(); useHeadersAsSchema() }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase()==='s'){ e.preventDefault(); downloadJSON() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rows, headers, schemaText])

  function onHeaderDragStart(h, e) {
    setDragCol(h)
    e.dataTransfer.effectAllowed = 'move'
  }

  function onHeaderDragOver(targetH, e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function onHeaderDrop(targetH, e) {
    e.preventDefault()
    if(!dragCol || dragCol === targetH) { setDragCol(null); return}

    const from = orderedHeaders.indexOf(dragCol)
    const to = orderedHeaders.indexOf(targetH)
    if (from === -1 || to === -1) { setDragCol(null); return}

    const next = orderedHeaders.slice()
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)

    setHeaderOrder(next)
    setSelectedCols(prev => {
      const sel = prev.filter(h => next.includes(h))
      return next.filter(h => sel.includes(h))
    })

    setDragCol(null)
  }

  const fileName = file?.name || 'No file uploaded'

  return (
    <div className="page-shell space-y-6">
      <header className="glass rounded-3xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <span className="pill">CSV → JSON · Schema-first</span>
            <h1 className="text-3xl md:text-4xl font-semibold text-white">
              CSV validation + JSON export
            </h1>
            <p className="text-slate-300 max-w-2xl">
              Upload a CSV, infer or design a schema, see instant validation, and export clean JSON with column control.
            </p>
            <div className="flex flex-wrap gap-3">
              {rows.length > 0 && (
                <button className="btn-primary" onClick={downloadJSON}>Export JSON</button>
              )}
            </div>
          </div>
          <div className="glass rounded-2xl p-4 w-full md:w-72 space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Status</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">File</span>
                <span className="font-semibold text-white truncate max-w-[180px]" title={fileName}>{fileName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Rows parsed</span>
                <span className="font-semibold text-emerald-200">{rows.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Headers</span>
                <span className="font-semibold text-sky-200">{headers.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Errors</span>
                <span className={`font-semibold ${hasErrors ? 'text-rose-300' : 'text-emerald-200'}`}>
                  {hasErrors ? 'Present' : 'Clean'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {errors.length > 0 && (
        <div className="card border border-rose-500/30 bg-rose-500/10 text-rose-100">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-lg">⚠️</div>
            <div>
              <p className="font-semibold">Parse issues</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      <FileUpload onFileSelected={handleFileSelected} />

      <div className="card space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="section-title">Step 2 · Schema</p>
            <h2 className="text-xl font-semibold text-white">Define schema (JSON)</h2>
            <p className="text-sm text-slate-400">Describe CSV columns, set type and required, or pull headers to kickstart.</p>
          </div>
          <div className="chip">⌘I · Use headers</div>
        </div>
        <SchemaBuilder
          schemaText={schemaText}
          setSchemaText={setSchemaText}
          headers={headers}
          onUseHeaders={useHeadersAsSchema}
        />
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="section-title">Step 3 · Preview</p>
            <h2 className="text-xl font-semibold text-white">Data snapshot</h2>
            <p className="text-sm text-slate-400">Drag headers to reorder. Cells highlight when they break the schema.</p>
          </div>
          <button className="btn-quiet" onClick={()=>setHeaderOrder(headers)}>Reset order</button>
        </div>

        {headers.length ? (
          <>
            <div className="table-wrap">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    {headers.map(h => {
                      const f = parsedSchema.find(x => x.name === h)
                      const t = f?.type
                      const req = !!f?.required
                      const errCount = columnErrorCount[h] || 0
                      return (
                        <th
                          key={h}
                          draggable
                          onDragStart={(e)=>onHeaderDragStart(h, e)}
                          onDragOver={(e)=>onHeaderDragOver(h, e)}
                          onDrop={(e)=>onHeaderDrop(h, e)}
                          aria-grabbed={dragCol === h ? 'true' : 'false'}
                          title="Drag to reorder"
                          className={`sticky top-0 z-10 border-b border-white/10 bg-slate-900/70 px-3 py-2 text-left text-[11px] uppercase tracking-wide text-slate-400 cursor-grab select-none ${dragCol && dragCol!==h ? 'opacity-60' : ''}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-white">{h}</span>
                            {t && <span className="text-xs text-slate-500">({t}{req ? ' • req' : ''})</span>}
                            {errCount > 0 && (
                              <span className="badge-err" title={`${errCount} cell(s) failing validation`}>
                                {errCount}
                              </span>
                            )}
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((row, i) => {
                    const rowIndex = i + 1
                    const badRow = errorIndexSet.has(rowIndex)
                    return (
                      <tr key={i} className={badRow ? 'bg-rose-500/5' : 'bg-white/0'}>
                        {orderedHeaders.map(h => {
                          const bad = cellHasError(row, parsedSchema, h)
                          return (
                            <td
                              key={h}
                              className={`whitespace-nowrap px-3 py-2 text-slate-100 border-b border-white/5 ${bad ? 'bg-rose-500/10 text-rose-50' : 'bg-slate-900/40'}`}
                            >
                              {String(row[h] ?? '')}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400">Showing first 10 of {rows.length} rows.</p>
          </>
        ) : <p className="text-sm text-slate-400">No data parsed yet.</p>}
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="section-title">Step 4 · Columns</p>
            <h2 className="text-xl font-semibold text-white">Columns to include in export</h2>
            <p className="text-sm text-slate-400">Pick the subset you want in the JSON, or keep all.</p>
          </div>
          <div className="chip">Headers: {headers.length || '—'}</div>
        </div>
        {headers.length === 0 && <p className="text-sm text-slate-400">Upload a CSV to choose columns.</p>}
        {headers.length > 0 && (
          <div className="flex flex-col gap-3 md:flex-row md:items-start">
            <div className="max-h-60 w-full md:w-[360px] overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  className="accent-emerald-400"
                  checked={selectedCols.length === headers.length}
                  onChange={(e) => setSelectedCols(e.target.checked ? headers : [])}
                />
                Select all
              </label>
              {headers.map(h => (
                <label key={h} className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    className="accent-emerald-400"
                    checked={selectedCols.includes(h)}
                    onChange={(e) => {
                      setSelectedCols(prev => e.target.checked ? [...new Set([...prev, h])] : prev.filter(x => x !== h))
                    }}
                  />
                  {h}
                </label>
              ))}
            </div>
            <p className="text-sm text-slate-400">Tip: leave all selected to export full JSON; or choose only the fields you want.</p>
          </div>
        )}
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="section-title">Step 5 · Validation</p>
            <h2 className="text-xl font-semibold text-white">Validation Report</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="chip">Rows: {rows.length}</span>
            <span className="chip">Headers: {headers.length}</span>
            <span className={`chip ${hasErrors ? 'border-rose-400/40 text-rose-200' : 'border-emerald-400/40 text-emerald-100'}`}>
              {hasErrors ? 'Errors present' : 'All good'}
            </span>
          </div>
        </div>

        {rows.length === 0 && <p className="text-sm text-slate-400">Upload a CSV to see validation results.</p>}

        {rows.length > 0 && (
          <div className="space-y-3">
            <ul className="space-y-1 text-sm">
              {validationReport.map(r => (
                r.errors.length > 0 ? (
                  <li key={r.index} className="text-rose-200">
                    Row {r.index}: {r.errors.join('; ')}
                  </li>
                ) : null
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <button className="btn-ghost" onClick={clearAll}>Clear</button>

              {!hasErrors && rows.length > 0 && (
                <>
                  <button className="btn-primary" onClick={downloadJSON}>Download JSON</button>
                  <button className="btn-ghost" onClick={downloadJSONSelected}>Download JSON (selected)</button>
                </>
              )}

              {hasErrors && (
                <button className="btn-ghost" onClick={downloadErrorsCSV}>Download Errors (CSV)</button>
              )}
              <button className="btn-ghost" onClick={downloadSchema}>Export schema</button>
              <label className="btn-quiet cursor-pointer">
                Import schema
                <input type="file" accept="application/json" onChange={uploadSchema} className="hidden" />
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="card space-y-3">
        <div>
          <p className="section-title">Sample CSV</p>
          <h2 className="text-xl font-semibold text-white">Copy/paste to test</h2>
        </div>
        <pre className="rounded-xl bg-black/50 border border-white/10 p-4 text-sm font-mono text-slate-100 overflow-auto">{`name,email,age
Alice,alice@example.com,30
Bob,bob[at]example.com,thirty`}</pre>
        <p className="text-xs text-slate-400">Sample shows: Row 2 invalid email; Row 3 invalid email + non-numeric age.</p>
      </div>

      <footer className="text-center text-xs text-slate-500 py-8">
        Built by Walidev — CSV → JSON Converter demo.
      </footer>
    </div>
  )
}
