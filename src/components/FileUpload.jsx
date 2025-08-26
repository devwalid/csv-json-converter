import React from 'react'

export default function FileUpload({ onFileSelected, accept='.csv' }) {
  return (
    <div className="card">
      <h2>1) Upload CSV file</h2>
      <input
        type="file"
        accept={accept}
        onChange={(e) => onFileSelected(e.target.files?.[0] || null)}
      />
      <small>Tip: Export your sheet as CSV (comma-separated).</small>
    </div>
  )
}
