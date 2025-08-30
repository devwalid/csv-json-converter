import React, { useEffect, useMemo, useState } from "react";
import { required } from "../utils/validators";

const TYPE_OPTIONS = ['string', 'number', 'currency', 'date', 'boolean', 'email']

function normalizeFields(maybeArray) {
    if (!Array.isArray(maybeArray)) return []
    return maybeArray.map(f => ({
        name: String(f?.name ?? '').trim(),
        type: TYPE_OPTIONS.includes(f?.type) ? f.type : 'string',
        required: Boolean(f?.required)
    }))
}

export default function SchemaBuilder({ schemaText, setSchemaText, headers = [], onUseHeaders }) {
    const [rows, setRows] = useState([])
    const [dragIndex, setDragIndex] = useState(null)
    const [overIdex, setOverIndex] = useState(null)

    useEffect(() => {
        try {
            setRows(normalizeFields(JSON.parse(schemaText)))
        } catch {

        }
    }, [schemaText])

    function push(next) {
        setRows(next)
        setSchemaText(JSON.stringify(next, null, 2))
    }

    function addRow() { push([...rows, { name: '', type: 'string', required: false }]) }
    function removeRow(i) { push(rows.filter((_, idx) => idx !== i)) }
    function updateRow(i, k, v) {const n = rows.slice(); n[i] = { ...n[i], [k]: v }; push(n) }

    function useHeaders() {
        if (!headers.length) return
        const inferred = headers.map(h => ({ name: h, type: 'string', required: false }))
        push(inferred)
        onUseHeaders && onUseHeaders(inferred)
    }

    function onDragStart(i, e) {
        setDragIndex(i)
        e.dataTransfer.effectAllowed = "move"
    }

    function onDragOver(e, i) {
        e.preventDefault()
        setOverIndex(i)
        e.dataTransfer.dropEffect = "move"
    }

    function onDrop(e, i) {
        e.preventDefault()
        if (dragIndex === null) return

        const n = rows.slice()
        const [moved] = n.splice(dragIndex, 1)
        n.splice(i, 0, moved)

        push(n)
        setDragIndex(null)
        setOverIndex(null)
    }

    const errors = useMemo(() => {
        const e = []
        const seen = new Set()
        const list = Array.isArray(rows) ? rows : []
        list.forEach((r, i) => {
            if (!r.name) e.push(`Row ${i+1}: name is required`)
            if (r.name) {
                if (seen.has(r.name)) e.push(`Row ${i+1}: duplicate name "${r.name}"`)
                seen.add(r.name)
            }
            if (!TYPE_OPTIONS.includes(r.type)) e.push(`Row ${i+1}: invalid type "${r.type}"`)
        })
        return e
    }, [rows])

    return (
        <div>
            <div className="toolbar" style={{marginBottom:10}}>
                <button onClick={addRow}>+ Add field</button>
                <div className="spacer" />
                <button className="ghost" onClick={useHeaders} disabled={!headers.length}>Use headers as schema</button>
            </div>

            <div className="schema-cards">
                {rows.map((r, i) => (
                    <div
                        key={i}
                        className={`schema-card ${overIdex===i ? 'drag-over' : ''}`}
                        draggable
                        onDragStart={() => onDragStart(i)}
                        onDragOver={(e) => onDragOver(e, i)}
                        onDrop={(e) => onDrop(e, i)}
                    >
                        <div className="top">
                            <input
                                className="schema-input"
                                value={r.name}
                                placeholder="e.g., Amount Spent (USD)"
                                onChange={e => updateRow(i, 'name', e.target.value)}
                            />
                            <div className="req">
                                <input
                                    type="checkbox"
                                    checked={r.required}
                                    onChange={e => updateRow(i, 'required', e.target.checked)}
                                />
                                <small>required</small>
                            </div>
                        </div>

                        <div className="rowline">
                            <select
                                className="schema-input"
                                value={r.type}
                                onChange={e => updateRow(i, 'type', e.target.value)}
                            >
                                {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div className="actions">
                            <button className="ghost" onClick={() => removeRow(i)}>Delete</button>
                        </div>
                    </div>
                ))}
            </div>

            {errors.length > 0 && (
                <div style={{marginTop:8}}>
                    <ul className="err">
                        {errors.map((e, idx) => <li key={idx}>{e}</li>)}
                    </ul>
                </div>
            )}
            
            <div style={{marginTop:12}}>
                <label>Schema JSON (read/write)</label>
                <textarea
                    rows={10}
                    className="code"
                    value={schemaText}
                    onChange={(e)=>setSchemaText(e.target.value)}
                />
                <small>Drag to reorder cards. Edits sync to the JSON.</small>
            </div>
        </div>
    )
}