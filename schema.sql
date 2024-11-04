-- Tabla de Años
CREATE TABLE Años (
    Año INT PRIMARY KEY
);

-- Insertar años desde 2024 hasta 2040
INSERT INTO Años (Año)
VALUES (2024), (2025), (2026), (2027), (2028), (2029), (2030),
       (2031), (2032), (2033), (2034), (2035), (2036), (2037),
       (2038), (2039), (2040);

-- Tabla de Clientes (actualizada)
CREATE TABLE Clientes (
    ClienteID INT PRIMARY KEY IDENTITY(1,1),
    NombreCliente NVARCHAR(100) NOT NULL,
    FechaExpiracionLicencia DATE,
    VersionAnalytics NVARCHAR(20),
    VersionConnector NVARCHAR(20),
    VersionAdapter NVARCHAR(20),
    FechaActualizacion DATE
);

-- Tabla de Sistemas de Alimentación
CREATE TABLE SistemasAlimentacion (
    SistemaID INT PRIMARY KEY IDENTITY(1,1),
    NombreSistema NVARCHAR(50) NOT NULL
);

-- Insertar sistemas de alimentación
INSERT INTO SistemasAlimentacion (NombreSistema)
VALUES ('AKVA Connect 2'), ('AKVA Control'), ('AKVA Connect 4');

-- Tabla de Estados de Centro
CREATE TABLE EstadosCentro (
    EstadoID INT PRIMARY KEY IDENTITY(1,1),
    NombreEstado NVARCHAR(50) NOT NULL
);

-- Insertar estados de centro
INSERT INTO EstadosCentro (NombreEstado)
VALUES ('Integrando'), ('No Integrando'), ('Centro Vacío');

-- Tabla de Centros
CREATE TABLE Centros (
    CentroID INT PRIMARY KEY IDENTITY(1,1),
    ClienteID INT FOREIGN KEY REFERENCES Clientes(ClienteID),
    NombreCentro NVARCHAR(100) NOT NULL,
    NombrePonton NVARCHAR(100),
    SistemaID INT FOREIGN KEY REFERENCES SistemasAlimentacion(SistemaID),
    VersionSistema NVARCHAR(20),
    FechaInstalacionACA DATE,
    FechaTermino DATE
);

-- Tabla de Estado Mensual de Centros
CREATE TABLE EstadoMensualCentros (
    EstadoMensualID INT PRIMARY KEY IDENTITY(1,1),
    CentroID INT FOREIGN KEY REFERENCES Centros(CentroID),
    Año INT,
    Mes INT,
    EstadoID INT FOREIGN KEY REFERENCES EstadosCentro(EstadoID),
    CentroConAnalytics BIT NOT NULL,
    Comentarios NVARCHAR(MAX),
    CONSTRAINT UC_EstadoMensual UNIQUE (CentroID, Año, Mes)


	-- Modificar la tabla EstadoMensualCentros para incluir los nuevos campos
ALTER TABLE EstadoMensualCentros
ADD SistemaID INT FOREIGN KEY REFERENCES SistemasAlimentacion(SistemaID),
    VersionSistema NVARCHAR(20);
);