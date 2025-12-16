import React from 'react'

export default function FileUpload({ onFileSelected, accept = '.csv' }) {
  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="section-title">Step 1 · Upload</p>
          <h2 className="text-xl font-semibold text-white">Upload CSV file</h2>
          <p className="text-sm text-slate-400">Drop a CSV with headers. We auto-detect delimiters and highlight issues.</p>
        </div>
        <div className="chip">CSV only</div>
      </div>

      <label className="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/15 bg-white/5 px-6 py-8 text-center transition hover:border-emerald-400/50 hover:bg-emerald-400/5">
        <div className="h-14 w-14 rounded-2xl bg-emerald-400/15 text-emerald-300 flex items-center justify-center text-2xl">
          🗂️
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-white">Drop your CSV</p>
          <p className="text-sm text-slate-400">or click to browse</p>
        </div>
        <input
          className="hidden"
          type="file"
          accept={accept}
          onChange={(e) => onFileSelected(e.target.files?.[0] || null)}
        />
      </label>
      <p className="text-xs text-slate-400">Tip: Export your sheet as CSV (comma-separated).</p>
    </div>
  )
}
