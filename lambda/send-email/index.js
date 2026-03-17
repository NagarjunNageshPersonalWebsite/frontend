/*
 AWS Lambda handler to verify reCAPTCHA v3 and send email via SES.
 Environment variables required:
 - RECAPTCHA_SECRET
 - SES_REGION
 - SES_FROM (verified in SES)
 - SES_TO (destination email)
 - MIN_RECAPTCHA_SCORE (optional, default 0.5)

 Deploy behind API Gateway. Use AWS WAF / API Gateway rate limiting for production.
*/

const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const REGION = process.env.SES_REGION || 'us-east-1';
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET || '';
const SES_FROM = process.env.SES_FROM || '';
const SES_TO = process.env.SES_TO || '';
const MIN_SCORE = parseFloat(process.env.MIN_RECAPTCHA_SCORE || '0.5');

const ses = new SESClient({ region: REGION });

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: JSON.stringify(body)
  };
}

function sanitize(str) {
  if (!str) return '';
  return String(str).replace(/[\u0000-\u001F\u007F<>]/g, '').trim().slice(0, 2000);
}

exports.handler = async (event) => {
  try {
    const body = event.body ? (typeof event.body === 'string' ? JSON.parse(event.body) : event.body) : {};

    const { name, email, message, recaptchaToken, source, hp_website } = body;

    // Honeypot
    if (hp_website && hp_website.trim() !== '') return jsonResponse(400, { error: 'Bot detected' });

    if (!recaptchaToken || !RECAPTCHA_SECRET) return jsonResponse(400, { error: 'Missing recaptcha or configuration' });

    // Verify reCAPTCHA
    const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(RECAPTCHA_SECRET)}&response=${encodeURIComponent(recaptchaToken)}`
    });
    const verifyJson = await verifyRes.json();

    if (!verifyJson.success || (verifyJson.score || 0) < MIN_SCORE) {
      return jsonResponse(403, { error: 'reCAPTCHA verification failed', score: verifyJson.score || 0 });
    }

    // Basic validation
    const cleanName = sanitize(name);
    const cleanEmail = sanitize(email);
    const cleanMessage = sanitize(message);

    if (!cleanName || !cleanEmail || !cleanMessage) return jsonResponse(400, { error: 'Invalid input' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return jsonResponse(400, { error: 'Invalid email' });

    // Compose SES email
    const subject = `Website message from ${cleanName}`;
    const bodyText = `From: ${cleanName} <${cleanEmail}>\nSource: ${source || 'unknown'}\n\n${cleanMessage}`;

    const params = {
      Destination: { ToAddresses: [SES_TO] },
      Message: {
        Body: { Text: { Data: bodyText } },
        Subject: { Data: subject }
      },
      Source: SES_FROM
    };

    await ses.send(new SendEmailCommand(params));

    return jsonResponse(200, { ok: true });
  } catch (err) {
    console.error('handler error', err);
    return jsonResponse(500, { error: 'internal_error' });
  }
};
