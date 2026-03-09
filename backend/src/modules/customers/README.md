# Customers Module Notes

## Audit Strategy

Customers modülü create/update/delete akışlarında audit log publish işlemi
`safeEmitLog` üzerinden fail-open çalışır.

- Audit yazımı başarısız olsa da ana domain işlemi rollback edilmez.
- Bu karar operasyonel süreklilik için bilinçli olarak alınmıştır.

