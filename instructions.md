# solidtime

## Documentation

- [solidtime user guide](https://docs.solidtime.io/) ([source](https://github.com/solidtime-io/docs/tree/main/docs/user-guide)) — tracking time, projects, clients, billable rates, imports, exports and API tokens.
- [Super admin panel](https://docs.solidtime.io/self-hosting/super-admin-panel) ([source](https://github.com/solidtime-io/docs/blob/main/docs/self-hosting/super-admin-panel.md)) — what the admin account can do at `/admin`.

## What you get on StartOS

One **Web UI** interface: the solidtime web app, its API, and the sign-in page the desktop app and browser extensions use. Your time entries, projects and clients live in a database on your server, and files solidtime keeps (exports, imports, profile pictures) live beside it. Reports export to CSV, Excel and PDF.

Nobody can create an account until you allow it: solidtime's login page still shows a **Register here!** link, but the form refuses new accounts. The package creates the first account for you, and that account can open solidtime's super admin panel.

## Getting set up

1. StartOS asks you to create the admin account. Run **Create Admin Account**, enter your name and the email you want to sign in with; it does not need to receive mail. Copy the password it shows you.
2. Start solidtime, open the **Web UI**, and sign in with that email and password.
3. If you'll invite anyone, run **Set Primary URL** and pick an address everyone you invite can reach. solidtime puts it in invitation emails and shows it in **Connect Apps**.
4. To send those emails, run **Configure SMTP**. Until you do, nothing is emailed: solidtime writes each email to the service's log instead.

## Using solidtime

### Inviting people

Invite people from the **Members** page in solidtime. The invited person opens the link in the invitation email, then signs up with that email, so you need **Configure SMTP** set up first. They can only sign up once you allow it: run **Configure Sign-up** and choose **Invited people**, or **Anyone** if this is a public instance.

### Desktop app and browser extensions

1. Run **Connect Apps**. It shows an instance URL and two client IDs.
2. In the solidtime desktop app or browser extension, open **Instance Settings**, enter the instance URL and the matching client ID, then sign in.

If solidtime's address changes, after a restore for example, run **Connect Apps** again and update the instance URL in each app.

The app must be able to reach the instance URL, and trust its certificate. On your own network that means trusting your server's root CA on that computer; over a public domain with a certificate from a public authority, nothing extra is needed.

### Personal API tokens

You can create API tokens in solidtime's own user settings; nothing needs setting up first.

### Actions

- **Reset Admin Password** — gives the admin account a new random password if you've lost yours.
- **Set Primary URL** — the address solidtime uses in invitation emails and **Connect Apps**.
- **Configure Sign-up** — who can create their own account: nobody, invited people, or anyone.
- **Configure SMTP** — how solidtime sends email.
- **Connect Apps** — the instance URL and client IDs for the desktop app and browser extensions.
