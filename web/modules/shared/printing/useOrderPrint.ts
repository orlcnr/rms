'use client'

import { toast } from 'sonner'
import { buildOrderPrintDocument } from './OrderPrintTemplates'
import { OrderPrintMeta, PrintableOrderInput, PrintFormat } from './types'

interface PrintOrderOptions {
  format: PrintFormat
  meta?: OrderPrintMeta
}

export function useOrderPrint() {
  const printOrder = (input: PrintableOrderInput, options: PrintOrderOptions) => {
    if (typeof window === 'undefined') return

    const printWindow = window.open('', '_blank', 'width=1024,height=768')
    if (!printWindow) {
      toast.error('Yazdırma penceresi açılamadı. Tarayıcı engelini kontrol edin.')
      return
    }

    const documentHtml = buildOrderPrintDocument(
      input,
      options.format,
      options.meta,
    )

    printWindow.document.open()
    printWindow.document.write(documentHtml)
    printWindow.document.close()
    printWindow.focus()

    window.setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 200)
  }

  return {
    printOrder,
  }
}
