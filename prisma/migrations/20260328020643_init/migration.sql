-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "dni" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "stripeAccountId" TEXT,
    "bankIban" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fotos" TEXT NOT NULL,
    "tipoTransaccion" TEXT NOT NULL,
    "precioVenta" REAL,
    "precioMedioDia" REAL,
    "precioDiaEntero" REAL,
    "importeFianza" REAL NOT NULL,
    "qrCode" TEXT,
    "slug" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Item_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "clientId" TEXT,
    "guestEmail" TEXT,
    "tipo" TEXT NOT NULL,
    "importePago" REAL NOT NULL,
    "importeFianza" REAL NOT NULL DEFAULT 0,
    "stripePaymentIntentId" TEXT,
    "stripeFianzaIntentId" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "fechaInicio" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" DATETIME,
    "fechaDevolucion" DATETIME,
    "fianzaDevuelta" BOOLEAN NOT NULL DEFAULT false,
    "fianzaBloqueada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "evidenciaFotos" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'abierta',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Incident_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Incident_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sid" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Item_slug_key" ON "Item"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sid_key" ON "Session"("sid");
