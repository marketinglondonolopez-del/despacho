import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

const botConfig = {
  keywords: ['servicio para', 'necesito un carro', 'carrera a', 'un servicio a', 'necesito transporte', 'servicio al', 'necesito servicio', 'un servicio', 'carrera', 'transporte', 'viaje'],
  apiBaseUrl: 'http://localhost:3000/api'
};

// Memoria del Cerebro
const pendingServices = new Map<string, any>();
const waitingPassengers = new Map<string, any>();
let lastPendingCode: string | null = null;

console.log('🤖 Iniciando el Cerebro de WhatsApp (Modo 100% Grupo Estricto)...');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', (qr) => {
  console.log('\n==================================================');
  console.log('📱 ESCANEA ESTE CÓDIGO QR CON TU WHATSAPP');
  console.log('==================================================\n');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('\n✅ ¡El Cerebro de WhatsApp (100% Grupo) está listo!');
});

// Función para garantizar números en formato Colombia 57
function formatColombiaPhone(rawPhone: string): string {
  let clean = (rawPhone || '').replace(/\D/g, '');
  if (clean.length === 10 && (clean.startsWith('3') || clean.startsWith('6'))) {
    clean = '57' + clean;
  }
  return clean;
}

// Extraer contacto y nombre
async function extractPhoneNumber(msg: any): Promise<{ phone: string; name: string }> {
  let phone = '';
  let name = '';

  try {
    const contact = await msg.getContact();
    if (contact) {
      if (contact.number && contact.number.length >= 10 && contact.number.length <= 13) {
        phone = contact.number;
      }
      name = contact.pushname || contact.name || '';
    }
  } catch (e) {}

  if (!phone) {
    const rawId = (msg.author || msg.from || '').split('@')[0].replace(/\D/g, '');
    if (rawId.length >= 10 && rawId.length <= 13) {
      phone = rawId;
    }
  }

  if (msg.body) {
    const matchPhone = msg.body.match(/3\d{9}/);
    if (matchPhone) {
      phone = matchPhone[0];
    }
  }

  return { phone: formatColombiaPhone(phone), name };
}

