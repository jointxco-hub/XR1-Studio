import { useEffect, useRef, useState } from 'react'

type WakeLockSentinelLike = { released:boolean; release:()=>Promise<void>; addEventListener:(type:'release',listener:()=>void)=>void }

export function useWakeLock(active: boolean) {
  const sentinel = useRef<WakeLockSentinelLike | null>(null)
  const [held,setHeld]=useState(false)
  useEffect(()=>{
    let cancelled=false
    const release=async()=>{const current=sentinel.current;sentinel.current=null;if(current&&!current.released)await current.release().catch(()=>{});if(!cancelled)setHeld(false)}
    const acquire=async()=>{
      const wakeLock=(navigator as Navigator & {wakeLock?:{request:(type:'screen')=>Promise<WakeLockSentinelLike>}}).wakeLock
      if(!active||document.visibilityState!=='visible'||!wakeLock)return
      try{const lock=await wakeLock.request('screen');if(cancelled){await lock.release();return}sentinel.current=lock;setHeld(true);lock.addEventListener('release',()=>setHeld(false))}catch{/* Unsupported or blocked; recording remains usable. */}
    }
    const visibility=()=>{if(document.visibilityState==='visible'&&active)void acquire();else void release()}
    void acquire();document.addEventListener('visibilitychange',visibility)
    return()=>{cancelled=true;document.removeEventListener('visibilitychange',visibility);void release()}
  },[active])
  return held
}

