import nodemailer from 'nodemailer'
import type { EmailChannelConfig } from '@pingboard/shared'
import type { ChannelDriver } from './types'
import { summarize } from './types'

export const emailDriver: ChannelDriver<EmailChannelConfig> = {
  async send(config, payload) {
    const { emoji, title, body, url } = summarize(payload)
    const transporter = createTransporter(config)
    const html = `
      <p><strong>${emoji} ${title}</strong></p>
      <p>${body}</p>
      ${url ? `<p><a href="${url}">View in PingBoard</a></p>` : ''}
    `
    if (!config.smtpFrom) {
      throw new Error(
        'SMTP "from" address is required. Set it on the channel or as a default in Settings.',
      )
    }
    await transporter.sendMail({
      from: config.smtpFrom,
      to: config.to,
      subject: `${emoji} [PingBoard] ${title}`,
      text: `${title}\n\n${body}${url ? `\n\n${url}` : ''}`,
      html,
    })
  },

  async testConfig(config) {
    const transporter = createTransporter(config)
    await transporter.verify()
  },
}

function createTransporter(config: EmailChannelConfig) {
  if (!config.smtpHost || !config.smtpPort) {
    throw new Error(
      'SMTP host and port are required. Set them on the channel or as defaults in Settings.',
    )
  }
  const auth =
    config.smtpUser && config.smtpPass
      ? { user: config.smtpUser, pass: config.smtpPass }
      : undefined
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure ?? config.smtpPort === 465,
    auth,
  })
}
