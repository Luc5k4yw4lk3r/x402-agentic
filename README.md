# x402-agentic

Implementación simple de [x402](https://x402.org/) con **Thirdweb** en **Avalanche Fuji** (testnet).

El protocolo x402 convierte el código HTTP 402 (Payment Required) en una capa de pago on-chain para APIs.

## Arquitectura

```
┌─────────────┐    1. GET /api/premium     ┌──────────────┐
│   Cliente    │ ─────────────────────────▶ │   Servidor   │
│  (curl/ts)   │                            │  Express     │
│             │ ◀───────────────────────── │              │
│             │    2. HTTP 402 + payment   │              │
│             │       requirements         │              │
│             │                            │              │
│             │    3. GET + X-Payment      │  Thirdweb    │
│             │       (signed payment)     │  Facilitator │
│             │ ─────────────────────────▶ │       ↓      │
│             │                            │  Avalanche   │
│             │ ◀───────────────────────── │  Fuji USDC   │
│             │    4. HTTP 200 + content   │              │
└─────────────┘    + payment receipt       └──────────────┘
```

## Requisitos previos

1. **Cuenta Thirdweb** - [Crear API key](https://thirdweb.com/dashboard/settings/api-keys)
2. **Server Wallet** - Crear en Dashboard > Engine > Server Wallets
3. **Wallet de prueba** - Con AVAX testnet y USDC testnet en Fuji
4. **USDC testnet en Fuji** - Obtener de un faucet o bridge

### Obtener AVAX testnet

Usa el [Avalanche Fuji Faucet](https://faucet.avax.network/) para obtener AVAX testnet gratis.

## Instalación

```bash
npm install
cp .env.example .env
# Editar .env con tus claves
```

## Configuración (.env)

```env
# API key de Thirdweb (Server side)
THIRDWEB_SECRET_KEY=tu_secret_key

# Wallet del servidor que recibe pagos
SERVER_WALLET_ADDRESS=0x...

# Private key del cliente para pruebas
CLIENT_PRIVATE_KEY=0x...

PORT=3000
```

## Uso

### 1. Iniciar el servidor

```bash
npm run server
```

### 2. Probar con curl (ver respuesta 402)

```bash
# Endpoint gratuito
curl http://localhost:3000/

# Endpoint de pago - recibirás HTTP 402 con los requisitos de pago
curl -v http://localhost:3000/api/premium

# Endpoint más barato
curl -v http://localhost:3000/api/joke
```

La respuesta 402 incluirá:
- Header `payment-required` con los detalles del pago
- Body JSON con los requisitos: red, token, monto, wallet destino

### 3. Pagar con el cliente TypeScript

```bash
# Pagar por contenido premium
npm run client

# Pagar por un chiste
npm run client -- /api/joke
```

El cliente automáticamente:
1. Hace la petición inicial
2. Recibe el 402 con los requisitos
3. Firma la autorización de pago con tu wallet
4. Reenvía la petición con el header `X-Payment`
5. Recibe el contenido + recibo de pago

## Estructura del proyecto

```
├── server.ts       # Servidor Express con endpoints x402
├── client.ts       # Cliente que firma y paga automáticamente
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Próximos pasos (incremental)

- [ ] Agregar esquema de pago `upto` para precios dinámicos
- [ ] Integrar con un modelo de AI (pago por inferencia)
- [ ] Agregar dashboard de transacciones
- [ ] Migrar a Avalanche mainnet con USDC real
- [ ] Agregar más endpoints con diferentes precios
- [ ] Implementar middleware reutilizable
