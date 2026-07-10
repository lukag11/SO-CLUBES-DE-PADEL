import { useCallback, useEffect, useRef, useState } from 'react'

// Dictado por voz (speech-to-text) con la Web Speech API nativa del navegador.
// GRATIS y sin backend. Anda perfecto en Chrome/Edge desktop y Android.
//
// iPhone/iPad: Apple obliga a TODOS los navegadores (Chrome incluido) a usar WebKit,
// donde la Web Speech API es inestable. Por eso lo tratamos como NO soportado: el micrófono
// no aparece en iPhone (mejor que un botón roto). Cuando haya un cliente iPhone, se suma un
// camino server-side (Whisper) SIN tocar este hook ni el resto del componente.

const SR = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null

const esIOS = typeof navigator !== 'undefined' && (
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) // iPad que se hace pasar por Mac
)

export function useDictado({ onInterim, onTexto } = {}) {
  // Soportado solo donde la API es confiable (fuera de iOS).
  const soportado = !!SR && !esIOS
  const [grabando, setGrabando] = useState(false)
  const [error, setError] = useState(null) // 'not-allowed' | 'no-speech' | 'network' | 'error'
  const recRef = useRef(null)
  // Guardamos los callbacks en refs para no recrear el reconocimiento en cada render.
  const cbRef = useRef({ onInterim, onTexto })
  cbRef.current = { onInterim, onTexto }

  const parar = useCallback(() => {
    try { recRef.current?.stop() } catch { /* ya estaba parado */ }
  }, [])

  const arrancar = useCallback(() => {
    if (!SR || esIOS) { setError('unsupported'); return }
    setError(null)
    const rec = new SR()
    rec.lang = 'es-AR'
    rec.interimResults = true // transcripción en vivo mientras habla
    rec.continuous = false    // un disparo: mejor UX y evita quedar escuchando de más
    rec.maxAlternatives = 1

    let finalTxt = ''
    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalTxt += r[0].transcript
        else interim += r[0].transcript
      }
      if (interim) cbRef.current.onInterim?.(interim)
      if (finalTxt) cbRef.current.onTexto?.(finalTxt.trim())
    }
    rec.onerror = (e) => { setError(e.error || 'error'); setGrabando(false) }
    rec.onend = () => setGrabando(false)

    recRef.current = rec
    try { rec.start(); setGrabando(true) }
    catch { setError('error') } // start() tira si ya había uno corriendo
  }, [])

  // Al desmontar, cortar el micrófono sí o sí (no dejarlo abierto tras cerrar el chat).
  useEffect(() => () => { try { recRef.current?.abort() } catch { /* */ } }, [])

  return { soportado, grabando, error, arrancar, parar }
}
