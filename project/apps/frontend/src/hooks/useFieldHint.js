import { useState, useRef, useCallback } from 'react'

// Hint efímero (mensaje ámbar que desaparece en 2s) para feedback al bloquear
// un carácter inválido. Ver skill form-validation.md.
const useFieldHint = () => {
  const [hint, setHint] = useState('')
  const timer = useRef(null)
  const show = useCallback((msg) => {
    setHint(msg)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setHint(''), 2000)
  }, [])
  return [hint, show]
}

export default useFieldHint
