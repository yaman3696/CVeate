
'use client'

import { useState } from 'react'
import {
  exportToExcel,
  type ExcelSheet,
} from '@/lib/exports/excel'

type ExportExcelButtonProps = {
  sheets: ExcelSheet[] | (() => Promise<ExcelSheet[]>)
  fileName: string
  disabled?: boolean
}

export default function ExportExcelButton({
  sheets,
  fileName,
  disabled = false,
}: ExportExcelButtonProps) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (exporting || disabled) return

    setExporting(true)

    try {
      const exportSheets =
        typeof sheets === 'function'
          ? await sheets()
          : sheets

      await exportToExcel(exportSheets, fileName)
    } catch (error) {
      console.error('Excel export failed:', error)
      alert('Unable to export Excel. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled || exporting}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {exporting ? 'Exporting...' : 'Export Excel (.xlsx)'}
    </button>
  )
}
