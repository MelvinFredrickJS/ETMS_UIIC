import nodemailer, { type Transporter } from 'nodemailer'

let transporter: Transporter | null = null

async function initMailer(): Promise<void> {
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
    console.log('📬 Mailer using SMTP:', process.env.SMTP_HOST)
  } else {
    const testAccount = await nodemailer.createTestAccount()
    transporter = nodemailer.createTransport({
      host:   'smtp.ethereal.email',
      port:   587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    })
    console.log('📬 Ethereal test account created:', testAccount.user)
  }
}

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!transporter) {
    console.warn('⚠️  Mailer not initialized — skipping email to:', to)
    return
  }
  try {
    const info = await transporter.sendMail({
      from:    process.env.MAIL_FROM || 'ETMS <noreply@uiic.co.in>',
      to,
      subject,
      html,
    })
    console.log(`📧 Email sent to ${to} — ${subject}`)
    const previewUrl = nodemailer.getTestMessageUrl(info)
    if (previewUrl) {
      console.log('🔗 Preview:', previewUrl)
    }
  } catch (err) {
    console.error(`❌ Failed to send email to ${to}:`, (err as Error).message)
  }
}

export { initMailer, sendMail }
