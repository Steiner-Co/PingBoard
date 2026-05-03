import { eq } from 'drizzle-orm'
import { createDb, runMigrations, users } from '@pingboard/db'
import { loadConfig } from './config'

async function resetPassword(email: string): Promise<void> {
  const config = loadConfig()
  runMigrations(config.dbPath, config.migrationsDir ?? undefined)
  const db = createDb(config.dbPath)

  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()))
  if (!user) {
    console.error(`No user found with email "${email}".`)
    process.exit(1)
  }

  const newPassword = generatePassword(20)
  const passwordHash = await Bun.password.hash(newPassword)
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id))

  console.log()
  console.log(`Password reset for ${email}.`)
  console.log()
  console.log(`  New password: ${newPassword}`)
  console.log()
  console.log('Sign in with this password, then change it from Settings.')
}

function generatePassword(length: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
  let result = ''
  const buf = new Uint8Array(length)
  crypto.getRandomValues(buf)
  for (let i = 0; i < length; i++) {
    result += alphabet[buf[i]! % alphabet.length]
  }
  return result
}

function showHelp(): void {
  console.log(`PingBoard CLI

Usage:
  pingboard                        Start the server (default)
  pingboard reset-password <email>   Reset an admin's password
  pingboard --version
  pingboard --help`)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const cmd = args[0]

  if (cmd === '--version' || cmd === '-v') {
    console.log('PingBoard 0.0.0')
    return
  }
  if (cmd === '--help' || cmd === '-h' || cmd === 'help') {
    showHelp()
    return
  }
  if (cmd === 'reset-password') {
    const email = args[1]
    if (!email) {
      console.error('Usage: pingboard reset-password <email>')
      process.exit(1)
    }
    await resetPassword(email)
    return
  }

  console.error(`Unknown command: ${cmd}`)
  showHelp()
  process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
