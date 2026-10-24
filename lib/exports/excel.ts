
import type { Row } from 'write-excel-file/browser'

export type ExcelSheet = {
  name: string
  headers: string[]
  rows: (string | number | boolean | null)[][]
}

export async function exportToExcel(
  sheets: ExcelSheet[],
  fileName: string
): Promise<void> {
  if (sheets.length === 0) {
    throw new Error('No Excel sheets provided')
  }

  const { default: writeXlsxFile } = await import(
    'write-excel-file/browser'
  )

  const createCell = (
    value: string | number | boolean | null
  ) => {
    if (value === null) {
      return { type: String, value: '' }
    }

    if (typeof value === 'number') {
      return { type: Number, value }
    }

    if (typeof value === 'boolean') {
      return { type: Boolean, value }
    }

    return { type: String, value }
  }

  const workbook = sheets.map((sheet) => {
    const data: Row[] = [
      sheet.headers.map((header) => ({
        type: String,
        value: header,
        fontWeight: 'bold' as const,
        backgroundColor: '#E0E7FF',
      })),
      ...sheet.rows.map((row) => row.map(createCell)),
    ]

    return {
      sheet: sheet.name,
      data,
    }
  })

  await writeXlsxFile(workbook).toFile(fileName)
}
