// Utility: export an HTML table to .xlsx
// Requires SheetJS (xlsx) to be loaded before calling this function.

function exportTableToExcel(tableId, filename) {
  var table = document.getElementById(tableId);
  if (!table) { alert('No se encontró la tabla.'); return; }
  if (typeof XLSX === 'undefined') { alert('Librería XLSX no cargada.'); return; }

  // Collect visible rows only (skip hidden tr)
  var rows = [];
  var allRows = table.querySelectorAll('tr');
  allRows.forEach(function(tr) {
    if (tr.style.display === 'none') return;
    var cells = [];
    tr.querySelectorAll('th, td').forEach(function(cell) {
      // Use textContent but skip action columns with only buttons
      var text = cell.textContent.trim();
      cells.push(text);
    });
    rows.push(cells);
  });

  if (rows.length === 0) { alert('La tabla está vacía.'); return; }

  var ws = XLSX.utils.aoa_to_sheet(rows);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');
  XLSX.writeFile(wb, (filename || 'export') + '.xlsx');
}

// Generic: export any visible <table> inside a container element
function exportContainerTableToExcel(containerId, filename) {
  var container = document.getElementById(containerId);
  if (!container) { alert('No se encontró el contenedor.'); return; }
  var table = container.querySelector('table');
  if (!table) { alert('No se encontró tabla en el contenedor.'); return; }
  if (typeof XLSX === 'undefined') { alert('Librería XLSX no cargada.'); return; }

  var rows = [];
  table.querySelectorAll('tr').forEach(function(tr) {
    if (tr.style.display === 'none') return;
    var cells = [];
    tr.querySelectorAll('th, td').forEach(function(cell) {
      cells.push(cell.textContent.trim());
    });
    rows.push(cells);
  });

  if (rows.length === 0) { alert('La tabla está vacía.'); return; }

  var ws = XLSX.utils.aoa_to_sheet(rows);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');
  XLSX.writeFile(wb, (filename || 'export') + '.xlsx');
}
