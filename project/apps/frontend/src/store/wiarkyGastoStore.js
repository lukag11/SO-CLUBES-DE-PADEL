import { create } from 'zustand'

// Canal chiquito entre WIarky y la pantalla de Gastos: cuando el dueño manda una factura
// por el chat, WIarky lee el OCR y deja el resultado acá; PagosPage cambia a la tab Gastos
// y GastosTab abre el ModalGasto prellenado (reusa la revisión que ya existe). One-shot.
const useWiarkyGastoStore = create((set) => ({
  datosOcr: null, // resultado de /gastos/extraer esperando abrirse en Gastos
  setDatosOcr: (d) => set({ datosOcr: d }),
  limpiar: () => set({ datosOcr: null }),
}))

export default useWiarkyGastoStore
