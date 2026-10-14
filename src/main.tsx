import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import { recoverInterruptedRestore } from './cloud/restoreJournal'

async function start() {
  await recoverInterruptedRestore()
  createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter><App /></BrowserRouter>
  </StrictMode>,
)
}
void start().catch(() => {
  const root = document.getElementById('root')!
  root.textContent = '恢复尚未完成，学习数据已保留。请关闭其他工作台标签并刷新重试。'
})

