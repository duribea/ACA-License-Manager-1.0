-- Consulta para obtener el total de centros activos por mes y año
SELECT 
    emc.Año,
    emc.Mes,
    COUNT(*) AS TotalCentrosActivos,
    SUM(CASE WHEN sa.NombreSistema = 'AKVA Connect 2' THEN 1 ELSE 0 END) AS TotalAKVAConnect2,
    SUM(CASE WHEN sa.NombreSistema = 'AKVA Control' THEN 1 ELSE 0 END) AS TotalAKVAControl,
    SUM(CASE WHEN sa.NombreSistema = 'AKVA Connect 4' THEN 1 ELSE 0 END) AS TotalAKVAConnect4
FROM 
    EstadoMensualCentros emc
    JOIN Centros c ON emc.CentroID = c.CentroID
    JOIN SistemasAlimentacion sa ON c.SistemaID = sa.SistemaID
WHERE 
    emc.CentroConAnalytics = 1
GROUP BY 
    emc.Año, emc.Mes
ORDER BY 
    emc.Año DESC, emc.Mes DESC;

-- Consulta para obtener el detalle de centros por cliente, mes y año
SELECT 
    cl.NombreCliente,
    c.NombreCentro,
    c.NombrePonton,
    sa.NombreSistema AS SistemaAlimentacion,
    c.VersionSistema,
    c.FechaInstalacionACA,
    emc.Año,
    emc.Mes,
    CASE WHEN emc.CentroConAnalytics = 1 THEN 'Sí' ELSE 'No' END AS CentroConAnalytics,
    ec.NombreEstado AS Estado,
    c.FechaTermino,
    emc.Comentarios
FROM 
    EstadoMensualCentros emc
    JOIN Centros c ON emc.CentroID = c.CentroID
    JOIN Clientes cl ON c.ClienteID = cl.ClienteID
    JOIN SistemasAlimentacion sa ON c.SistemaID = sa.SistemaID
    JOIN EstadosCentro ec ON emc.EstadoID = ec.EstadoID
WHERE 
    emc.Año = 2024 AND emc.Mes = 8  -- Ajustar según el mes y año deseado
ORDER BY 
    cl.NombreCliente, c.NombreCentro;

-- Consulta para obtener centros activos en un mes y año específicos
SELECT 
    c.CentroID,
    c.NombreCentro,
    c.NombrePonton,
    sa.NombreSistema,
    c.VersionSistema,
    c.FechaInstalacionACA,
    c.FechaTermino,
    COALESCE(emc.EstadoID, 1) AS EstadoID,
    COALESCE(emc.CentroConAnalytics, 0) AS CentroConAnalytics,
    emc.Comentarios
FROM 
    Centros c
    JOIN SistemasAlimentacion sa ON c.SistemaID = sa.SistemaID
    LEFT JOIN EstadoMensualCentros emc ON c.CentroID = emc.CentroID 
        AND emc.Año = @Año 
        AND emc.Mes = @Mes
WHERE 
    c.ClienteID = @ClienteID
    AND c.FechaInstalacionACA <= DATEFROMPARTS(@Año, @Mes, 1)
    AND (c.FechaTermino IS NULL OR c.FechaTermino >= EOMONTH(DATEFROMPARTS(@Año, @Mes, 1)))
ORDER BY 
    c.NombreCentro;