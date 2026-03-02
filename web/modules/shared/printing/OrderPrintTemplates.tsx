import {
  Order,
  OrderGroup,
  OrderItem,
  ORDER_STATUS_LABELS,
} from '@/modules/orders/types'
import { OrderPrintMeta, PrintableOrderInput, PrintFormat } from './types'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('tr-TR')
}

function normalizeInput(input: PrintableOrderInput): OrderGroup {
  const groupInput = input as OrderGroup
  if (Array.isArray(groupInput.orders)) {
    return groupInput
  }

  const orderInput = input as Order
  const createdAt = orderInput.createdAt || orderInput.created_at
  return {
    tableId: orderInput.tableId || `no-table-${orderInput.id}`,
    tableName: orderInput.table?.name || 'Sipariş',
    orders: [orderInput],
    totalItems: orderInput.items?.reduce((sum, i) => sum + i.quantity, 0) || 0,
    totalAmount: Number(orderInput.totalAmount || 0),
    firstOrderTime: createdAt,
    lastOrderTime: createdAt,
    activeWaveTime: createdAt,
    customerName:
      orderInput.customer?.name || orderInput.customer?.first_name || undefined,
    orderType: orderInput.type,
    status: orderInput.status,
    activeItems: orderInput.items || [],
    activeWaveItems: orderInput.items || [],
    previousItems: [],
    servedItems: [],
  }
}

function renderItems(title: string, items: OrderItem[]): string {
  if (items.length === 0) return ''
  return `
    <section class="block">
      <h3>${escapeHtml(title)}</h3>
      ${items
        .map((item) => {
          const name = escapeHtml(item.menuItem?.name || 'Ürün')
          const lineTotal = Number(item.totalPrice || 0)
          return `
          <div class="item-row">
            <div>
              <div class="item-name">${item.quantity}x ${name}</div>
              <div class="item-status">${escapeHtml(
                ORDER_STATUS_LABELS[item.status],
              )}</div>
            </div>
            <div class="item-price">${escapeHtml(formatCurrency(lineTotal))}</div>
          </div>
        `
        })
        .join('')}
    </section>
  `
}

function getBaseStyles(format: PrintFormat): string {
  const isReceipt = format === 'receipt_80mm'
  return `
    @page {
      size: ${isReceipt ? '80mm auto' : 'A4'};
      margin: ${isReceipt ? '6mm' : '12mm'};
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
      color: #111;
      background: #fff;
      font-size: ${isReceipt ? '11px' : '13px'};
      line-height: 1.35;
    }
    .sheet {
      width: ${isReceipt ? '68mm' : '100%'};
      margin: 0 auto;
    }
    .header {
      border-bottom: 1px dashed #666;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .header h1 {
      margin: 0 0 4px 0;
      font-size: ${isReceipt ? '14px' : '20px'};
    }
    .meta {
      color: #444;
      font-size: ${isReceipt ? '10px' : '12px'};
      margin: 2px 0;
    }
    .block {
      border-bottom: 1px dashed #ddd;
      padding: 8px 0;
    }
    .block h3 {
      margin: 0 0 6px 0;
      font-size: ${isReceipt ? '11px' : '13px'};
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .item-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
    }
    .item-name {
      font-weight: 700;
    }
    .item-status {
      font-size: ${isReceipt ? '9px' : '11px'};
      color: #666;
      text-transform: uppercase;
    }
    .item-price {
      font-weight: 700;
      white-space: nowrap;
    }
    .footer {
      margin-top: 10px;
      border-top: 1px solid #111;
      padding-top: 8px;
    }
    .total {
      display: flex;
      justify-content: space-between;
      font-size: ${isReceipt ? '12px' : '16px'};
      font-weight: 700;
    }
  `
}

export function buildOrderPrintDocument(
  input: PrintableOrderInput,
  format: PrintFormat,
  meta?: OrderPrintMeta,
): string {
  const group = normalizeInput(input)
  const printMeta = meta || {
    printedAt: new Date().toISOString(),
  }

  const allItems = [
    ...group.activeWaveItems,
    ...group.previousItems,
    ...group.servedItems,
  ]
  const fallbackItems = group.orders.flatMap((o) => o.items || [])
  const uniqueItems = allItems.length > 0 ? allItems : fallbackItems

  return `
    <!doctype html>
    <html lang="tr">
      <head>
        <meta charset="utf-8" />
        <title>Adisyon - ${escapeHtml(group.tableName)}</title>
        <style>${getBaseStyles(format)}</style>
      </head>
      <body>
        <main class="sheet">
          <header class="header">
            <h1>ADİSYON</h1>
            ${
              printMeta.restaurantName
                ? `<div class="meta">${escapeHtml(printMeta.restaurantName)}</div>`
                : ''
            }
            <div class="meta">Masa: ${escapeHtml(group.tableName)}</div>
            <div class="meta">Müşteri: ${escapeHtml(
              group.customerName || '-',
            )}</div>
            <div class="meta">İlk Sipariş: ${escapeHtml(
              formatDateTime(group.firstOrderTime),
            )}</div>
            <div class="meta">Son Güncelleme: ${escapeHtml(
              formatDateTime(group.lastOrderTime),
            )}</div>
            <div class="meta">Yazdırma: ${escapeHtml(
              formatDateTime(printMeta.printedAt),
            )}</div>
          </header>

          ${renderItems('Son Gelen İstekler', group.activeWaveItems)}
          ${renderItems('Önceki İstekler', group.previousItems)}
          ${renderItems('Arşiv / Bitenler', group.servedItems)}
          ${
            group.activeWaveItems.length === 0 &&
            group.previousItems.length === 0 &&
            group.servedItems.length === 0
              ? renderItems('Sipariş Ürünleri', uniqueItems)
              : ''
          }

          <footer class="footer">
            <div class="total">
              <span>TOPLAM</span>
              <span>${escapeHtml(formatCurrency(Number(group.totalAmount || 0)))}</span>
            </div>
          </footer>
        </main>
      </body>
    </html>
  `
}
