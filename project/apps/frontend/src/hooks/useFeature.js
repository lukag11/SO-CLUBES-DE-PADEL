import useAuthStore from '../store/authStore'

// Devuelve true si el plan del club habilita la feature.
// Mientras las features no cargaron (user/me en vuelo) asumimos habilitado para
// evitar parpadeos; el backend igual bloquea cualquier llamada no permitida.
export const useFeatures = () => useAuthStore((s) => s.user?.club?.features) || null

const useFeature = (featureId) => {
  const features = useFeatures()
  if (!features) return true
  return features.includes(featureId)
}

export default useFeature
