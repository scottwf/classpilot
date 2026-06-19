# Backup & Recovery Runbook

ClassPilot holds the most sensitive data a teacher keeps: student profiles,
notes, contacts, accommodations, and reminders. This runbook is the operational
baseline that must be in place **before entering real student information**.

It complements the in-app protections (auth + `proxy.ts` backstop + field-level
encryption); see [student-cms-plan.md](student-cms-plan.md) section 4.

## Two layers of encryption

1. **Field-level (in app).** Sensitive Student CMS columns (note bodies, support
   plan details/strategies, contact email/phone/notes, birthdate, student number,
   strengths) are encrypted with AES-256-GCM via `src/lib/crypto/field-cipher.ts`
   using `CLASSPILOT_DATA_KEY`. Names and dates stay plaintext so the roster
   remains searchable/sortable.
2. **Volume (operational).** Host the `./data` directory on an encrypted
   filesystem (LUKS / FileVault / encrypted ZFS dataset). This protects the
   non-encrypted columns and the database structure itself.

## Generate and store the data key

```bash
openssl rand -base64 32
```

- Put the value in `.env` as `CLASSPILOT_DATA_KEY` and in your homelab secret
  store / password manager.
- **Do not** store the key inside any backup that also contains the database.
- The app fails closed in production if the key is missing, and rejects a key
  that does not decode to 32 bytes.

> If the key is lost, every encrypted field becomes permanently unrecoverable.
> Names, dates, and structure survive (they are not encrypted), but notes,
> contact details, accommodations, etc. do not. Treat key custody as seriously as
> the backups themselves.

## What to back up

- `./data/classpilot.sqlite` (the database)
- `.env` is **not** a backup artifact — it holds the key. Back up the key
  separately via your password manager.
- (Future, Phase 2b) the private uploads directory, once attachments ship.

## Encrypted backup procedure

Stop writes (or accept a quiesced copy), then snapshot and encrypt. Example using
`age`:

```bash
# one-time: create a backup keypair, store the private key safely
age-keygen -o classpilot-backup.key   # prints a public key "age1..."

# scheduled backup (public-key encryption; no secrets on the box)
ts=$(date +%Y%m%d-%H%M%S)
sqlite3 ./data/classpilot.sqlite ".backup '/tmp/classpilot-$ts.sqlite'"
age -r age1XXXXXXXX -o "/backups/classpilot-$ts.sqlite.age" "/tmp/classpilot-$ts.sqlite"
rm -f "/tmp/classpilot-$ts.sqlite"
```

`gpg --symmetric --cipher-algo AES256` is an acceptable alternative if you prefer
a passphrase-based flow.

Notes:
- `sqlite3 .backup` produces a consistent copy even while the app is running.
- Keep several dated copies and rotate; verify free space.

## Restore procedure

```bash
age -d -i classpilot-backup.key -o ./data/classpilot.sqlite "/backups/classpilot-YYYYMMDD-HHMMSS.sqlite.age"
```

Then set the **same** `CLASSPILOT_DATA_KEY` in `.env` that was in use when the
backup was taken, and start the app. A different key cannot decrypt the fields.

## Test the restore before real data

Do a full dry run on a throwaway directory:

1. Encrypt a backup of the current (demo) database.
2. Restore it to a scratch path and point `CLASSPILOT_DATABASE_PATH` at it.
3. Start the app, open a student profile, and confirm encrypted fields (notes,
   contact details) render correctly with the same key.
4. Confirm that starting with a **wrong/empty** key fails to reveal those fields.

Document the date of your last successful restore test.

## Pre-real-data checklist

- [ ] `CLASSPILOT_DATA_KEY` generated, set in `.env`, and copied to a password manager
- [ ] `./data` lives on an encrypted volume
- [ ] Strong `CLASSPILOT_APP_PASSWORD` and long random `CLASSPILOT_AUTH_SECRET`
- [ ] HTTPS + `CLASSPILOT_COOKIE_SECURE=true` for any remote access
- [ ] Scheduled encrypted backups running, key stored separately
- [ ] A restore has been tested end to end
