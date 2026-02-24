Multi-Stage Build: Dockerfile'lar üretim aşamasında (dist) minimal image kullanmalıdır.

Bağımlılıklar: docker-compose.yml servisleri arasındaki depends_on hiyerarşisine dikkat edilmelidir.

Traefik: Yeni bir servis eklendiğinde labels kısmındaki domain ve port tanımları otomatik önerilmelidir.        