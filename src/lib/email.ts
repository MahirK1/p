import nodemailer from "nodemailer";
import { prisma } from "./prisma";

const transporter =
  process.env.SMTP_HOST && process.env.SMTP_USER
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: Number(process.env.SMTP_PORT ?? 587) === 465, // true za port 465, false za 587
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          // Ne odbacuj neispravne certifikate (za development)
          rejectUnauthorized: false,
        },
      })
    : null;

export async function sendOrderEmail(order: any) {
  // Provjeri da li je transporter konfigurisan
  if (!transporter) {
    console.error("❌ Email transporter nije konfigurisan. Provjerite environment varijable:");
    console.error("   SMTP_HOST:", process.env.SMTP_HOST ? "✅" : "❌");
    console.error("   SMTP_USER:", process.env.SMTP_USER ? "✅" : "❌");
    console.error("   SMTP_PASS:", process.env.SMTP_PASS ? "✅" : "❌");
    return;
  }

  try {
    const itemsText = order.items
      .map(
        (item: any) =>
          `${item.product.name} (${item.product.sku}) x ${item.quantity} = ${Number(item.lineTotal).toFixed(2)} KM`
      )
      .join("\n");

    const emailBody = `Nova narudžba je primljena!

Broj narudžbe: ${order.orderNumber}
Klijent: ${order.client.name}
Komercijalista: ${order.commercial.name}
Datum: ${new Date(order.createdAt).toLocaleString("bs-BA")}
Ukupno: ${Number(order.totalAmount).toFixed(2)} KM

Stavke:
${itemsText}

Molimo pregledajte narudžbu u sistemu: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/order-manager/orders/${order.id}`;

    const emailOptions = {
      from: '"B2B Portal" <enarudzba@italgroup.ba>',
      subject: `Nova narudžba ${order.orderNumber}`,
      text: emailBody,
    };

    // Slanje emaila na standardnu adresu
    try {
      console.log(`📧 Šaljem email na: web@italgroup.ba`);
      await transporter.sendMail({
        ...emailOptions,
        to: "web@italgroup.ba",
      });
      console.log(`✅ Email uspješno poslan na web@italgroup.ba`);
    } catch (error: any) {
      console.error("❌ Greška pri slanju emaila na web@italgroup.ba:", error.message);
      console.error("   Detalji:", error);
    }

    // Slanje emaila svim order managerima
    try {
      // ISPRAVKA: email je obavezno polje u User modelu, nema potrebe za provjerom null
      const orderManagers = await prisma.user.findMany({
        where: { 
          role: "ORDER_MANAGER",
        },
        select: { email: true, name: true },
      });

      console.log(`📧 Pronađeno ${orderManagers.length} order managera za notifikaciju`);

      for (const manager of orderManagers) {
        if (!manager.email || !manager.email.trim()) {
          console.warn(`⚠️ Order manager ${manager.name} nema validnu email adresu, preskačem...`);
          continue;
        }

        try {
          await transporter.sendMail({
            ...emailOptions,
            to: manager.email,
          });
          console.log(`✅ Email uspješno poslan na ${manager.email}`);
        } catch (error: any) {
          console.error(`❌ Greška pri slanju emaila na ${manager.email}:`, error.message);
        }
      }
    } catch (error: any) {
      console.error("❌ Greška pri dohvaćanju order managera:", error.message);
    }
  } catch (error: any) {
    console.error("❌ Kritična greška u sendOrderEmail:", error);
    throw error; // Re-throw da API route može uhvatiti
  }
}

export async function sendNewClientEmail(client: any, commercialName: string) {
  // Provjeri da li je transporter konfigurisan
  if (!transporter) {
    console.error("❌ Email transporter nije konfigurisan. Provjerite environment varijable:");
    console.error("   SMTP_HOST:", process.env.SMTP_HOST ? "✅" : "❌");
    console.error("   SMTP_USER:", process.env.SMTP_USER ? "✅" : "❌");
    console.error("   SMTP_PASS:", process.env.SMTP_PASS ? "✅" : "❌");
    return;
  }

  try {
    const clientDetails = [
      `Naziv: ${client.name}`,
      client.matBroj ? `ID broj: ${client.matBroj}` : null,
      client.pdvBroj ? `PDV broj: ${client.pdvBroj}` : null,
      client.address ? `Adresa: ${client.address}${client.city ? `, ${client.city}` : ''}` : null,
      client.phone ? `Telefon: ${client.phone}` : null,
      client.email ? `Email: ${client.email}` : null,
      client.contactPerson ? `Kontakt osoba: ${client.contactPerson}` : null,
      client.note ? `Napomena: ${client.note}` : null,
    ].filter(Boolean).join('\n');

    const emailBody = `Nova apoteka (klijent) je kreirana u sistemu!

Detalji apoteke:
${clientDetails}

Kreirao: ${commercialName}
Datum: ${new Date().toLocaleString("bs-BA")}

Molimo pregledajte klijenta u sistemu: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/admin/clients/${client.id}`;

    const emailOptions = {
      from: '"B2B Portal" <enarudzba@italgroup.ba>',
      subject: `Nova apoteka kreirana: ${client.name}`,
      text: emailBody,
    };

    // Slanje emaila na standardnu adresu
    try {
      console.log(`📧 Šaljem email o novoj apoteci na: web@italgroup.ba`);
      await transporter.sendMail({
        ...emailOptions,
        to: "web@italgroup.ba",
      });
      console.log(`✅ Email uspješno poslan na web@italgroup.ba`);
    } catch (error: any) {
      console.error("❌ Greška pri slanju emaila na web@italgroup.ba:", error.message);
      console.error("   Detalji:", error);
    }

    // Slanje emaila svim order managerima
    try {
      const orderManagers = await prisma.user.findMany({
        where: { 
          role: "ORDER_MANAGER",
        },
        select: { email: true, name: true },
      });

      console.log(`📧 Pronađeno ${orderManagers.length} order managera za notifikaciju`);

      for (const manager of orderManagers) {
        if (!manager.email || !manager.email.trim()) {
          console.warn(`⚠️ Order manager ${manager.name} nema validnu email adresu, preskačem...`);
          continue;
        }

        try {
          await transporter.sendMail({
            ...emailOptions,
            to: manager.email,
          });
          console.log(`✅ Email uspješno poslan na ${manager.email}`);
        } catch (error: any) {
          console.error(`❌ Greška pri slanju emaila na ${manager.email}:`, error.message);
        }
      }
    } catch (error: any) {
      console.error("❌ Greška pri dohvaćanju order managera:", error.message);
    }

    // Slanje emaila svim adminima
    try {
      const admins = await prisma.user.findMany({
        where: { 
          role: "ADMIN",
        },
        select: { email: true, name: true },
      });

      console.log(`📧 Pronađeno ${admins.length} admina za notifikaciju`);

      for (const admin of admins) {
        if (!admin.email || !admin.email.trim()) {
          console.warn(`⚠️ Admin ${admin.name} nema validnu email adresu, preskačem...`);
          continue;
        }

        try {
          await transporter.sendMail({
            ...emailOptions,
            to: admin.email,
          });
          console.log(`✅ Email uspješno poslan na ${admin.email}`);
        } catch (error: any) {
          console.error(`❌ Greška pri slanju emaila na ${admin.email}:`, error.message);
        }
      }
    } catch (error: any) {
      console.error("❌ Greška pri dohvaćanju admina:", error.message);
    }
  } catch (error: any) {
    console.error("❌ Kritična greška u sendNewClientEmail:", error);
    throw error;
  }
}