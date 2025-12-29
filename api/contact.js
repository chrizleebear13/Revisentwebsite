import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firstName, lastName, email, company, role, interest, message } = req.body || {};

  if (!firstName || !lastName || !email || !company || !interest) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const name = `${firstName} ${lastName}`;
  const interestLabels = {
    pilot: 'Booking a Pilot',
    demo: 'Requesting a Demo',
    pricing: 'Pricing Information',
    partnership: 'Partnership Opportunities',
    general: 'General Inquiry'
  };
  const subject = interestLabels[interest] || interest;

  const rawMailTo = process.env.MAIL_TO || 'chris@revisent.com,nayan@revisent.com';
  const parsed = rawMailTo.split(',').map(s => s.trim()).filter(Boolean);
  const to = parsed.length > 1 ? parsed : parsed[0];

  try {
    await resend.emails.send({
      from: process.env.MAIL_FROM || 'onboarding@resend.dev',
      to,
      replyTo: email,
      subject: `[Revisent Contact] ${subject}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Company:</strong> ${company}</p>
          <p><strong>Role:</strong> ${role || 'Not specified'}</p>
          <p><strong>Interest:</strong> ${subject}</p>
          ${message ? `<p><strong>Message:</strong></p><p>${String(message).replace(/\n/g, '<br/>')}</p>` : ''}
        </div>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Email error:', err);
    return res.status(500).json({ error: 'Failed to send', detail: err?.message });
  }
} 