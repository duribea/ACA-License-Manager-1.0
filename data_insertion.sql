-- Insertar clientes de ejemplo
INSERT INTO Clientes (NombreCliente) VALUES 
('Salmones Austral'), ('Cultivos Yadran'), ('Ventisqueros'), ('Australis'), ('Multi X'), ('Salmones de Chile'), ('Cermaq Chile');

-- Insertar centros de ejemplo (basado en la imagen proporcionada)
INSERT INTO Centros (ClienteID, NombreCentro, SistemaID, FechaInstalacionACA) VALUES 
((SELECT ClienteID FROM Clientes WHERE NombreCliente = 'Salmones Austral'), 'Rupanco 523', (SELECT SistemaID FROM SistemasAlimentacion WHERE NombreSistema = 'AKVA Connect 2'), NULL),
((SELECT ClienteID FROM Clientes WHERE NombreCliente = 'Salmones Austral'), 'Pichagua 524', (SELECT SistemaID FROM SistemasAlimentacion WHERE NombreSistema = 'AKVA Connect 2'), NULL),
((SELECT ClienteID FROM Clientes WHERE NombreCliente = 'Salmones Austral'), 'Puelo 523', (SELECT SistemaID FROM SistemasAlimentacion WHERE NombreSistema = 'AKVA Control'), NULL);

-- Insertar licencias mensuales de ejemplo
INSERT INTO LicenciasMensuales (CentroID, Año, Mes, EstadoID, CentroConAnalytics, FechaCierreCiclo, Comentarios) VALUES 
((SELECT CentroID FROM Centros WHERE NombreCentro = 'Rupanco 523'), 2024, 8, (SELECT EstadoID FROM EstadosCentro WHERE NombreEstado = 'Integrando'), 1, NULL, NULL),
((SELECT CentroID FROM Centros WHERE NombreCentro = 'Pichagua 524'), 2024, 8, (SELECT EstadoID FROM EstadosCentro WHERE NombreEstado = 'Integrando'), 1, NULL, NULL),
((SELECT CentroID FROM Centros WHERE NombreCentro = 'Puelo 523'), 2024, 8, (SELECT EstadoID FROM EstadosCentro WHERE NombreEstado = 'Integrando'), 1, NULL, NULL);