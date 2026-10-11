export function download(name: string, value: string, type = 'application/json') { const url = URL.createObjectURL(new Blob([value], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url) }

