import { useEffect } from 'react'
import './padelwiark.css'
import PwNav from './components/PwNav'
import PwHero from './components/PwHero'
import PwTrust from './components/PwTrust'
import PwProblema from './components/PwProblema'
import PwFeatures from './components/PwFeatures'
import PwComo from './components/PwComo'
import PwPrecios from './components/PwPrecios'
import PwPorque from './components/PwPorque'
import PwFAQ from './components/PwFAQ'
import PwCTA from './components/PwCTA'

// Landing de ventas de PadelwIArk (web comercial de la empresa, ≠ landing del club).
// Se construye bloque por bloque; acá se van ensamblando las secciones.
const PadelwiarkLanding = () => {
  // Título de la pestaña solo mientras se está en esta página
  useEffect(() => {
    const prev = document.title
    document.title = 'PadelwIArk — El sistema operativo de tu club de pádel'
    return () => { document.title = prev }
  }, [])

  return (
    <div className="pw-root min-h-screen">
      <PwNav />
      <main>
        <PwHero />
        <PwTrust />
        <PwProblema />
        <PwFeatures />
        <PwComo />
        <PwPrecios />
        <PwPorque />
        <PwFAQ />
        <PwCTA />
      </main>
    </div>
  )
}

export default PadelwiarkLanding
