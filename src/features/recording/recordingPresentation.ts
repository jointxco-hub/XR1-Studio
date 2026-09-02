export type TakeSaveStatus='saving'|'durable'|'failed'
export function takeSaveLabel(status:TakeSaveStatus){
  if(status==='saving')return'Saving to device…'
  if(status==='durable')return'Saved on this device'
  return'Available in this session · save a copy before leaving'
}
export function unavailableTakeCopy(hasPlayableUrl:boolean){
  return hasPlayableUrl?'':'Media no longer available · this take predates durable local storage.'
}
