# Guía de Despliegue en Producción (VPS / Cloud)

Instrucciones paso a paso para desplegar el sistema en un servidor VPS (Ubuntu 22.04 / Debian 12) con Docker y HTTPS.

---

### Paso 1: Configurar el Servidor y Docker
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose git curl nginx certbot python3-certbot-nginx
sudo systemctl enable --now docker
```

---

### Paso 2: Clonar el Repositorio y Variables de Entorno
```bash
git clone <tu-repositorio> /opt/dispatch-system
cd /opt/dispatch-system
cp .env.example .env
nano .env # Configurar credenciales reales de WhatsApp, JWT y base de datos
```

---

### Paso 3: Levantar Contenedores con Docker Compose
```bash
docker-compose up -d --build
```

Verificar que los servicios estén activos:
```bash
docker-compose ps
```

---

### Paso 4: Ejecutar Migraciones e Inicializar Datos
```bash
docker-compose exec app npx prisma db push
docker-compose exec app npm run prisma:seed
```

---

### Paso 5: Configurar Nginx y Certificado SSL (HTTPS Obligatorio por Meta)
Meta WhatsApp Cloud API requiere obligatoriamente que el endpoint del webhook use HTTPS con un certificado SSL válido.

Configuración de Nginx (`/etc/nginx/sites-available/dispatch.conf`):
```nginx
server {
    server_name api.tudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Habilitar el sitio y generar certificado SSL con Let's Encrypt:
```bash
sudo ln -s /etc/nginx/sites-available/dispatch.conf /etc/nginx/sites-enabled/
sudo certbot --nginx -d api.tudominio.com
sudo systemctl restart nginx
```

---

### Paso 6: Vincular Webhook en Meta Developers
1. Ve a tu App en [developers.facebook.com](https://developers.facebook.com).
2. URL del Webhook: `https://api.tudominio.com/api/webhooks/whatsapp`
3. Token de verificación: el valor configurado en `WHATSAPP_VERIFY_TOKEN`.
4. ¡Listo! El sistema estará operando en vivo.
