export const DEFAULT_LANG = 'en_US'

const dict = {
  // actions/connectApps.ts
  'Connect Apps': 0,
  'Show the instance URL and client IDs the solidtime desktop app and browser extensions sign in with. The first run creates their sign-in clients; later runs show the same IDs.': 1,
  'The package has not finished installing': 2,
  'In the desktop app, open Instance Settings and enter the instance URL and the desktop client ID. In a browser extension, open its instance settings and enter the instance URL and the browser extension client ID.': 3,
  'Instance URL': 4,
  'Desktop app client ID': 5,
  'Browser extension client ID': 6,

  // actions/manageSmtp.ts
  'Configure SMTP': 7,
  'Let solidtime send email: organization invitations, password resets, email verification and reminders about running timers. Without it, solidtime writes those emails to its log instead. solidtime restarts to apply it.': 8,

  // actions/createAdmin.ts, actions/resetAdminPassword.ts
  Name: 9,
  'The name shown for the admin in solidtime': 10,
  Email: 11,
  'The email address the admin signs in with. It does not need to receive mail.': 12,
  'Must be an email address': 13,
  'Reset Admin Password': 14,
  'Create Admin Account': 15,
  'Create the admin account and show its password. The admin can open the super admin panel at /admin.': 16,
  'Replaces the admin password.': 17,
  'Admin Login': 18,
  'The password is active. Sign in to solidtime with it.': 19,
  'solidtime applies this when it next starts. Sign in with it once it is running.': 20,
  Password: 21,

  // actions/setPrimaryUrl.ts
  'Set Primary URL': 22,
  'Choose the address solidtime puts in invitation emails and other emails it sends in the background, and the instance URL Connect Apps shows. A running solidtime restarts to apply it.': 23,
  'Primary URL': 24,
  'Pick an address everyone you invite can reach. Until you pick one, solidtime uses a public domain if this interface has one, otherwise its .local address.': 25,

  // actions/setSignUp.ts
  'Who can sign up': 26,
  Nobody: 27,
  'Invited people': 28,
  Anyone: 29,
  'Configure Sign-up': 30,
  'Invited people sign up with the email their organization invitation went to, after opening its link.': 46,
  'Give the admin account a new random password and show it.': 47,
  'The admin account no longer exists in solidtime': 48,
  'Choose who can create their own solidtime account. The admin account always exists, whatever you choose. solidtime restarts to apply it.': 31,

  // init/watchAdmin.ts
  'Create the admin account before starting solidtime': 32,

  // interfaces.ts
  'Web UI': 33,
  'The solidtime web app and API. The desktop app and browser extensions sign in here too.': 34,

  // main.ts
  'Starting solidtime': 35,
  'Generated secrets are missing from store.json': 36,
  'No admin account has been set up': 37,
  'Web Interface': 38,
  'The web interface is ready': 39,
  'The web interface is not ready': 40,
  'PDF Export': 41,
  'PDF export is ready': 42,
  'The PDF renderer is not responding': 43,

  // utils.ts
  'solidtime could not set up the admin account:': 44,
  'solidtime did not generate its keys': 45,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
