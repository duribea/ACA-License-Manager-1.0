document.addEventListener('DOMContentLoaded', function() {
    const clienteSelect = document.getElementById('clienteSelect');
    const clienteGestion = document.getElementById('clienteGestion');
    const clienteEstadoMensual = document.getElementById('clienteEstadoMensual');
    const añoEstadoMensual = document.getElementById('añoEstadoMensual');
    const mesEstadoMensual = document.getElementById('mesEstadoMensual');
    const sistemaAlimentacion = document.getElementById('sistemaAlimentacion');
	 const sistemaAlimentacionSelect = document.getElementById('sistemaAlimentacion');
    cargarSistemasEnSelect(sistemaAlimentacionSelect);
    const mensaje = document.getElementById('mensaje');

    // Función para exportar tabla a Excel
    function exportTableToExcel(tableId, fileName) {
        const table = document.getElementById(tableId);
        const rows = Array.from(table.querySelectorAll('tr'));
        
        let csvContent = "data:text/csv;charset=utf-8,";
        
        rows.forEach(row => {
            const cells = Array.from(row.querySelectorAll('th, td'));
            const rowData = cells.map(cell => {
                // Obtener el valor del input, select o el texto de la celda
                if (cell.querySelector('input')) {
                    return cell.querySelector('input').value;
                } else if (cell.querySelector('select')) {
                    return cell.querySelector('select').options[cell.querySelector('select').selectedIndex].text;
                } else {
                    return cell.textContent;
                }
            }).map(text => `"${text}"`); // Envolver en comillas para manejar comas
            csvContent += rowData.join(',') + "\r\n";
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${fileName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Función para copiar tabla al portapapeles
    function copyTableToClipboard(tableId) {
    const table = document.getElementById(tableId);
    const rows = Array.from(table.querySelectorAll('tr'));
    
    let text = '';
    rows.forEach((row, rowIndex) => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        const rowData = cells.map(cell => {
            // Obtener el valor del input o el texto de la celda
            if (cell.querySelector('input')) {
                return cell.querySelector('input').value;
            } else if (cell.querySelector('select')) {
                return cell.querySelector('select').options[cell.querySelector('select').selectedIndex].text;
            } else if (cell.querySelector('textarea')) {
                return cell.querySelector('textarea').value;
            } else {
                return cell.textContent.trim();
            }
        });

        // Unir los datos de la fila con tabuladores para separar las celdas
        text += rowData.join('\t') + '\n';
    });
    
    // Copiar el texto formateado al portapapeles
    navigator.clipboard.writeText(text).then(() => {
        mostrarMensaje('Tabla copiada al portapapeles');
    }).catch(err => {
        mostrarMensaje('Error al copiar la tabla', 'error');
    });
}

// Función para crear el gráfico de barras
function crearGraficoCentros(data) {
    const ctx = document.getElementById('graficoCentros').getContext('2d');

    // Si existe un gráfico previo, destruirlo antes de crear uno nuevo
    if (window.graficoCentros) {
        window.graficoCentros.destroy();
    }

    window.graficoCentros = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['AKVA Connect 2', 'AKVA Connect 4', 'AKVA Control'],  // Etiquetas de los sistemas
            datasets: [{
                label: 'Centros Activos',
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
                data: [data.akvaConnect2, data.akvaConnect4, data.akvaControl]  // Los datos del mes seleccionado
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    beginAtZero: true
                },
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Función para obtener datos del gráfico de los últimos 3 meses
function obtenerDatosGrafico() {
    const mes = document.getElementById('mesEstadoMensual').value;
    const año = document.getElementById('añoEstadoMensual').value;
    const clienteId = document.getElementById('clienteEstadoMensual').value;

    // Verificar que se haya seleccionado un cliente y un periodo antes de hacer la solicitud
    if (clienteId && mes && año) {
        fetch(`/api/estado-mensual?mes=${mes}&año=${año}&clienteId=${clienteId}`)
            .then(response => response.json())
            .then(datos => {
                console.log('Datos recibidos para el gráfico:', datos);

                // Si hay datos, mostrar el gráfico
                if (datos.akvaConnect2 || datos.akvaConnect4 || datos.akvaControl) {
                    document.getElementById('graficoCentrosContainer').style.display = 'block';  // Mostrar el gráfico
                    crearGraficoCentros(datos);  // Función para crear el gráfico
                } else {
                    document.getElementById('graficoCentrosContainer').style.display = 'none';  // Ocultar si no hay datos
                }
            })
            .catch(error => console.error('Error al obtener los datos del gráfico:', error));
    } else {
        // Ocultar el contenedor si no se ha seleccionado cliente y periodo
        document.getElementById('graficoCentrosContainer').style.display = 'none';
    }
}

// Llamar a la función para obtener los datos y dibujar el gráfico
obtenerDatosGrafico();





    // Función para actualizar el resumen de centros activos
    function actualizarResumenCentros() {
        const tabla = document.getElementById('estadoMensualTabla');
        const filas = tabla.querySelectorAll('tbody tr');
        let totalActivos = 0;
        let connect2 = 0;
        let connect4 = 0;
        let control = 0;

        filas.forEach(fila => {
            const estaIntegrando = fila.querySelector('.estado-select').value === '1';
            const tieneAnalytics = fila.querySelector('.analytics-check').checked;
            const sistema = fila.querySelector('.sistema-select').options[fila.querySelector('.sistema-select').selectedIndex].text;

            if (estaIntegrando && tieneAnalytics) {
                totalActivos++;
                if (sistema === 'AKVA Connect 2') connect2++;
                else if (sistema === 'AKVA Connect 4') connect4++;
                else if (sistema === 'AKVA Control') control++;
            }
        });

        const resumen = document.getElementById('resumenCentros');
        resumen.innerHTML = `
            <h3>Resumen de Centros Activos</h3>
            <p>Total de centros activos: ${totalActivos}</p>
            <p>AKVA Connect 2: ${connect2}</p>
            <p>AKVA Connect 4: ${connect4}</p>
            <p>AKVA Control: ${control}</p>
        `;
        resumen.style.display = 'block';
    }

    // Función para mostrar mensajes
function mostrarMensaje(texto, tipo = 'success') {
    const mensaje = document.getElementById('mensaje');
    mensaje.textContent = texto;
    mensaje.style.backgroundColor = tipo === 'error' ? '#f44336' : '#4CAF50'; // Rojo para error, verde para éxito
    mensaje.style.display = 'block';

    // Ocultar el mensaje después de 3 segundos
    setTimeout(() => {
        mensaje.style.display = 'none';
    }, 4000);
}

    // Cargar clientes
    function cargarClientes() {
        fetch('/api/clientes')
            .then(response => response.json())
            .then(clientes => {
                [clienteSelect, clienteGestion, clienteEstadoMensual].forEach(select => {
                    if (!select) return; // Verificar que el elemento existe
                    select.innerHTML = '<option value="">Seleccione un cliente</option>';
                    if (select !== clienteSelect) {
                        const optionTodos = document.createElement('option');
                        optionTodos.value = 'todos';
                        optionTodos.textContent = 'Todos';
                        select.appendChild(optionTodos);
                    }
                    clientes.forEach(cliente => {
                        const option = document.createElement('option');
                        option.value = cliente.ClienteID;
                        option.textContent = cliente.NombreCliente;
                        select.appendChild(option);
                    });
                });
            })
            .catch(error => {
                console.error('Error al cargar clientes:', error);
                mostrarMensaje('Error al cargar la lista de clientes', 'error');
            });
    }

    // Cargar años
    function cargarAños() {
        if (!añoEstadoMensual) return;
        const currentYear = new Date().getFullYear();
        añoEstadoMensual.innerHTML = '<option value="">Seleccione un año</option>';
        for (let i = 0; i < 10; i++) {
            const year = currentYear + i;
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            añoEstadoMensual.appendChild(option);
        }
    }

    // Cargar sistemas de alimentación
 function cargarSistemasEnSelect(selectElement, sistemaIdActual = '') {
    fetch('/api/sistemas-alimentacion')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error al obtener sistemas de alimentación: ${response.status}`);
            }
            return response.json();
        })
        .then(sistemas => {
            // Limpiar opciones existentes y añadir opción inicial
            selectElement.innerHTML = '<option value="">Seleccione un sistema</option>';
            
            // Agregar opciones de sistemas de alimentación
            sistemas.forEach(sistema => {
                const option = document.createElement('option');
                option.value = sistema.SistemaID;
                option.textContent = sistema.NombreSistema;
                
                // Si sistemaIdActual coincide, marcar como seleccionado
                if (sistema.SistemaID === sistemaIdActual) {
                    option.selected = true;
                }
                selectElement.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error al cargar sistemas de alimentación:', error);
        });
}


    // Añadir nuevo cliente
const btnAñadirCliente = document.getElementById('añadirCliente');
if (btnAñadirCliente) {
    btnAñadirCliente.addEventListener('click', function() {
        const nuevoCliente = {
            NombreCliente: document.getElementById('nuevoClienteNombre').value,
            FechaExpiracionLicencia: document.getElementById('nuevaFechaExpiracion').value,
            VersionAnalytics: document.getElementById('nuevaVersionAnalytics').value,
            VersionConnector: document.getElementById('nuevaVersionConnector').value,
            VersionAdapter: document.getElementById('nuevaVersionAdapter').value,
            FechaActualizacion: document.getElementById('nuevaFechaActualizacion').value
        };

        if (!nuevoCliente.NombreCliente) {
            mostrarMensaje('El nombre del cliente es obligatorio', 'error');
            return;
        }

        fetch('/api/clientes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoCliente)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => { throw new Error(data.error || 'Error desconocido'); });
            }
            return response.json();
        })
        .then(data => {
            mostrarMensaje(`Cliente ${nuevoCliente.NombreCliente} añadido con éxito`, 'success'); // Mensaje de éxito en verde
            cargarClientes(); // Recarga la lista de clientes

            // Limpiar los campos de entrada manualmente
            document.getElementById('nuevoClienteNombre').value = '';
            document.getElementById('nuevaFechaExpiracion').value = '';
            document.getElementById('nuevaVersionAnalytics').value = '';
            document.getElementById('nuevaVersionConnector').value = '';
            document.getElementById('nuevaVersionAdapter').value = '';
            document.getElementById('nuevaFechaActualizacion').value = '';
        })
        .catch(error => {
            mostrarMensaje(error.message, 'error');
        });
    });
}

    // Gestión de clientes
    const btnCargarClientes = document.getElementById('cargarClientes');
    if (btnCargarClientes) {
        btnCargarClientes.addEventListener('click', function() {
            fetch('/api/clientes')
                .then(response => response.json())
                .then(clientes => {
                    const tabla = document.getElementById('clientesTabla');
                    const tbody = tabla.querySelector('tbody');
                    tbody.innerHTML = '';
                    clientes.forEach(cliente => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${cliente.NombreCliente}</td>
                            <td>${cliente.FechaExpiracionLicencia || ''}</td>
                            <td>${cliente.VersionAnalytics || ''}</td>
                            <td>${cliente.VersionConnector || ''}</td>
                            <td>${cliente.VersionAdapter || ''}</td>
                            <td>${cliente.FechaActualizacion || ''}</td>
                            <td>
                                <button class="editar-cliente" data-id="${cliente.ClienteID}">Editar</button>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    });
                    tabla.style.display = 'table';
                })
                .catch(error => {
                    console.error('Error al cargar clientes:', error);
                    mostrarMensaje('Error al cargar los clientes', 'error');
                });
        });
    }

    // Botones de exportación para la tabla de clientes
    const btnExportarClientes = document.getElementById('exportarClientes');
    if (btnExportarClientes) {
        btnExportarClientes.addEventListener('click', function() {
            exportTableToExcel('clientesTabla', 'clientes');
        });
    }

    const btnCopiarClientes = document.getElementById('copiarClientes');
    if (btnCopiarClientes) {
        btnCopiarClientes.addEventListener('click', function() {
            copyTableToClipboard('clientesTabla');
        });
    }

    // Botones de exportación para la tabla de estado mensual
    const btnExportarEstadoMensual = document.getElementById('exportarEstadoMensual');
    if (btnExportarEstadoMensual) {
        btnExportarEstadoMensual.addEventListener('click', function() {
            exportTableToExcel('estadoMensualTabla', 'estado_mensual');
        });
    }

    const btnCopiarEstadoMensual = document.getElementById('copiarEstadoMensual');
    if (btnCopiarEstadoMensual) {
        btnCopiarEstadoMensual.addEventListener('click', function() {
            copyTableToClipboard('estadoMensualTabla');
        });
    }

    // Edición de clientes
    const clientesTabla = document.getElementById('clientesTabla');
    if (clientesTabla) {
        clientesTabla.addEventListener('click', function(e) {
            if (e.target.classList.contains('editar-cliente')) {
                const clienteId = e.target.dataset.id;
                const row = e.target.closest('tr');
                const cells = row.cells;

                row.dataset.originalFechaExpiracion = cells[1].textContent.trim();
                row.dataset.originalFechaActualizacion = cells[5].textContent.trim();

                cells[0].innerHTML = `<input type="text" value="${cells[0].textContent}">`;
                cells[1].innerHTML = `<input type="date" value="${formatDateForInput(cells[1].textContent)}">`;
                cells[2].innerHTML = `<input type="text" value="${cells[2].textContent}">`;
                cells[3].innerHTML = `<input type="text" value="${cells[3].textContent}">`;
                cells[4].innerHTML = `<input type="text" value="${cells[4].textContent}">`;
                cells[5].innerHTML = `<input type="date" value="${formatDateForInput(cells[5].textContent)}">`;
                
                e.target.textContent = 'Guardar';
                e.target.classList.remove('editar-cliente');
                e.target.classList.add('guardar-cliente');
            } else if (e.target.classList.contains('guardar-cliente')) {
                const clienteId = e.target.dataset.id;
                const row = e.target.closest('tr');
                const cells = row.cells;

                const fechaExpInput = cells[1].querySelector('input');
                const fechaActInput = cells[5].querySelector('input');
                
                const clienteActualizado = {
                    NombreCliente: cells[0].querySelector('input').value,
                    FechaExpiracionLicencia: fechaExpInput.value || null,
                    VersionAnalytics: cells[2].querySelector('input').value,
                    VersionConnector: cells[3].querySelector('input').value,
                    VersionAdapter: cells[4].querySelector('input').value,
                    FechaActualizacion: fechaActInput.value || null
                };

                fetch(`/api/clientes/${clienteId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(clienteActualizado)
                })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        mostrarMensaje(data.error, 'error');
                    } else {
                        mostrarMensaje('Cliente actualizado con éxito');
                        cells[0].textContent = clienteActualizado.NombreCliente;
                        cells[1].textContent = fechaExpInput.value ? formatDate(fechaExpInput.value) : '';
                        cells[2].textContent = clienteActualizado.VersionAnalytics;
                        cells[3].textContent = clienteActualizado.VersionConnector;
                        cells[4].textContent = clienteActualizado.VersionAdapter;
                        cells[5].textContent = fechaActInput.value ? formatDate(fechaActInput.value) : '';

                        e.target.textContent = 'Editar';
                        e.target.classList.remove('guardar-cliente');
                        e.target.classList.add('editar-cliente');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    mostrarMensaje('Error al actualizar el cliente', 'error');
                });
            }
        });
    }

    // Añadir nuevo centro
const btnAñadirCentro = document.getElementById('añadirCentro');
if (btnAñadirCentro) {
    btnAñadirCentro.addEventListener('click', function() {
        const centro = {
            ClienteID: clienteSelect.value,
            NombreCentro: document.getElementById('nombreCentro').value,
            NombrePonton: document.getElementById('nombrePonton').value,
            SistemaID: sistemaAlimentacion.value,
            VersionSistema: document.getElementById('versionSistema').value,
            FechaInstalacionACA: document.getElementById('fechaInstalacionACA').value,
            FechaTermino: document.getElementById('fechaTermino').value || null
        };

        if (!centro.ClienteID || !centro.NombreCentro) {
            mostrarMensaje('El cliente y el nombre del centro son obligatorios', 'error');
            return;
        }

        fetch('/api/centros', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(centro)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => { throw new Error(data.error || 'Error desconocido'); });
            }
            return response.json();
        })
        .then(data => {
            mostrarMensaje(`Centro ${centro.NombreCentro} añadido con éxito`, 'success'); // Mensaje de éxito en verde

            // Limpiar los campos de entrada manualmente
            clienteSelect.value = '';
            document.getElementById('nombreCentro').value = '';
            document.getElementById('nombrePonton').value = '';
            sistemaAlimentacion.value = '';
            document.getElementById('versionSistema').value = '';
            document.getElementById('fechaInstalacionACA').value = '';
            document.getElementById('fechaTermino').value = '';
        })
        .catch(error => {
            mostrarMensaje(error.message, 'error');
        });
    });
}

    // Cargar centros para gestión
    const btnCargarCentros = document.getElementById('cargarCentros');
    if (btnCargarCentros) {
        btnCargarCentros.addEventListener('click', function() {
            const clienteId = clienteGestion.value;
            if (!clienteId) {
                mostrarMensaje('Por favor, seleccione un cliente', 'error');
                return;
            }
            cargarCentros(clienteId);
        });
    }

