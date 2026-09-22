// Local Postgres is only run as a native Windows service on Windows dev
// machines (see splitsync/README.md) — on Mac/Linux, Postgres normally
// comes from Docker Compose or a system package instead, so this is a
// no-op there.
if (process.platform !== 'win32') {
  process.exit(0)
}

const { execSync } = await import('node:child_process')

const serviceName = 'postgresql-x64-16'

function serviceIsRunning() {
  try {
    const output = execSync(`sc query "${serviceName}"`, { encoding: 'utf8' })
    return /STATE\s*:\s*4\s*RUNNING/.test(output)
  } catch {
    return null // service not found / sc failed — nothing we can do here
  }
}

const running = serviceIsRunning()
if (running === null) {
  console.warn(`[ensure-postgres] Service "${serviceName}" not found — skipping. Is PostgreSQL installed?`)
  process.exit(0)
}

if (running) {
  process.exit(0)
}

try {
  execSync(`net start "${serviceName}"`, { stdio: 'inherit' })
} catch {
  console.warn(
    `[ensure-postgres] Could not start "${serviceName}" automatically (likely a permissions issue).\n` +
      `Run this once in an admin PowerShell to fix it permanently:\n` +
      `  sc.exe sdset ${serviceName} "D:(A;;CCLCSWRPWPDTLOCRRC;;;SY)(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;BA)(A;;CCLCSWLOCRRC;;;IU)(A;;CCLCSWLOCRRC;;;SU)(A;;RPWP;;;IU)"\n` +
      `Or start it manually: net start ${serviceName}`,
  )
}
