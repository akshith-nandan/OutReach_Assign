import nodemailer from 'nodemailer';
export interface EtherealCredentials {
  user: string;
  pass: string;
  smtpHost: string;
  smtpPort: number;
}
export async function createEtherealAccount(): Promise<EtherealCredentials> {
  const testAccount = await nodemailer.createTestAccount();
  return {
    user: testAccount.user,
    pass: testAccount.pass,
    smtpHost: testAccount.smtp.host,
    smtpPort: testAccount.smtp.port,
  };
}
export function createTransporter(smtpUser: string, smtpPass: string, smtpHost = 'smtp.ethereal.email', smtpPort = 587) {
  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}
export async function sendEmailViaEthereal(options: {
  smtpUser: string;
  smtpPass: string;
  senderName: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
}): Promise<{ messageId: string; previewUrl: string | false }> {
  const transporter = createTransporter(options.smtpUser, options.smtpPass);
  const info = await transporter.sendMail({
    from: `"${options.senderName}" <${options.senderEmail}>`,
    to: options.recipientEmail,
    subject: options.subject,
    text: options.body,
    html: `<div style="font-family: sans-serif; padding: 20px; line-height: 1.6;">
            <h2>${options.subject}</h2>
            <div style="margin-top: 15px;">${options.body.replace(/\n/g, '<br/>')}</div>
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;"/>
            <p style="font-size: 12px; color: #777;">Sent via ReachInbox Email Job Scheduler (Ethereal Fake SMTP)</p>
          </div>`,
  });
  const previewUrl = nodemailer.getTestMessageUrl(info);
  return {
    messageId: info.messageId,
    previewUrl,
  };
}