function cargarCentros(clienteId) {
    fetch(`/api/centros/${clienteId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(centros => {
            console.log('Datos recibidos:', centros);
            const tabla = document.getElementById('centrosTabla');
            const tbody = tabla.querySelector('tbody');
            tbody.innerHTML = ''; 
            centros.forEach(centro => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${centro.NombreCliente}</td>
                    <td>${centro.NombreCentro}</td>
                    <td>${centro.NombrePonton || ''}</td>
                    <td>${centro.NombreSistema}</td>
                    <td>${centro.VersionSistema || ''}</td>
                    <td>${formatDate(centro.FechaInstalacionACA)}</td>
                    <td>${formatDate(centro.FechaTermino)}</td>
                    <td><button class="editar-centro" data-id="${centro.CentroID}">Editar</button></td>
                `;
                tbody.appendChild(tr);
            });
            tabla.style.display = 'table';
        })
        .catch(error => {
            console.error('Error al cargar centros:', error);
            mostrarMensaje('Error al cargar los centros', 'error');
        });
}


    // Edición de centros
 const centrosTabla = document.getElementById('centrosTabla');
if (centrosTabla) {
    centrosTabla.addEventListener('click', function(e) {
        if (e.target.classList.contains('editar-centro')) {
            const row = e.target.closest('tr');
            const cells = row.cells;

            // Guardar los valores actuales para referencia
            row.dataset.originalFechaInstalacion = cells[5].textContent.trim();
            row.dataset.originalFechaTermino = cells[6].textContent.trim();

            // Crear inputs para edición
            cells[1].innerHTML = `<input type="text" value="${cells[1].textContent}">`; // NombreCentro
            cells[2].innerHTML = `<input type="text" value="${cells[2].textContent}">`; // NombrePonton

            // Cargar sistemas de alimentación en el select de sistema y mantener el valor actual
            const sistemaSelect = document.createElement('select');
            sistemaSelect.className = 'sistema-select';
            const sistemaActual = cells[3].textContent.trim(); // Obtener el sistema actual

            // Llamar a cargarSistemasEnSelect y seleccionar el sistema actual
            cargarSistemasEnSelect(sistemaSelect, sistemaActual);
            cells[3].innerHTML = ''; // Limpiar celda antes de insertar el select
            cells[3].appendChild(sistemaSelect);

            // Crear inputs adicionales
            cells[4].innerHTML = `<input type="text" value="${cells[4].textContent}">`; // VersionSistema
            cells[5].innerHTML = `<input type="date" value="${formatDateForInput(cells[5].textContent)}">`; // FechaInstalacionACA
            cells[6].innerHTML = `<input type="date" value="${formatDateForInput(cells[6].textContent)}">`; // FechaTermino

            // Cambiar botón a "Guardar"
            e.target.textContent = 'Guardar';
            e.target.classList.remove('editar-centro');
            e.target.classList.add('guardar-centro');
        } else if (e.target.classList.contains('guardar-centro')) {
            const centroId = e.target.dataset.id;
            const row = e.target.closest('tr');
            const cells = row.cells;

            // Obtener valores actualizados de los inputs
            const fechaInstInput = cells[5].querySelector('input');
            const fechaTermInput = cells[6].querySelector('input');
            
            const centroActualizado = {
                NombreCentro: cells[1].querySelector('input').value,
                NombrePonton: cells[2].querySelector('input').value,
                SistemaID: cells[3].querySelector('select').value,
                VersionSistema: cells[4].querySelector('input').value,
                FechaInstalacionACA: fechaInstInput.value || null,
                FechaTermino: fechaTermInput.value || null
            };

            // Validar que SistemaID sea válido
            if (!centroActualizado.SistemaID) {
                mostrarMensaje('El sistema de alimentación es obligatorio', 'error');
                return;
            }

            // Enviar datos al servidor
            fetch(`/api/centros/${centroId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(centroActualizado)
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    mostrarMensaje(data.error, 'error');
                } else {
                    mostrarMensaje('Centro actualizado con éxito');
                    
                    // Actualizar valores en la tabla
                    cells[1].textContent = centroActualizado.NombreCentro;
                    cells[2].textContent = centroActualizado.NombrePonton;
                    cells[3].textContent = cells[3].querySelector('select').options[cells[3].querySelector('select').selectedIndex].text;
                    cells[4].textContent = centroActualizado.VersionSistema;
                    cells[5].textContent = fechaInstInput.value ? formatDate(fechaInstInput.value) : '';
                    cells[6].textContent = fechaTermInput.value ? formatDate(fechaTermInput.value) : '';

                    // Cambiar botón de vuelta a "Editar"
                    e.target.textContent = 'Editar';
                    e.target.classList.remove('guardar-centro');
                    e.target.classList.add('editar-centro');
                }
            })
            .catch(error => {
                console.error('Error al actualizar centro:', error);
                mostrarMensaje('Error al actualizar el centro', 'error');
            });
        }
    });
}

// Actualización de la función para cargar sistemas y seleccionar el sistema actual
function cargarSistemasEnSelect(selectElement, sistemaIdActual) {
    fetch('/api/sistemas-alimentacion')
        .then(response => response.json())
        .then(sistemas => {
            selectElement.innerHTML = '<option value="">Seleccione un sistema</option>';
            sistemas.forEach(sistema => {
                const option = document.createElement('option');
                option.value = sistema.SistemaID;
                option.textContent = sistema.NombreSistema;

                // Seleccionar el sistema actual si coincide
                if (sistema.NombreSistema.trim() === sistemaIdActual) {
                    option.selected = true;
                }
                selectElement.appendChild(option);
            });
        })
        .catch(error => console.error('Error al cargar sistemas de alimentación:', error));
}



    // Cargar estado mensual
    const btnCargarEstadoMensual = document.getElementById('cargarEstadoMensual');
    if (btnCargarEstadoMensual) {
        btnCargarEstadoMensual.addEventListener('click', function() {
            const clienteId = clienteEstadoMensual.value;
            const año = añoEstadoMensual.value;
            const mes = mesEstadoMensual.value;
            
            if (!clienteId || !año || !mes) {
                mostrarMensaje('Por favor, seleccione cliente, año y mes', 'error');
                return;
            }

            fetch(`/api/estado-mensual?clienteId=${clienteId}&año=${año}&mes=${mes}`)
                .then(response => response.json())
                .then(estados => {
                    const tabla = document.getElementById('estadoMensualTabla');
                    const tbody = tabla.querySelector('tbody');
                    tbody.innerHTML = '';

                    // Primero, obtener los sistemas de alimentación
                    return fetch('/api/sistemas-alimentacion')
                        .then(response => response.json())
                        .then(sistemas => {
                            const sistemasOptions = sistemas.map(sistema => 
                                `<option value="${sistema.SistemaID}">${sistema.NombreSistema}</option>`
                            ).join('');

                            estados.forEach(estado => {
                                const tr = document.createElement('tr');
                                tr.innerHTML = `
                                    <td>${estado.NombreCliente}</td>
                                    <td>${estado.NombreCentro}</td>
                                    <td>${estado.NombrePonton || ''}</td>
                                    <td>
                                        <select class="sistema-select" data-centro-id="${estado.CentroID}">
                                            <option value="">Seleccione un sistema</option>
                                            ${sistemasOptions}
                                        </select>
                                    </td>
                                    <td>
                                        <input type="text" class="version-sistema" value="${estado.VersionSistemaMensual || estado.VersionSistema || ''}" placeholder="Versión del sistema">
                                    </td>
                                    <td>${formatDateEstadoMensual(estado.FechaInstalacionACA)}</td>
                                    <td>${formatDateEstadoMensual(estado.FechaTermino)}</td>
                                    <td>
                                        <select class="estado-select" data-centro-id="${estado.CentroID}">
                                            <option value="1" ${estado.EstadoID === 1 ? 'selected' : ''}>Integrando</option>
                                            <option value="2" ${estado.EstadoID === 2 ? 'selected' : ''}>No Integrando</option>
                                            <option value="3" ${estado.EstadoID === 3 ? 'selected' : ''}>Centro Vacío</option>
                                        </select>
                                    </td>
                                    <td>
                                        <input type="checkbox" class="analytics-check" data-centro-id="${estado.CentroID}" ${estado.CentroConAnalytics ? 'checked' : ''}>
                                    </td>
                                    <td>
                                        <textarea class="comentarios" data-centro-id="${estado.CentroID}">${estado.Comentarios || ''}</textarea>
                                    </td>
                                `;
                                tbody.appendChild(tr);
                                
                                // Establecer el sistema de alimentación seleccionado
                                const sistemaSelect = tr.querySelector('.sistema-select');
                                sistemaSelect.value = estado.SistemaIDMensual || estado.SistemaID || '';
                            });

                            tabla.style.display = 'table';
                            document.getElementById('guardarEstadoMensual').style.display = 'block';
                            document.getElementById('exportarEstadoMensual').style.display = 'block';
                            document.getElementById('copiarEstadoMensual').style.display = 'block';
                            actualizarResumenCentros();
                        });
                })
                .catch(error => {
                    console.error('Error al cargar estado mensual:', error);
                    mostrarMensaje('Error al cargar el estado mensual', 'error');
                });
        });
    }
	
	

    // Actualizar resumen cuando cambie el estado o analytics
    const estadoMensualTabla = document.getElementById('estadoMensualTabla');
    if (estadoMensualTabla) {
        estadoMensualTabla.addEventListener('change', function(e) {
            if (e.target.classList.contains('estado-select') || 
                e.target.classList.contains('analytics-check') ||
                e.target.classList.contains('sistema-select')) {
                actualizarResumenCentros();
            }
        });
    }

    // Guardar estado mensual
        const btnGuardarEstadoMensual = document.getElementById('guardarEstadoMensual');
    if (btnGuardarEstadoMensual) {
        btnGuardarEstadoMensual.addEventListener('click', function() {
            const año = añoEstadoMensual.value;
            const mes = mesEstadoMensual.value;
            const estados = [];

            document.querySelectorAll('#estadoMensualTabla tbody tr').forEach(tr => {
                const centroId = tr.querySelector('.estado-select').dataset.centroId;
                const sistemaSelect = tr.querySelector('.sistema-select');
                const sistemaId = sistemaSelect.value;

                // Validar que se haya seleccionado un sistema
                if (!sistemaId) {
                    mostrarMensaje('Por favor, seleccione un sistema de alimentación para todos los centros', 'error');
                    return;
                }

                estados.push({
                    CentroID: centroId,
                    Año: año,
                    Mes: mes,
                    EstadoID: tr.querySelector('.estado-select').value,
                    CentroConAnalytics: tr.querySelector('.analytics-check').checked,
                    Comentarios: tr.querySelector('.comentarios').value,
                    SistemaID: sistemaId,
                    VersionSistema: tr.querySelector('.version-sistema').value
                });
            });

            // Si hubo error en la validación
            if (estados.length === 0) return;

            fetch('/api/estado-mensual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(estados)
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    mostrarMensaje(data.error, 'error');
                } else {
                    mostrarMensaje('Estados mensuales actualizados con éxito');
                    actualizarResumenCentros();
                }
            })
            .catch(error => {
                console.error('Error al guardar estados mensuales:', error);
                mostrarMensaje('Error al guardar los estados mensuales', 'error');
            });
        });
    }

    // Función para formatear fechas
    function formatDate(dateString) {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-');
        return `${day}-${month}-${year}`;
    }

    // Función para formatear fechas para input
    function formatDateForInput(dateString) {
        if (!dateString) return '';
        const [day, month, year] = dateString.split('-');
        return `${year}-${month}-${day}`;
    }

    // Función específica para formatear fechas en estado mensual
    function formatDateEstadoMensual(dateString) {
        if (!dateString) return '';
        if (dateString.includes('T')) {
            dateString = dateString.split('T')[0];
        }
        const [year, month, day] = dateString.split('-');
        return `${day}-${month}-${year}`;
    }

    // Inicialización
    cargarClientes();
    cargarAños();
    cargarSistemasAlimentacion();
});

// Función para actualizar el gráfico
function actualizarGrafico() {
    const clienteId = document.getElementById('clienteEstadoMensual').value;
    const año = document.getElementById('añoEstadoMensual').value;
    const mes = document.getElementById('mesEstadoMensual').value;

    if (!clienteId || !año || !mes) return;

    fetch(`/api/grafico-centros?clienteId=${clienteId}&año=${año}&mes=${mes}`)
        .then(response => response.json())
        .then(datos => {
            const ctx = document.getElementById('graficoCentros').getContext('2d');
            
            if (window.miGrafico) {
                window.miGrafico.destroy();
            }

            const labels = datos.map(d => `${d.mes}/${d.año}`);
            const datasets = [
                {
                    label: 'AKVA Connect 2',
                    data: datos.map(d => d.sistemas['AKVA Connect 2']),
                    backgroundColor: '#7878FF'
                },
                {
                    label: 'AKVA Connect 4',
                    data: datos.map(d => d.sistemas['AKVA Connect 4']),
                    backgroundColor: '#00DCDC'
                },
                {
                    label: 'AKVA Control',
                    data: datos.map(d => d.sistemas['AKVA Control']),
                    backgroundColor: '#FAE100'
                }
            ];

            window.miGrafico = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: 2.5, // Aumentado para hacer el gráfico más pequeño
                    scales: {
                        x: {
                            stacked: true,
                            title: {
                                display: true,
                                text: 'Mes/Año',
                                color: 'white',
                                font: {
                                    size: 14
                                }
                            },
                            ticks: {
                                color: 'white'
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        },
                        y: {
                            stacked: true,
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Número de Centros Activos',
                                color: 'white',
                                font: {
                                    size: 14
                                }
                            },
                            ticks: {
                                color: 'white'
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                color: 'white',
                                padding: 20,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        title: {
                            display: true,
                            text: 'Distribución de Centros Activos por Sistema',
                            color: 'white',
                            padding: 20,
                            font: {
                                size: 18,
                                weight: 'bold'
                            }
                        },
                        tooltip: {
                            callbacks: {
                                title: function(context) {
                                    return `Período: ${context[0].label}`;
                                },
                                label: function(context) {
                                    return `${context.dataset.label}: ${context.raw} centros`;
                                }
                            }
                        }
                    }
                }
            });

            document.getElementById('graficoCentrosContainer').style.display = 'block';
        })
        .catch(error => {
            console.error('Error al obtener datos del gráfico:', error);
            mostrarMensaje('Error al cargar el gráfico', 'error');
        });
}

// Función para exportar el gráfico como imagen
function exportarGrafico() {
    const canvas = document.getElementById('graficoCentros');
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'distribucion-centros.png';
    link.href = image;
    link.click();
}

// Añadir evento para actualizar el gráfico cuando se cargue el estado mensual
const btnCargarEstadoMensual = document.getElementById('cargarEstadoMensual');
if (btnCargarEstadoMensual) {
    btnCargarEstadoMensual.addEventListener('click', function() {
        // ... (código existente para cargar estado mensual)
        actualizarGrafico(); // Añadir esta línea
    });
}

document.getElementById('descargarGrafico').addEventListener('click', function() {
    // Obtiene el gráfico como una imagen base64
    const grafico = document.getElementById('graficoCentros');
    const imagen = grafico.toDataURL('image/png');

    // Crea un enlace temporal para descargar la imagen
    const enlace = document.createElement('a');
    enlace.href = imagen;
    enlace.download = 'grafico-centros.png';  // Nombre del archivo a descargar
    enlace.click();
});



function cargarEstadoMensual() {
    const mes = document.getElementById('mesEstadoMensual').value;
    const año = document.getElementById('añoEstadoMensual').value;
    const clienteId = document.getElementById('clienteEstadoMensual').value;

    fetch(`/api/estado-mensual?mes=${mes}&año=${año}&clienteId=${clienteId}`)
        .then(response => response.json())
        .then(datos => {
            const tabla = document.getElementById('estadoMensualTabla').getElementsByTagName('tbody')[0];
            tabla.innerHTML = '';  // Limpiar la tabla

            // Llenar la tabla con los datos recibidos
            datos.forEach(dato => {
                const fila = tabla.insertRow();
                fila.insertCell(0).innerText = dato.Cliente;
                fila.insertCell(1).innerText = dato.Centro;
                fila.insertCell(2).innerText = dato.NombrePonton;
                fila.insertCell(3).innerText = dato.SistemaAlimentacion;
                fila.insertCell(4).innerText = dato.VersionSistema;
                fila.insertCell(5).innerText = dato.FechaInstalacionACA;
                fila.insertCell(6).innerText = dato.FechaTermino;
                fila.insertCell(7).innerText = dato.Estado;
                fila.insertCell(8).innerText = dato.ConAnalytics;
                fila.insertCell(9).innerText = dato.Comentarios;
            });

            // Mostrar la tabla
            document.getElementById('estadoMensualTabla').style.display = 'table';

            // Inicializar DataTables solo después de que los datos se hayan cargado
            if ($.fn.dataTable.isDataTable('#estadoMensualTabla')) {
                $('#estadoMensualTabla').DataTable().clear().destroy();  // Destruir DataTable previo si existe
            }
            $('#estadoMensualTabla').DataTable({
                "paging": false,    // Desactiva la paginación si no la necesitas
                "info": false,      // Desactiva la información de la tabla
                "searching": false  // Desactiva la búsqueda si no la necesitas
            });
        })
        .catch(error => console.error('Error al cargar el estado mensual:', error));
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    fetch('/logout')
        .then(() => {
            window.location.href = '/login';
        })
        .catch(error => {
            console.error('Error al cerrar sesión:', error);
        });
});