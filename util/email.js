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

  newTransport() {
    if (config.env === 'production') {
      // Brevo (formerly Sendinblue) SMTP relay
      return nodemailer.createTransport({
        host: config.email.brevo.host,
        port: config.email.brevo.port,
        secure: false, // use STARTTLS on port 587
        requireTLS: true,
        auth: {
          user: config.email.brevo.username,
          pass: config.email.brevo.password,
        },
        connectionTimeout: 10000,
        socketTimeout: 10000,
      });
    }
    // Mailtrap (development / sandbox)
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

    // create transport and send
    await this.newTransport().sendMail(mailOptions);
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
