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
    const [overIndex, setOverIndex] = useState(null)

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
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <button className="btn-primary" onClick={addRow}>+ Add field</button>
                <button className="btn-ghost" onClick={useHeaders} disabled={!headers.length}>Use headers as schema</button>
                <span className="text-xs text-slate-400 ml-auto">Drag cards to reorder</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {rows.map((r, i) => (
                    <div
                        key={i}
                        className={`rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3 cursor-grab transition ${overIndex===i ? 'ring-2 ring-emerald-400/60' : 'hover:border-white/20'}`}
                        draggable
                        onDragStart={() => onDragStart(i)}
                        onDragOver={(e) => onDragOver(e, i)}
                        onDrop={(e) => onDrop(e, i)}
                    >
                        <div className="flex items-center gap-3">
                            <input
                                className="field"
                                value={r.name}
                                placeholder="e.g., Amount Spent (USD)"
                                onChange={e => updateRow(i, 'name', e.target.value)}
                            />
                            <label className="flex items-center gap-2 text-xs text-slate-300">
                                <input
                                    type="checkbox"
                                    className="accent-emerald-400"
                                    checked={r.required}
                                    onChange={e => updateRow(i, 'required', e.target.checked)}
                                />
                                required
                            </label>
                        </div>

                        <div className="flex gap-2">
                            <select
                                className="field"
                                value={r.type}
                                onChange={e => updateRow(i, 'type', e.target.value)}
                            >
                                {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div className="flex justify-end">
                            <button className="btn-quiet" onClick={() => removeRow(i)}>Delete</button>
                        </div>
                    </div>
                ))}
            </div>

            {errors.length > 0 && (
                <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">
                    <ul className="list-disc list-inside space-y-1">
                        {errors.map((e, idx) => <li key={idx}>{e}</li>)}
                    </ul>
                </div>
            )}
            
            <div className="space-y-2">
                <label className="text-sm text-slate-300">Schema JSON (read/write)</label>
                <textarea
                    rows={10}
                    className="field font-mono min-h-[220px]"
                    value={schemaText}
                    onChange={(e)=>setSchemaText(e.target.value)}
                />
                <p className="text-xs text-slate-400">Drag to reorder cards. Edits stay in sync with the JSON below.</p>
            </div>
        </div>
    )
}
