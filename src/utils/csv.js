export function downloadTableBodyAsCSV(tableBodyId, filename) {
  const tableBody = document.getElementById(tableBodyId)
  if (!tableBody) {
    console.error('Table body not found:', tableBodyId)
    return
  }

  const rows = tableBody.getElementsByTagName('tr')
  const csvContent = []

  // Add header row
  const headerRow = []
  const headerCells = rows[0]?.getElementsByTagName('td')
  if (headerCells) {
    for (let i = 0; i < headerCells.length; i++) {
      headerRow.push(`"${headerCells[i].textContent.trim()}"`)
    }
    csvContent.push(headerRow.join(','))
  }

  // Add data rows
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const cells = row.getElementsByTagName('td')
    const csvRow = []
    
    for (let j = 0; j < cells.length; j++) {
      const cellText = cells[j].textContent.trim()
      csvRow.push(`"${cellText}"`)
    }
    
    csvContent.push(csvRow.join(','))
  }

  // Create and download CSV file
  const csvString = csvContent.join('\n')
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}
