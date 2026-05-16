import nodemailer from "nodemailer";

export async function sendEmail(to: string, subject: string, html: string) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log("Missing email configuration")
        return;
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM
    const transporter = nodemailer.createTransport({
        host,
        port,
        auth: {
            user,
            pass
        }
    });

    await transporter.sendMail({
        from, to, subject, html
    })
}
