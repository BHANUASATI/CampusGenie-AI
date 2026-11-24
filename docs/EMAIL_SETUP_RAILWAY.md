# Fixing "Test" emails instead of login credentials

## What was happening

The registrar endpoints in `backend/src/registrar_routes.py` already build a proper
credentials email (subject **"🎓 Your CampusGenie Student Account Credentials"**,
HTML + plain text with the login email and password). The message you saw —
subject **"Test"**, body **"Test"**, sender `onboarding@resend.dev` — is a
**Resend test-mode message**, not the credentials email.

Two bugs made this confusing:

1. `FROM_EMAIL` defaulted to `onboarding@resend.dev`. That address is Resend's
   test sender: it can **only deliver to the email address that owns the Resend
   account**, and anything sent through it is treated as a test email. Every
   real student/faculty address would get a `403` from Resend.
2. The email was sent in a background thread and the API answered
   `email_sent: true` *optimistically*, before knowing whether Resend accepted
   the message. Failures were invisible in the dashboard.

## Code changes

- `backend/src/email_service.py`
  - Refuses to use `onboarding@resend.dev` in production unless
    `ALLOW_RESEND_TEST_SENDER=true` (local testing only).
  - Centralises the credentials template (`build_credentials_email`) and adds
    `send_credentials_email()` with both HTML and plain-text content.
  - Records the exact provider error in `email_service.last_error`.
- `backend/src/registrar_routes.py`
  - Sends credentials synchronously and returns the **real** result:
    `email_sent`, `email_error`. The UI now shows the failure reason instead of
    falsely claiming success.
  - Adds `GET /registrar/email/config` (configuration status, no secrets) and
    `POST /registrar/email/test` (sends a sample credentials email to a chosen
    address) for live troubleshooting.
- `frontend/src/components/RegistrarDashboard.tsx` shows the email error in the
  success alert.

## Railway setup (one time)

1. In [Resend → Domains](https://resend.com/domains), add and verify the domain
   you want to send from (e.g. `krmu.ac.in`) and add the DNS records shown.
2. In the **Railway backend service → Variables**, set:

   ```bash
   RESEND_API_KEY=re_xxxxxxxxxxxx
   FROM_EMAIL=CampusGenie <no-reply@your-verified-domain.com>
   # Optional, preferred over FROM_EMAIL when both are set:
   RESEND_FROM_EMAIL=CampusGenie <no-reply@your-verified-domain.com>
   FRONTEND_URL=https://campusgenie-ai-production-c6422709.up.railway.app
   ```

   Do **not** set `ALLOW_RESEND_TEST_SENDER` in production. Remove any old
   `FROM_EMAIL=onboarding@resend.dev` value.
3. Redeploy the backend service (Railway rebuilds from `main`).
4. Verify from a registrar session:

   ```bash
   curl -X GET https://<backend>/registrar/email/config \
     -H "Authorization: Bearer <token>"
   # expect: configured=true, using_test_sender=false

   curl -X POST https://<backend>/registrar/email/test \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"to_email":"you@example.com"}'
   # expect: success=true
   ```

5. Add a student from the registrar dashboard. The email subject should now be
   **"🎓 Your CampusGenie Student Account Credentials"** with an HTML card
   containing the login email, password, and login button.

> Resend's free tier still limits test-sender delivery to the account owner's
> address. Once a domain is verified, you can send to any student/faculty email.

## Without a domain

Resend cannot deliver to arbitrary students without a verified domain. Two
options avoid DNS changes; **Brevo is recommended on Railway** because it uses
HTTPS (some hosts block outbound SMTP ports).

### Option A (recommended): Brevo HTTPS API

1. Create a free account at [brevo.com](https://www.brevo.com), then go to
   **Senders & Domains → Senders → Add a sender** and verify an email address
   you control (e.g. your Gmail address). No domain or DNS records required.
2. Go to **API Keys** → **Generate new API key** with **Send emails** permission
   and copy the key.
3. In **Railway backend service → Variables**, set:

   ```bash
   EMAIL_PROVIDER=brevo
   BREVO_API_KEY=your-brevo-api-key
   BREVO_FROM_EMAIL=your-verified-sender@example.com
   FROM_EMAIL=your-verified-sender@example.com
   ```

   The existing `RESEND_API_KEY` can stay; `EMAIL_PROVIDER=brevo` forces Brevo.
4. Redeploy, then `GET /registrar/email/config` should return:

   ```json
   {"configured": true, "provider": "brevo", "using_test_sender": false}
   ```

5. Send a test with `POST /registrar/email/test`, then add a student again.

### Option B: Gmail SMTP

If you cannot verify a domain, use a mailbox that supports app passwords instead.
No DNS records are needed. Note that Railway may block SMTP ports; if sends
time out, use Option A.

1. In the Google Account for the sending mailbox: enable **2-Step Verification**,
   then go to **Security → 2-Step Verification → App passwords**, create one,
   and copy the 16-character password.
2. In **Railway backend service → Variables**, set:

   ```bash
   EMAIL_PROVIDER=smtp
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USERNAME=your-mailbox@gmail.com
   SMTP_PASSWORD=your-16-character-app-password
   FROM_EMAIL=your-mailbox@gmail.com
   ALLOW_RESEND_TEST_SENDER=false
   ```

   `RESEND_API_KEY` can be left in place — `EMAIL_PROVIDER=smtp` forces SMTP.
   Port `465` uses implicit SSL; other ports use STARTTLS.
3. Redeploy the backend and check `GET /registrar/email/config`:

   ```json
   {"configured": true, "provider": "smtp", "using_test_sender": false}
   ```

4. Send a test with `POST /registrar/email/test`, then add a student again.

Gmail may reject sends from a `From` address other than the mailbox itself, so
keep `FROM_EMAIL` equal to `SMTP_USERNAME`.
