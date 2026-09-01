import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

class StartupBoundary extends Component<{children:ReactNode},{error:Error|null}> {
  state={error:null as Error|null}
  static getDerivedStateFromError(error:Error){return{error}}
  componentDidCatch(error:Error,info:ErrorInfo){console.error('X1 Content Studio startup error',error,info)}
  reset=()=>{
    try{for(const key of Object.keys(localStorage))if(key.startsWith('x1-content-studio'))localStorage.removeItem(key)}catch{/* reload still helps when storage is blocked */}
    location.reload()
  }
  render(){
    if(this.state.error)return <main className="startup-failure"><img src="/joint-x-logo.png" alt="Joint X logo"/><span>STARTUP RECOVERY</span><h1>The studio hit a startup error.</h1><p>Your files are intact. The technical message below identifies whether this is an app compatibility issue or damaged local project data.</p><pre>{this.state.error.message}</pre><div><button className="primary" onClick={()=>location.reload()}>Reload app</button><button onClick={this.reset}>Reset local workspace data</button></div></main>
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StartupBoundary><App /></StartupBoundary>
  </StrictMode>,
)

if('serviceWorker' in navigator&&location.protocol==='https:')window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))
