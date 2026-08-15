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

  async send(template, subject) {
    // render html
    const html = pug.renderFile(
      path.join(rootDir, '/views/email/', `${template}.pug`),
      {
        firstName: this.firstName,
        url: this.url,
        subject,
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
}

const sendEmail = async (options) => {
  // create transporter
  const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    auth: {
      user: config.email.username,
      pass: config.email.password,
    },
    connectionTimeout: 5000,
    socketTimeout: 5000,
  });

  // define mail options
  const mailOptions = {
    from: config.email.from,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  // send mail
  await transporter.sendMail(mailOptions);
};

export default Email;
