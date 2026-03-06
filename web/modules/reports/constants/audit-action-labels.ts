import { AUDIT_RESOURCE_LABELS } from './audit-resource-options'

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  SETTING_UPDATED: 'Ayar Güncellendi',
  CASH_REGISTER_CREATED: 'Kasa Tanımı Oluşturuldu',
  CASH_REGISTER_DELETED: 'Kasa Tanımı Silindi',
  CASH_DEFAULT_REGISTER_ENSURED: 'Varsayılan Kasa Doğrulandı',
  CASH_SESSION_OPENED: 'Kasa Oturumu Açıldı',
  CASH_SESSION_CLOSED: 'Kasa Oturumu Kapatıldı',
  CASH_MOVEMENT_ADDED: 'Kasa Hareketi Eklendi',
  INVENTORY_INGREDIENT_CREATED: 'Malzeme Oluşturuldu',
  INVENTORY_INGREDIENT_UPDATED: 'Malzeme Güncellendi',
  INVENTORY_INGREDIENT_DELETED: 'Malzeme Silindi',
  INVENTORY_STOCK_MOVEMENT_ADDED: 'Stok Hareketi Eklendi',
  INVENTORY_RECIPE_CREATED: 'Reçete Oluşturuldu',
  INVENTORY_RECIPE_DELETED: 'Reçete Silindi',
  INVENTORY_STOCK_BULK_UPDATED: 'Toplu Stok Güncellendi',
  ORDER_CREATED: 'Sipariş Oluşturuldu',
  ORDER_STATUS_UPDATED: 'Sipariş Durumu Güncellendi',
  ORDER_STATUS_BATCH_UPDATED: 'Toplu Sipariş Durumu Güncellendi',
  ORDER_MOVED_TO_TABLE: 'Sipariş Masaya Taşındı',
  ORDER_ITEMS_UPDATED: 'Sipariş Ürünleri Güncellendi',
  PAYMENT_CREATED: 'Ödeme Oluşturuldu',
  PAYMENT_SPLIT_CREATED: 'Bölünmüş Ödeme Oluşturuldu',
  PAYMENT_REVERTED: 'Ödeme İade Edildi',
  CUSTOMER_CREATED: 'Müşteri Oluşturuldu',
  CUSTOMER_UPDATED: 'Müşteri Güncellendi',
  CUSTOMER_DELETED: 'Müşteri Silindi',
  RESERVATION_CREATED: 'Rezervasyon Oluşturuldu',
  RESERVATION_UPDATED: 'Rezervasyon Güncellendi',
  RESERVATION_STATUS_UPDATED: 'Rezervasyon Durumu Güncellendi',
  RESTAURANT_CREATED: 'Restoran Oluşturuldu',
  RESTAURANT_UPDATED: 'Restoran Güncellendi',
  RESTAURANT_DELETED: 'Restoran Silindi',
  BRANCH_CATEGORY_HIDDEN: 'Kategori Gizlendi',
  BRANCH_CATEGORY_SHOWN: 'Kategori Görünür Yapıldı',
  BRANCH_CATEGORIES_HIDDEN_BULK: 'Kategoriler Toplu Gizlendi',
  BRANCH_CATEGORIES_SHOWN_BULK: 'Kategoriler Toplu Görünür Yapıldı',
  BRANCH_ITEM_OVERRIDE_UPSERTED: 'Ürün Override Uygulandı',
  BRANCH_ITEM_OVERRIDE_REMOVED: 'Ürün Override Kaldırıldı',
  BRANCH_ITEM_OVERRIDE_BULK_APPLIED: 'Toplu Ürün Override Uygulandı',
  MENU_CATEGORY_CREATED: 'Menü Kategorisi Oluşturuldu',
  MENU_CATEGORY_UPDATED: 'Menü Kategorisi Güncellendi',
  MENU_CATEGORY_DELETED: 'Menü Kategorisi Silindi',
  MENU_ITEM_CREATED: 'Menü Ürünü Oluşturuldu',
  MENU_ITEM_UPDATED: 'Menü Ürünü Güncellendi',
  MENU_ITEM_DELETED: 'Menü Ürünü Silindi',
  USER_CREATED: 'Kullanıcı Oluşturuldu',
  USER_UPDATED: 'Kullanıcı Güncellendi',
  USER_STATUS_CHANGED: 'Kullanıcı Durumu Değiştirildi',
  USER_DELETED: 'Kullanıcı Silindi',
  USER_RESTORED: 'Kullanıcı Geri Yüklendi',
  USER_ASSIGNED_RESTAURANT: 'Kullanıcı Restorana Atandı',
}

function truncateAction(action: string): string {
  return action.length > 40 ? `${action.slice(0, 40)}...` : action
}

export function parseHttpAction(action: string): string | undefined {
  const match = action.match(
    /^(POST|PATCH|PUT|DELETE|GET)\s+\/api\/v\d+\/([^/\s?]+)/i,
  )

  if (!match) {
    return undefined
  }

  const method = match[1].toUpperCase()
  const moduleName = match[2].toUpperCase()
  const resourceLabel = AUDIT_RESOURCE_LABELS[moduleName]

  if (!resourceLabel) {
    return undefined
  }

  return `${method} ${resourceLabel}`
}

export function resolveAuditActionLabel(action: string): string {
  return (
    AUDIT_ACTION_LABELS[action] ||
    parseHttpAction(action) ||
    truncateAction(action)
  )
}

export function getAuditActionLabel(action: string): string {
  return resolveAuditActionLabel(action)
}
