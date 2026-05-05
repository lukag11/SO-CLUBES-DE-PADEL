import { useState, useEffect } from 'react'

const BASE = 'https://apis.datos.gob.ar/georef/api'

export const useProvincias = () => {
  const [provincias, setProvincias] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${BASE}/provincias?orden=nombre&campos=id,nombre&max=24`)
      .then((r) => r.json())
      .then((data) => setProvincias(data.provincias.map((p) => p.nombre)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { provincias, loading }
}

export const useMunicipios = (provincia) => {
  const [municipios, setMunicipios] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!provincia) { setMunicipios([]); return }
    setLoading(true)
    const url = `${BASE}/municipios?provincia=${encodeURIComponent(provincia)}&orden=nombre&campos=id,nombre&max=500`
    fetch(url)
      .then((r) => r.json())
      .then((data) => setMunicipios(data.municipios.map((m) => m.nombre)))
      .catch(() => setMunicipios([]))
      .finally(() => setLoading(false))
  }, [provincia])

  return { municipios, loading }
}
