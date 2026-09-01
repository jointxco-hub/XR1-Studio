import { useCallback, useEffect, useState } from 'react'

const CAMERA_KEY='xr1-selected-camera'
const MICROPHONE_KEY='xr1-selected-microphone'

export function useMediaDevices() {
  const [devices,setDevices]=useState<MediaDeviceInfo[]>([])
  const [cameraId,setCameraIdState]=useState(()=>localStorage.getItem(CAMERA_KEY)||'')
  const [microphoneId,setMicrophoneIdState]=useState(()=>localStorage.getItem(MICROPHONE_KEY)||'')
  const refresh=useCallback(async()=>{
    if(!navigator.mediaDevices?.enumerateDevices)return
    try{setDevices(await navigator.mediaDevices.enumerateDevices())}catch{setDevices([])}
  },[])
  useEffect(()=>{void refresh();navigator.mediaDevices?.addEventListener?.('devicechange',refresh);return()=>navigator.mediaDevices?.removeEventListener?.('devicechange',refresh)},[refresh])
  const setCameraId=(id:string)=>{setCameraIdState(id);if(id)localStorage.setItem(CAMERA_KEY,id);else localStorage.removeItem(CAMERA_KEY)}
  const setMicrophoneId=(id:string)=>{setMicrophoneIdState(id);if(id)localStorage.setItem(MICROPHONE_KEY,id);else localStorage.removeItem(MICROPHONE_KEY)}
  return {devices,cameras:devices.filter(d=>d.kind==='videoinput'),microphones:devices.filter(d=>d.kind==='audioinput'),cameraId,microphoneId,setCameraId,setMicrophoneId,refresh}
}

