import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  const { naam, school, email, onderwerp, bericht } = await req.json()

  if (!naam?.trim() || !school?.trim() || !email?.trim() || !bericht?.trim()) {
    return NextResponse.json({ error: 'Verplichte velden ontbreken.' }, { status: 400 })
  }

  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  try {
    await transporter.sendMail({
      from:     `"TOA Planner Contact" <${process.env.SMTP_USER}>`,
      to:       process.env.CONTACT_EMAIL ?? 'info@toaplanner.nl',
      replyTo:  email,
      subject:  onderwerp || 'Contactformulier TOA Planner',
      text: `Naam:   ${naam}\nSchool: ${school}\nEmail:  ${email}\n\n${bericht}`,
      html: `
        <p><strong>Naam:</strong> ${naam}</p>
        <p><strong>School:</strong> ${school}</p>
        <p><strong>E-mail:</strong> <a href="mailto:${email}">${email}</a></p>
        <hr>
        <p>${bericht.replace(/\n/g, '<br>')}</p>
      `,
    })
  } catch {
    return NextResponse.json({ error: 'Versturen mislukt.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
