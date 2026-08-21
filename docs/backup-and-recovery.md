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

## Encrypted backup procedure (implemented, running)

Automated as of 2026-08-21. Script: `/home/docker/appdata/classpilot-backups/backup.sh`
on echo, run nightly at 03:00 via `scott`'s crontab
(`crontab -l` shows the entry; output logs to
`/home/docker/appdata/classpilot-backups/backup.log`).

What it does:

```bash
sqlite3 ./data/classpilot.sqlite ".backup '/tmp/classpilot-$ts.sqlite'"   # consistent live copy, safe under WAL
age -r age1xefl7wnq5ye34ewyv3pmqn97xp5f8vrj56dvyd6dwtpa0avr25fqjpvpkn \
  -o "$DEST/classpilot-$ts.sqlite.age" "/tmp/classpilot-$ts.sqlite"
rm -f "/tmp/classpilot-$ts.sqlite"
```

- **Destination:** `/mnt/media-chitek/Backup/Echo/classpilot/` — off-host, on
  the chitek NFS share, following the same `Backup/Echo/...` convention
  already used for other services on this box.
- **Retention:** 30 days, pruned automatically by the script (`find -mtime +30 -delete`).
- **Public key only** lives on echo, inside the script — encryption doesn't
  need the private key, so there's nothing sensitive to protect on the host
  itself if the script or repo leaks.
- **Private key** (`AGE-SECRET-KEY-1...`) was generated once, shown to Scott
  in chat, and is **not** stored anywhere on echo or in this repo — it must
  live in a password manager only. Without it, none of these backups are
  recoverable.

## Restore procedure

```bash
age -d -i <path to your saved private key file> \
  -o ./data/classpilot.sqlite \
  /mnt/media-chitek/Backup/Echo/classpilot/classpilot-YYYYMMDD-HHMMSS.sqlite.age
```

Then set the **same** `CLASSPILOT_DATA_KEY` in `.env` that was in use when the
backup was taken, and start the app. A different key cannot decrypt the fields.

## Test the restore before real data

Full dry run completed 2026-08-21:

1. Ran the real backup script against production.
2. Decrypted the resulting `.age` file to a scratch path with the real
   private key — confirmed real table data (`users`, `school_years` row
   counts matched known production state).
3. Repeated the decrypt with a freshly-generated, wrong key — `age` correctly
   refused (`no identity matched any of the recipients`).

Re-run this drill (steps 2-3 at least) periodically, and any time the backup
script or key changes.

## Pre-real-data checklist

- [ ] `CLASSPILOT_DATA_KEY` generated, set in `.env`, and copied to a password manager
- [ ] `./data` lives on an encrypted volume
- [ ] Strong `CLASSPILOT_APP_PASSWORD` and long random `CLASSPILOT_AUTH_SECRET`
- [ ] HTTPS + `CLASSPILOT_COOKIE_SECURE=true` for any remote access
- [x] Scheduled encrypted backups running, key stored separately — nightly cron on echo, `docs/backup-and-recovery.md` above has the details
- [x] A restore has been tested end to end — 2026-08-21, see above
