import { RouterProvider } from 'react-router-dom'
import router from './router'
import { ToastProvider } from './components/ui/ToastProvider'
import { ConfirmProvider } from './components/ui/ConfirmProvider'

const App = () => {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <RouterProvider router={router} />
      </ConfirmProvider>
    </ToastProvider>
  )
}

export default App
