// Sends the OTP. Pick a provider with SMS_PROVIDER in .env.local
export const isDevSms = () => process.env.NODE_ENV !== 'production' && (process.env.SMS_PROVIDER || 'console') === 'console';

export async function sendOtpSms(phone, otp) {
  const provider = process.env.SMS_PROVIDER || 'console';

  if (provider === 'console') {
    console.log(`\n[Green Coins OTP] ${phone}  ->  ${otp}\n`);
    return;
  }
  if (provider === 'msg91') {
    const { MSG91_AUTH_KEY: key, MSG91_TEMPLATE_ID: tpl } = process.env;
    const url = `https://control.msg91.com/api/v5/otp?template_id=${tpl}&mobile=${phone.replace('+', '')}&authkey=${key}&otp=${otp}&otp_expiry=5`;
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.type === 'error') throw new Error('MSG91 failed: ' + JSON.stringify(d));
    return;
  }
  if (provider === 'twilio') {
    const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: tok, TWILIO_FROM: from } = process.env;
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${tok}`).toString('base64'), 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: phone, From: from, Body: `Your Green Coins verification code is ${otp}. It is valid for 5 minutes.` })
    });
    if (!r.ok) throw new Error('Twilio failed: ' + (await r.text()));
    return;
  }
  throw new Error('Unknown SMS_PROVIDER: ' + provider);
}
