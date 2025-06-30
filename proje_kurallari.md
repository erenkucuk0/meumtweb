# Proje Geliştirme Kuralları

Bu dosyada, proje geliştirme sürecinde uyulması gereken kurallar ve prensipler yer alacaktır. Kurallar güncellendikçe bu dosya üzerinden takip edilecektir.

## Genel Kurallar

- Kod okunabilir ve anlaşılır olmalıdır.
- Gereksiz kod tekrarından kaçınılmalıdır.
- Commit mesajları açıklayıcı ve anlamlı olmalıdır.
- Kodda yapılan her değişiklik için ilgili açıklamalar eklenmelidir.
- Kodda yapılan değişiklikler, ilgili kişilere haber verilmelidir.
- Kodun çalışabilirliği her değişiklikten sonra test edilmelidir.

## İletişim ve İşbirliği

- Takım üyeleri arasında açık ve net iletişim sağlanmalıdır.
- Karar alma süreçlerinde takım üyelerinin görüşleri alınmalıdır.

## Dosya ve Klasör Yapısı

- Dosya ve klasör isimlendirmelerinde anlamlı ve standartlara uygun isimler kullanılmalıdır.
- Gereksiz dosya ve klasör oluşturulmamalıdır.

## Diğer Kurallar

- Yeni kurallar eklendikçe bu dosya güncellenecektir.

## 1. İnternet Programlama Temelleri ve Ağ (Networking)
- İstemci-sunucu mimarisi, HTTP istek/yanıt döngüsü, ağ protokolleri (TCP/IP, DNS, HTTPS) anlaşılmalı ve uygulanmalıdır.
- Web uygulamalarında stateless iletişim yönetimine dikkat edilmelidir (ör. JWT ile kimlik doğrulama, session yönetimi).

## 2. Versiyon Kontrolü
- Kod yönetimi için Git kullanılacaktır (commit, branching, merging).
- İşbirlikçi iş akışları benimsenmeli ve düzgün bir commit geçmişi korunmalıdır.

## 3. Uygulama Yapısı & Node.js/Express.js
- Net bir klasör ve dosya yapısı ile projeler oluşturulmalı ve düzenlenmelidir.
- Express.js ile controller, middleware ve temel routing yapılandırması uygulanmalıdır.

## 4. Dependency Injection (Bağımlılık Enjeksiyonu) & Routing
- Gevşek bağlanabilirlik için uygun yerlerde dependency injection veya benzeri desenler uygulanmalıdır (ör. service katmanı).
- API uç noktaları için Express.js router yapısı kullanılmalıdır.

## 5. İsteklerin, Yanıtların ve Model Binding İşlemlerinin Yönetilmesi
- HTTP istek verilerine (header, query parametreleri, route parametreleri, body) erişim sağlanmalıdır.
- Gelen veriler sunucu tarafı nesnelere uygun şekilde dönüştürülmelidir (ör. express.json(), custom middleware).

## 6. Veri Doğrulama & API Tasarım Kalıpları
- Joi, express-validator gibi kütüphanelerle veri doğrulama yapılmalıdır.
- Sayfalama, filtreleme, sıralama ve HATEOAS ilkeleriyle kaynak odaklı API tasarımı uygulanmalıdır.

## 7. Hata Yönetimi & Loglama
- try-catch blokları ve Express error-handling middleware ile özel hata yönetimi uygulanmalıdır.
- Winston, Morgan veya benzeri loglama araçları ile sağlam hata raporlama ve teşhis sağlanmalıdır.

## 8. Veritabanı Entegrasyonu & ORM Kullanımı
- Sequelize, TypeORM, Mongoose gibi ORM/ODM araçları ile CRUD işlemleri uygulanmalıdır.
- İlişkiler (bire bir, bire çok, çoktan çoğa) gösterilmeli ve asenkron veritabanı işlemleri kullanılmalıdır.

## 9. RESTful API Tasarımı & Versiyonlama
- REST prensiplerine uygun API'ler tasarlanmalıdır.
- API versiyonlaması URL yolları, query parametreleri veya özel header'lar ile yönetilmelidir.

## 10. Kimlik Doğrulama & Yetkilendirme
- API anahtarları, JWT, OAuth gibi yöntemlerle kullanıcı kimlik doğrulaması uygulanmalıdır.
- Uç noktalarda rol tabanlı veya politika tabanlı yetkilendirme sağlanmalıdır.

## 11. Asenkron Programlama & Performans Optimizasyonu
- Uygulamanın tepkisel olması için async/await desenleri kullanılmalıdır.
- Veritabanı işlemleri ve genel uygulama ölçeklenebilirliğinde performans optimizasyonu yapılmalıdır.

## 12. (Opsiyonel) Mikroservis Mimarisi
- Uygun olduğunda uygulama mikroservislere bölünebilir.
- Servisler arası iletişim (REST, mesajlaşma) ve dağıtım uygulamaları gösterilmelidir.

## 13. Güvenlik için En İyi Uygulamalar
- XSS, CSRF, SQL Injection gibi yaygın web güvenlik açıklarına karşı önlemler alınmalıdır.
- Hassas bilgiler korunmalı, HTTPS uygulanmalı ve güvenlik header'ları (helmet.js gibi) kullanılmalıdır.

## 14. Dağıtım & CI/CD
- Uygulama dağıtıma hazırlanmalı (bulut konfigürasyonu, Docker ile konteynerleştirme, CI/CD hatları kurulmalı).
- Azure, AWS, Vercel veya benzeri bir bulut platformuna dağıtım gösterilmelidir.

## 15. Dokümantasyon & Test
- Kapsamlı satır içi ve harici dokümantasyon sağlanmalıdır.
- Birim testleri (Jest, Mocha) ve entegrasyon testleri eklenmelidir.
- Proje açıklamaları ve kullanım videoları hazırlanmalıdır.

## 16. Ek Geliştirmeler (Opsiyonel fakat Teşvik Edilir)
- Bellek içi (Redis) veya dağıtık önbellekleme stratejileri uygulanabilir.
- React ile kullanıcı arayüzü bileşenlerinde duyarlı (responsive) tasarım kullanılmalı ve kodun ölçeklenebilir, sürdürülebilir olması sağlanmalıdır. 