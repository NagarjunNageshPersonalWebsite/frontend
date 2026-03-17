Secure contact form + serverless handler

What I added
- Front-end: `index.html` updated to include a secure form (honeypot, ARIA, required fields) and a reference to `/form.js`.
- Client script: `form.js` — validates input, runs reCAPTCHA v3, posts to your API endpoint.
- Serverless: `lambda/send-email/index.js` — verifies reCAPTCHA server-side and sends email using AWS SES.

Quick setup checklist
1. reCAPTCHA v3
   - Create site/secret keys at https://www.google.com/recaptcha/admin
   - Replace `REPLACE_WITH_RECAPTCHA_SITE_KEY` in `index.html` and `REPLACE_WITH_RECAPTCHA_SITE_KEY` in `form.js`.
   - Set `RECAPTCHA_SECRET` env var for your Lambda.

2. AWS SES
   - Verify `SES_FROM` (sender) and `SES_TO` (destination) in SES (or move out of sandbox).
   - Set `SES_REGION`, `SES_FROM`, `SES_TO` as Lambda environment variables.

3. Deploy Lambda
   - From `lambda/send-email/` run `npm ci` then deploy with SAM/Serverless Framework, or create Lambda with Node 18 runtime and upload code.
   - Configure API Gateway endpoint (POST) that invokes the Lambda and enable CORS. Use a custom domain if possible.

4. Security recommendations (strongly advised)
   - Use API Gateway usage plans / quotas to rate-limit.
   - Put AWS WAF in front of API Gateway and enable common rulesets (AWSManagedRulesCommonRuleSet).
   - Enforce stricter Content-Security-Policy via server `Content-Security-Policy` header with nonces (requires server-side nonce injection).
   - Restrict `Access-Control-Allow-Origin` to your domain instead of `*`.
   - Monitor with CloudWatch and set alerts for spikes.
   - Consider storing messages in DynamoDB with TTL and alarm on high write rates.

5. Replace placeholders
   - `form.js`: set `RECAPTCHA_SITE_KEY` and `API_URL` to your deployed API Gateway endpoint.
   - `index.html`: set the reCAPTCHA script URL site key.

Notes
- The Lambda implements server-side verification of reCAPTCHA v3 and a honeypot check. For production, combine this with AWS WAF + API Gateway rate-limiting and strict CORS/CSP headers.
- If you need, I can add a SAM template or CloudFormation to deploy this Lambda + API Gateway + IAM role and example WAF rules.
