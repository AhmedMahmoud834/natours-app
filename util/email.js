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
    this.from = config.email.from;
  }

  newTransport() {
    if (config.env === 'production') {
      // send grid
      return 1;
    }
    return nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      auth: {
        user: config.email.username,
        pass: config.email.password,
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

    // create transport
    this.newTransport();
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

  async sendBookingConfirmation(tour, booking) {
    const template = 'bookingConfirmation';
    const subject = `Your booking for ${tour.name} is confirmed!`;
    await this.send(template, subject, {
      tourName: tour.name,
      price: booking.price,
    });
  }
}

export default Email;
