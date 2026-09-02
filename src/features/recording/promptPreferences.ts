export type PromptPosition='high'|'centre'|'low'
export const PROMPT_POSITION_KEY='xr1-prompt-position'
export function readPromptPosition(storage?:Pick<Storage,'getItem'>):PromptPosition{
  try{const value=storage?.getItem(PROMPT_POSITION_KEY);return value==='centre'||value==='low'||value==='high'?value:'high'}catch{return'high'}
}
export function punctuationDelay(word:string,baseMs:number){return /[.!?][”"']?$/.test(word)?baseMs*1.85:/[,;:][”"']?$/.test(word)?baseMs*1.35:baseMs}
