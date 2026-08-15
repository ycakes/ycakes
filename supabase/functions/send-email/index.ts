// Supabase Auth "Send Email" hook: Supabase calls this function instead of
// sending its own confirmation email, so YCakes' actual account-confirmation
// email goes out through Resend (the locked stack decision — see
// ARCHITECTURE.md's "Auth (Phase 4)" section) rather than Supabase's built-in
// SMTP. Payload/signature verification follows the Standard Webhooks spec,
// same as Supabase's own docs example for this hook.
import { Webhook } from "npm:standardwebhooks@1.0.0";
import { Resend } from "npm:resend@4.0.1";

const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET")!;
const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);

type HookPayload = {
  user: {
    email: string;
    user_metadata?: { first_name?: string; locale?: string };
  };
  email_data: {
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
};

const copy = {
  en: {
    subject: "Confirm your YCakes account",
    heading: (name: string) => `Hi ${name || "there"},`,
    body: "Please confirm your email to finish creating your YCakes account.",
    cta: "Confirm Email",
    fallback: "If the button doesn't work, copy and paste this link into your browser:",
  },
  ar: {
    subject: "تأكيد حساب واي كيكس الخاص بك",
    heading: (name: string) => `مرحباً ${name || ""}`,
    body: "من فضلك أكّد بريدك الإلكتروني لإتمام إنشاء حسابك في واي كيكس.",
    cta: "تأكيد البريد الإلكتروني",
    fallback: "إذا لم يعمل الزر، انسخ هذا الرابط والصقه في متصفحك:",
  },
};

function renderEmail(locale: "en" | "ar", firstName: string, confirmUrl: string) {
  const c = copy[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  return `
    <div dir="${dir}" style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #501907;">${c.heading(firstName)}</h2>
      <p style="color: #2b1e19; font-size: 15px;">${c.body}</p>
      <a href="${confirmUrl}" style="display: inline-block; margin: 16px 0; padding: 12px 24px; background: #501907; color: #ffffff; border-radius: 999px; text-decoration: none; font-weight: 600;">
        ${c.cta}
      </a>
      <p style="color: #6b5c54; font-size: 13px;">${c.fallback}<br />${confirmUrl}</p>
    </div>
  `;
}

Deno.serve(async (req) => {
  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  let data: HookPayload;
  try {
    data = new Webhook(hookSecret).verify(payload, headers) as HookPayload;
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 401 });
  }

  const { user, email_data } = data;
  const locale: "en" | "ar" = user.user_metadata?.locale === "ar" ? "ar" : "en";
  const firstName = user.user_metadata?.first_name ?? "";

  const confirmUrl = `${email_data.site_url}/auth/confirm?token_hash=${email_data.token_hash}&type=${email_data.email_action_type}&next=${encodeURIComponent(email_data.redirect_to || "/")}`;

  try {
    // TODO: swap the from-address for a verified ycakes.net sender once that
    // domain is set up in Resend — onboarding@resend.dev is Resend's shared
    // test sender, fine for now but not a real launch-ready "from".
    await resend.emails.send({
      from: "YCakes <onboarding@resend.dev>",
      to: user.email,
      subject: copy[locale].subject,
      html: renderEmail(locale, firstName, confirmUrl),
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
