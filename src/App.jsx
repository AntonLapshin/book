import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { BookProvider } from './state'
import MainPage from './MainPage'
import EditPage from './EditPage'

export default function App() {
  return (
    <BrowserRouter>
      <BookProvider>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/edit" element={<EditPage />} />
        </Routes>
      </BookProvider>
    </BrowserRouter>
  )
}
