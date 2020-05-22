// Mutable
export function getOneLevel(obj: any = {}, path: string): object {
  return obj[path]
}

// Mutable
export function setOneLevel(obj: any = {}, path: string, val: any): object {
  obj[path] = val
  return obj
}