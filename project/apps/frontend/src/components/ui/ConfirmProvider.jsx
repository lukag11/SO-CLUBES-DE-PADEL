import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'

// Confirmación unificada (reemplaza el confirm() nativo del navegador). Un Provider en la raíz
// + hook useConfirm() que devuelve una función que retorna una PROMESA<boolean>:
//   const confirmar = useConfirm()
//   if (!(await confirmar('¿Seguro?'))) return
//   if (!(await confirmar({ titulo, mensaje, confirmText, danger: true }))) return
const ConfirmContext = createContext(null)

export const ConfirmProvider = ({ children }) => {
  const [state, setState] = useState(null)
  const resolver = useRef(null)

  const confirm = useCallback((opts = {}) => {
    const o = typeof opts === 'string' ? { mensaje: opts } : opts
    setState({
      titulo: o.titulo ?? '¿Confirmás?',
      mensaje: o.mensaje ?? '',
      confirmText: o.confirmText ?? 'Confirmar',
      cancelText: o.cancelText ?? 'Cancelar',
      danger: !!o.danger,
    })
    return new Promise((resolve) => { resolver.current = resolve })
  }, [])

  const cerrar = (val) => {
    setState(null)
    if (resolver.current) { resolver.current(val); resolver.current = null }
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => cerrar(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-toast-enter">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${state.danger ? 'bg-rose-100' : 'bg-amber-100'}`}>
                <AlertTriangle size={18} className={state.danger ? 'text-rose-500' : 'text-amber-500'} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-slate-800 font-bold text-base">{state.titulo}</h3>
                {state.mensaje && <p className="text-slate-500 text-sm mt-1 whitespace-pre-line">{state.mensaje}</p>}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => cerrar(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">{state.cancelText}</button>
              <button onClick={() => cerrar(true)} className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors ${state.danger ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>{state.confirmText}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>')
  return ctx
}

export default ConfirmProvider
