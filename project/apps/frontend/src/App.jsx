import { RouterProvider } from 'react-router-dom'
import router from './router'
import { ToastProvider } from './components/ui/ToastProvider'

const App = () => {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  )
}

export default App