client.on('message_create', async (msg: any) => {
  try {
    if (!msg.body || typeof msg.body !== 'string') return;
    const text = msg.body.trim().toLowerCase();
    const isGroup = msg.from.includes('@g.us') || msg.to.includes('@g.us');
    
    // Todo ocurre estrictamente en el grupo
    if (!isGroup) return;

    // Ignorar mensajes propios del bot excepto si escribe el 1
    if (msg.fromMe) {
      if (text !== '1' && !text.startsWith('1 ') && !text.includes('tomar 1')) {
        return;
      }
    }

    console.log(`[LOG] Mensaje en grupo: "${msg.body.substring(0, 35)}..."`);

    const { phone: senderPhone, name: senderName } = await extractPhoneNumber(msg);
    const senderId = (msg.author || msg.from).replace(/@c\.us|@g\.us/g, '');

    // ==========================================
    // LÓGICA 1: CONDUCTOR TOMA EL SERVICIO EN EL GRUPO (Marca 1)
    // ==========================================
    const isOptionOne = text === '1' || text.startsWith('1 ') || text.includes('tomar 1');

    if (isOptionOne) {
      const match = text.match(/\d{5}/);
      const code = match ? match[0] : lastPendingCode;

      if (!code) {
        await msg.reply('⚠️ No hay ningún servicio activo pendiente en este momento.');
        return;
      }

      const service = pendingServices.get(code);

      if (!service) {
        await msg.reply(`❌ El servicio #${code} no existe o ya caducó.`);
        return;
      }

      if (service.status === 'ASSIGNED') {
        await msg.reply(`❌ El servicio #${code} ya fue tomado por otro compañero.`);
        return;
      }

      // Marcar como asignado
      service.status = 'ASSIGNED';
      pendingServices.set(code, service);

      let driverName = senderName || 'Felipe Martínez';
      let vehicle = 'Carro Rojo';
      let driverPhone = senderPhone || '573153898103';
      let driverRating = 5.0;

      // Buscar datos en el panel web
      try {
        const response = await fetch(`${botConfig.apiBaseUrl}/drivers`);
        const data = await response.json();
        const drivers = Array.isArray(data) ? data : (data.data || []);
        
        const foundDriver = drivers.find((d: any) => 
          (driverPhone && (driverPhone.includes(d.phone) || d.phone.includes(driverPhone))) ||
          (senderName && d.name && senderName.toLowerCase().includes(d.name.toLowerCase()))
        );

        if (foundDriver) {
          driverName = foundDriver.name || driverName;
          if (foundDriver.vehicle && foundDriver.vehicle.color) {
            vehicle = `Carro ${foundDriver.vehicle.color}`;
          }
          driverPhone = formatColombiaPhone(foundDriver.phone || driverPhone);
          driverRating = foundDriver.ratingAverage || 5.0;
        }
      } catch (err) {}

      // Sumar $500 COP a la deuda del conductor en el panel de contabilidad
      try {
        await fetch(`${botConfig.apiBaseUrl}/wallet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driverPhone: driverPhone,
            action: 'ADD_SERVICE',
            amount: 500
          })
        });
      } catch (e) {}

      let passengerPhone = service.passengerContact || '573174680398';

      console.log(`🏆 Servicio #${code} asignado en el grupo a: ${driverName}. Pasajero: ${passengerPhone}`);

      // ANUNCIO DE ASIGNACIÓN 100% EN EL GRUPO (SIN MENSAJES PRIVADOS)
      const groupAssignmentMsg = `✅ *¡SERVICIO #${code} ASIGNADO!* 🎉\n\n`
                               + `👨‍✈️ *Conductor:* ${driverName}\n`
                               + `⭐ *Calificación:* ${driverRating} estrellas\n`
                               + `🚘 *Vehículo:* ${vehicle}\n\n`
                               + `👤 *Cliente (Contacto):* wa.me/${passengerPhone}\n\n`
                               + `🤝 *El conductor se comunicará por privado.*`;

      await msg.reply(groupAssignmentMsg);
      return;
    }

    // ==========================================
    // LÓGICA 2: PASAJERO RESPONDE DESTINO EN EL GRUPO
    // ==========================================
    if (waitingPassengers.has(senderId)) {
      const pendingData = waitingPassengers.get(senderId);
      waitingPassengers.delete(senderId);

      const destination = msg.body;
      const finalPassengerPhone = pendingData.phone || senderPhone || '573174680398';
      await publicarServicioEnGrupo(msg, finalPassengerPhone, destination);
      return;
    }

    // ==========================================
    // LÓGICA 3: PASAJERO SOLICITA SERVICIO EN EL GRUPO
    // ==========================================
    const isServiceRequest = botConfig.keywords.some(keyword => text.includes(keyword));

    if (isServiceRequest) {
      console.log(`\n📩 SOLICITUD DE SERVICIO EN EL GRUPO`);
      waitingPassengers.set(senderId, { phone: senderPhone });
      await msg.reply(`📍 *¡Hola!* 👋 Por favor indícanos: ¿Hacia dónde te diriges? 🚕`);
    }
  } catch (error) {
    console.error('\n❌ ERROR ATRAPADO:', error);
  }
});

async function publicarServicioEnGrupo(msg: any, passengerPhone: string, destinationText: string) {
  const serviceCode = Math.floor(10000 + Math.random() * 90000).toString();

  await msg.reply(`⏳ *¡Un momento!* estamos buscando el conductor más cercano 🚘📍`);

  let finalPassengerPhone = formatColombiaPhone(passengerPhone);

  try {
    const response = await fetch(`${botConfig.apiBaseUrl}/passengers`);
    const data = await response.json();
    const passengers = Array.isArray(data) ? data : (data.data || []);
    
    const foundPassenger = passengers.find((p: any) => 
      (passengerPhone && (passengerPhone.includes(p.phone) || p.phone.includes(passengerPhone)))
    );

    if (foundPassenger && foundPassenger.phone) {
      finalPassengerPhone = formatColombiaPhone(foundPassenger.phone);
    }
  } catch (err) {}

  pendingServices.set(serviceCode, {
    id: serviceCode,
    destination: destinationText,
    passengerContact: finalPassengerPhone || '573174680398',
    status: 'PENDING',
    groupId: msg.from
  });

  lastPendingCode = serviceCode;

  const offerMsg = `🚨 *SERVICIO DISPONIBLE #${serviceCode}* 🚨\n\n`
                 + `📍 *Destino:* "${destinationText}"\n\n`
                 + `👉 *Para tomar el servicio, marca:* *1*`;

  await client.sendMessage(msg.from, offerMsg);
}

client.initialize();
