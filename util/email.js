import pug from 'pug';
import nodemailer from 'nodemailer';
import path from 'node:path';
import { htmlToText } from 'html-to-text';
import config from '../config/index.js';
import rootDir from './rootDir.js';

class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from =
      config.env === 'production'
        ? config.email.brevo.from
        : config.email.mailtrap.from;
  }

  // Mailtrap transport (development only)
  newTransport() {
    return nodemailer.createTransport({
      host: config.email.mailtrap.host,
      port: config.email.mailtrap.port,
      auth: {
        user: config.email.mailtrap.username,
        pass: config.email.mailtrap.password,
      },
      connectionTimeout: 5000,
      socketTimeout: 5000,
    });
  }

  // Send via Brevo HTTP API (production) — HTTPS port 443, never blocked
  async sendBrevo(mailOptions) {
    const [senderName, senderEmail] = this.from
      .match(/^(.+)\s*<(.+)>$/)
      ?.slice(1) || ['Natours', this.from];

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': config.email.brevo.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: senderName.trim(), email: senderEmail.trim() },
        to: [{ email: mailOptions.to }],
        subject: mailOptions.subject,
        htmlContent: mailOptions.html,
        textContent: mailOptions.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Brevo API error (${res.status}): ${body}`);
    }
  }

  async send(template, subject, data = {}) {
    // render html
    const html = pug.renderFile(
      path.join(rootDir, '/views/email/', `${template}.pug`),
      {
        firstName: this.firstName,
        url: this.url,
        subject,
        ...data,
      },
    );
    // define mail options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText(html),
    };

    // Production: Brevo HTTP API | Development: Mailtrap SMTP
    if (config.env === 'production') {
      await this.sendBrevo(mailOptions);
    } else {
      await this.newTransport().sendMail(mailOptions);
    }
  }

  async sendWelcome() {
    const template = 'welcome';
    const subject = 'welcome to the Natours Family!';
    await this.send(template, subject);
  }

  async sendPasswordReset() {
    const template = 'passwordReset';
    const subject = 'Your password reset link is valid for only 10 minutes';
    await this.send(template, subject);
  }

  async sendAccountActivation(name, password) {
    const template = 'accountActivation';
    const subject = 'Your Natours account has been activated!';
    await this.send(template, subject, {
      password: password,
      name: name,
    });
  }

  async sendBookingConfirmation(tour, booking) {
    const template = 'bookingConfirmation';
    const subject = `Your booking for ${tour.name} is confirmed!`;
    await this.send(template, subject, {
      tourName: tour.name,
      price: booking.price,
      participants: booking.participants || 1,
    });
  }

  async sendBookingCancellation(tour, booking) {
    const template = 'bookingCancellation';
    const subject = `Your booking for ${tour.name} has been cancelled`;
    await this.send(template, subject, {
      tourName: tour.name,
      price: booking.price,
      participants: booking.participants || 1,
    });
  }

  async sendBookingRefund(tour, booking) {
    const template = 'bookingRefund';
    const subject = `Refund processed for ${tour.name} ($${booking.price})`;
    await this.send(template, subject, {
      tourName: tour.name,
      price: booking.price,
      participants: booking.participants || 1,
    });
  }
}

export default Email;
