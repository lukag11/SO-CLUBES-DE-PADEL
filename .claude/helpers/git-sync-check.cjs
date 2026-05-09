#!/usr/bin/env node
// Chequea si la rama local está desactualizada respecto al remoto
// Se ejecuta en SessionStart para avisarte antes de arrancar a trabajar

const { execSync } = require('child_process')

try {
  // Fetch silencioso para actualizar refs remotas
  execSync('git fetch origin --quiet', { stdio: 'pipe' })

  const local  = execSync('git rev-parse HEAD',          { encoding: 'utf8' }).trim()
  const remote = execSync('git rev-parse origin/main',   { encoding: 'utf8' }).trim()

  if (local === remote) {
    console.log('✓ Repo sincronizado con origin/main')
    process.exit(0)
  }

  // Cuántos commits hay de diferencia
  const behind = execSync(`git rev-list HEAD..origin/main --count`, { encoding: 'utf8' }).trim()
  const ahead  = execSync(`git rev-list origin/main..HEAD --count`,  { encoding: 'utf8' }).trim()

  if (Number(behind) > 0) {
    console.log(`⚠️  ATENCIÓN: tu rama local está ${behind} commit(s) DETRÁS de origin/main`)
    console.log('   Hacé "git pull origin main" antes de arrancar a trabajar.')
  }

  if (Number(ahead) > 0) {
    console.log(`ℹ️  Tenés ${ahead} commit(s) locales sin pushear a origin/main`)
    console.log('   No olvides hacer push al terminar.')
  }

} catch (e) {
  // Si no hay red o no es un repo git, no bloqueamos la sesión
  process.exit(0)
}
