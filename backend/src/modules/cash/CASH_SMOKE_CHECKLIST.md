# Cash Smoke Checklist (Post-Refactor)

## Preconditions
- Migration çalıştırıldı: `1773100000000-AddCashReconciliationSnapshots`.
- En az bir aktif kasa (`cash_registers.active = true`) var.
- Test kullanıcısının cash endpointlerine erişim yetkisi var.

## 1) Registers / Active Sessions
1. `GET /cash/registers` çağır.
2. `GET /cash/registers/active-sessions` çağır.
3. Beklenen:
   - Response envelope: `{ success, data }`
   - Hata yok.

## 2) Open Session
1. `POST /cash/sessions/open` ile oturum aç.
2. Aynı register için ikinci kez açmayı dene.
3. Beklenen:
   - İlk çağrı başarılı.
   - İkinci çağrı hata verir (`zaten açık oturum var`).

## 3) Add Movement
1. Açık session için `POST /cash/sessions/:sessionId/movements`.
2. `amount <= 0` ile tekrar dene.
3. Beklenen:
   - Geçerli istek başarılı.
   - Geçersiz amount için 400.

## 4) Session History (QuerySpec)
1. `GET /cash/sessions/history?page=1&limit=10`
2. `registerId`, `status`, `openedById`, `startDate`, `endDate` filtreleriyle çağır.
3. `startDate/endDate` 31 günden uzun aralık dene.
4. Beklenen:
   - `data.items + data.meta` formatı döner.
   - Uzun aralıkta 400.

## 5) Reconciliation (Closed Snapshot / Open Live)
1. Açık oturumda `GET /cash/sessions/:id/reconciliation`.
2. Session kapat.
3. Aynı endpointi tekrar çağır.
4. Beklenen:
   - Açık oturumda `is_live = true`.
   - Kapalı oturumda snapshot varsa `is_live = false`.

## 6) Close Session Snapshot Idempotency
1. Session kapatıldıktan sonra close akışını tekrar tetiklemeyi dene.
2. Beklenen:
   - Duplicate snapshot nedeniyle işlem patlamaz.
   - Log: `close_session.snapshot_exists`.

## 7) Fail-Open Snapshot Persist (GET path)
1. Snapshot insert'i simüle fail ettir (mock/DB permission).
2. `GET /cash/sessions/:id/reconciliation` çağır.
3. Beklenen:
   - Endpoint yine rapor döner.
   - Log: `reconciliation.snapshot_persist_failed`.

## 8) Web Smoke
1. `/cash` sayfası açılır, register ve active session verileri görünür.
2. `/cash/history` filtre + pagination çalışır.
3. `/cash/sessions/[id]` summary/reconciliation sekmeleri açılır.
