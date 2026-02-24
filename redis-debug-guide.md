# Redis Session Sorunu Debug Rehberi

## Sorun
QR okuttuktan 1 dakika sonra refresh yapınca 401 alınıyor.

## Kontrol Adımları

### 1. Redis Container Çalışıyor mu?
```bash
# Docker Compose ile kontrol
docker-compose ps

# Redis container logları
docker-compose logs redis

# Redis'e ping atma
docker-compose exec redis redis-cli ping
# Cevap: PONG olmalı
```

### 2. Redis'e Bağlanma ve Session Kontrolü
```bash
# Redis CLI'ya gir
docker-compose exec redis redis-cli

# Tüm key'leri listele (guest session'ları görmek için)
KEYS guestSession:*

# Belirli bir session'ı görüntüle
GET guestSession:SESSION_ID_BURAYA

# Session'ın TTL'sini kontrol et (kaç saniye kalmış)
TTL guestSession:SESSION_ID_BURAYA

# Redis'ten çık
EXIT
```

### 3. Backend Loglarını İzleme
```bash
# Backend loglarını görüntüle
docker-compose logs -f backend

# Veya log dosyasına kaydet
docker-compose logs -f backend > backend.log 2>&1

# remove all keys docker ps ile redis adı alınır docker-redis-1
docker exec docker-redis-1 redis-cli --scan --pattern "*" \
| xargs docker exec docker-redis-1 redis-cli UNLINK
```

### 4. Session Oluşturma Akışını Debug Etme

Backend `guest-sessions.service.ts` dosyasına console.log ekleyelim:

```typescript
// createSession fonksiyonunda (satır 70 civarı)
async createSession(dto: CreateSessionDto) {
    console.log('[DEBUG] Creating session for table:', dto);
    
    // Session oluşturma sonrası
    console.log('[DEBUG] Session created:', session);
    console.log('[DEBUG] Storing in Redis with key:', `guestSession:${session.id}`);
    
    // Redis'e kaydetmeden önce
    const sessionData = JSON.stringify(session);
    console.log('[DEBUG] Session data to store:', sessionData);
    
    await this.redis.setex(`guestSession:${session.id}`, this.SESSION_TTL_SECONDS, sessionData);
    
    // Kaydettikten sonra kontrol
    const stored = await this.redis.get(`guestSession:${session.id}`);
    console.log('[DEBUG] Stored session:', stored);
}
```

### 5. Session Getirme Akışını Debug Etme

```typescript
// getSession fonksiyonunda (satır 164 civarı)
async getSession(sessionId: string): Promise<GuestSession | null> {
    const key = `guestSession:${sessionId}`;
    console.log('[DEBUG] Getting session from Redis:', key);
    
    const data = await this.redis.get(key);
    console.log('[DEBUG] Raw data from Redis:', data);
    
    if (!data) {
        console.log('[DEBUG] No session found in Redis for:', key);
        return null;
    }
    
    const session = JSON.parse(data) as GuestSession;
    console.log('[DEBUG] Parsed session:', session);
    console.log('[DEBUG] Session expires at:', session.expiresAt);
    console.log('[DEBUG] Current time:', new Date());
    console.log('[DEBUG] Is expired?:', new Date(session.expiresAt) < new Date());
    
    return session;
}
```

### 6. heartbeat Fonksiyonunu Debug Etme

```typescript
// heartbeat fonksiyonunda (satır 258 civarı)
async heartbeat(sessionId: string): Promise<boolean> {
    console.log('[DEBUG] Heartbeat for session:', sessionId);
    
    const session = await this.getSession(sessionId);
    console.log('[DEBUG] Session from getSession:', session);
    
    if (!session) {
        console.log('[DEBUG] Session not found, returning false');
        return false;
    }
    
    // TTL kontrolü
    const ttl = await this.redis.ttl(`guestSession:${sessionId}`);
    console.log('[DEBUG] Redis TTL for session:', ttl);
}
```

## Yaygın Sorunlar ve Çözümleri

### 1. Redis Bağlantı Hatası
**Belirti:** Backend loglarında "Redis connection error"
**Çözüm:**
```bash
# Redis container'ı yeniden başlat
docker-compose restart redis

# Veya tüm stack'i yeniden başlat
docker-compose down
docker-compose up -d
```

### 2. Session Key Format Uyuşmazlığı
**Belirti:** Session oluşturuluyor ama getirilmiyor
**Kontrol:** Key formatının tutarlı olduğundan emin olun:
- Kaydederken: `guestSession:${sessionId}`
- Getirirken: `guestSession:${sessionId}`

### 3. Redis Data Tipi Sorunu
**Belirti:** `JSON.parse` hatası
**Kontrol:** Redis'teki veri tipini kontrol edin:
```bash
TYPE guestSession:SESSION_ID
```
String olmalıdır.

### 4. Session Siliniyor
**Belirti:** Session kısa sürede kayboluyor
**Kontrol:** Redis TTL değerini kontrol edin. 3 saat (10800 saniye) olmalı.

## Hızlı Test

```bash
# 1. Redis'e bağlan
docker-compose exec redis redis-cli

# 2. Test key oluştur
SET test:key "hello world" EX 10

# 3. Key'i kontrol et
GET test:key

# 4. 10 saniye bekle ve tekrar kontrol et
# (nil) dönerse TTL çalışıyor demektir
GET test:key

# 5. Çık
EXIT
```

## Sonuç Analizi

Eğer:
- `KEYS guestSession:*` boş dönüyorsa → Session hiç oluşturulmuyor
- Session var ama `GET` boş dönüyorsa → TTL hemen doluyor veya siliniyor
- Backend loglarında Redis hatası yoksa → Kodda mantık hatası var

Logları bana gönderirseniz daha detaylı yardımcı olabilirim.
