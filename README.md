# Impacta — SME Escrow on Stellar

> Pagos seguros para microempresarios. Protege a compradores y vendedores en transacciones peer-to-peer usando la blockchain de Stellar.

[![Stellar](https://img.shields.io/badge/Stellar-Testnet-blue?logo=stellar)](https://stellar.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?logo=supabase)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://v0-impacta-dapp.vercel.app)

---

## ¿Qué es Impacta?

Impacta es una DApp (aplicación descentralizada) de escrow construida sobre la red Stellar. Resuelve el problema de desconfianza en compras y ventas a través de redes sociales (Facebook Marketplace, Instagram, WhatsApp) en mercados como Perú.

El flujo es simple: el comprador deposita fondos en una cuenta de custodia temporal en Stellar. El dinero solo se libera al vendedor cuando el comprador confirma haber recibido su producto. Si hay un conflicto, un árbitro neutral puede intervenir.

**Sin intermediarios. Sin bancos. Sin riesgo de estafa.**

---

## El Problema

Las transacciones en Facebook Marketplace,Instagram en Latinoamérica sufren de:

- Vendedores que reciben el pago y no envían el producto
- Compradores que reciben el producto y realizan contracargos
- Ausencia de mecanismos de resolución de disputas
- Desconfianza que frena el comercio informal

---

## La Solución

Un escrow de 2-de-3 multifirma sobre Stellar. Los fondos quedan bloqueados en una cuenta temporal y solo se liberan cuando dos de los tres participantes (comprador, vendedor, árbitro) están de acuerdo.

```
Vendedor crea el escrow
        ↓
  Se genera un Payment Link compartible
        ↓
  Comprador deposita XLM en la cuenta de custodia
        ↓
  Vendedor envía el producto
        ↓
  Comprador confirma recepción → fondos liberados al vendedor
        ↓
  (Si hay disputa) → Árbitro decide: liberar o reembolsar
```

---

## Características del MVP

- **Seller Dashboard** — crea escrows, visualiza estado, gestiona plazos
- **Payment Link** — enlace compartible con QR code para que el comprador pague
- **Multifirma 2-de-3** — buyer + seller + arbiter controlan los fondos
- **Flujo de disputa** — árbitro backend puede liberar o reembolsar
- **Auto-release** — si el comprador no confirma antes del deadline, el vendedor puede reclamar los fondos
- **UI en español** — diseñada para el mercado latinoamericano
- **Mobile-first** — optimizada para usuarios en celular

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Blockchain | Stellar SDK (`@stellar/stellar-sdk`) |
| Wallet | Freighter Wallet |
| Base de datos | Supabase (PostgreSQL) |
| QR Code | `qrcode.react` |
| Deploy | Vercel |

---

## Arquitectura del Escrow

La custodia se implementa usando **cuentas multifirma de Stellar** (sin smart contracts adicionales):

```
Cuenta Escrow (cuenta temporal Stellar)
├── Signer: Seller     (weight: 1)
├── Signer: Buyer      (weight: 1)  
├── Signer: Arbiter    (weight: 1)
├── Master weight: 0
└── Threshold (Low/Med/High): 2
```

Para liberar fondos se requieren **2 de 3 firmas**. El árbitro actúa como desempate en disputas.

---

## Estructura del Proyecto

```
impacta-Dapp/
├── app/
│   ├── api/
│   │   └── escrow/
│   │       ├── create/          # POST: crea cuenta escrow + multisig
│   │       ├── [id]/            # GET: detalle del escrow
│   │       │   ├── fund/        # POST: verifica pago del comprador
│   │       │   ├── release/     # POST: árbitro co-firma liberación
│   │       │   └── refund/      # POST: árbitro co-firma reembolso
│   │       └── seller/          # GET: escrows por vendedor
│   ├── create/                  # Formulario del vendedor
│   ├── pay/[id]/                # Página de pago para el comprador
│   └── dashboard/               # Panel del vendedor
├── lib/
│   ├── stellar/
│   │   ├── escrow.ts            # Lógica Stellar SDK
│   │   └── arbiter.ts           # Keypair del árbitro (server-side)
│   └── supabase.ts              # Cliente Supabase + tipos
├── context/
│   └── EscrowContext.tsx        # Estado global de escrows
├── hooks/                       # Hooks de Freighter wallet
├── components/                  # Componentes UI reutilizables
└── supabase/
    └── migrations.sql           # Schema de la base de datos
```

---

## Instalación y Configuración

### Prerequisitos

- Node.js 18+
- Extensión [Freighter Wallet](https://www.freighter.app/) en tu navegador
- Cuenta en [Supabase](https://supabase.com) (free tier)

### 1. Clonar el repositorio

```bash
git clone https://github.com/RichardEsteban/impacta-Dapp.git
cd impacta-Dapp
git checkout session/agent_08cf2afc-036b-4a43-877d-79cc874bfedb
npm install
```

### 2. Configurar Supabase

Crea un proyecto en Supabase y ejecuta el siguiente schema en el **SQL Editor**:

```bash
# El archivo está en:
supabase/migrations.sql
```

### 3. Variables de entorno

Crea un archivo `.env.local` en la raíz:

```env
# Stellar
NEXT_PUBLIC_STELLAR_NETWORK=TESTNET
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org

# Árbitro (genera un keypair nuevo en https://laboratory.stellar.org)
ARBITER_SECRET_KEY=S...
NEXT_PUBLIC_ARBITER_PUBLIC_KEY=G...

# Supabase (desde Settings → API en tu proyecto)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 4. Fondear la cuenta árbitro

```bash
# Abre esta URL en el navegador (reemplaza con tu ARBITER_PUBLIC_KEY)
https://friendbot.stellar.org/?addr=TU_ARBITER_PUBLIC_KEY
```

### 5. Correr en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) y navega a `/create` para probar el flujo completo.

---

## Flujo de Prueba (Testnet)

1. **Fondea tu wallet de prueba** en [friendbot.stellar.org](https://friendbot.stellar.org)
2. Conecta Freighter en `/create` como **vendedor**
3. Crea un escrow: describe el producto, monto, plazo
4. Copia el Payment Link generado y ábrelo en una nueva pestaña
5. Conecta Freighter como **comprador** y deposita XLM
6. Vuelve a la vista del vendedor y confirma el envío
7. Como comprador, haz click en **"Confirmar entrega"**
8. Los fondos se liberan automáticamente al vendedor ✅

---

## API Endpoints

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/escrow/create` | Crea cuenta escrow + configura multisig |
| `GET` | `/api/escrow/[id]` | Obtiene detalles del escrow |
| `POST` | `/api/escrow/[id]/fund` | Verifica pago del comprador |
| `POST` | `/api/escrow/[id]/release` | Árbitro co-firma liberación al vendedor |
| `POST` | `/api/escrow/[id]/refund` | Árbitro co-firma reembolso al comprador |
| `GET` | `/api/escrow/seller` | Lista escrows de un vendedor |

---

## Estados del Escrow

```
pending → funded → delivered → released
                ↘              
                  disputed → released
                           → refunded
```

| Estado | Descripción |
|---|---|
| `pending` | Escrow creado, esperando pago del comprador |
| `funded` | Comprador depositó los fondos |
| `delivered` | Vendedor marcó como enviado |
| `released` | Fondos liberados al vendedor ✅ |
| `refunded` | Fondos devueltos al comprador |
| `disputed` | En resolución por el árbitro |

---

## Roadmap

- [x] MVP — escrow multifirma en Stellar Testnet
- [x] Seller dashboard
- [x] Payment Links con QR code
- [x] Flujo de disputa con árbitro
- [ ] Soporte para USDC (eliminar volatilidad del XLM)
- [ ] Migración a Soroban smart contracts
- [ ] Notificaciones por WhatsApp/email
- [ ] Deploy en Stellar Mainnet
- [ ] App móvil (React Native)

---

## Contribuir

Este proyecto está en fase MVP activa. Si quieres contribuir:

1. Haz fork del repositorio
2. Crea una rama: `git checkout -b feature/mi-mejora`
3. Haz commit: `git commit -m 'feat: descripción del cambio'`
4. Push: `git push origin feature/mi-mejora`
5. Abre un Pull Request

---

## Recursos

- [Stellar Developers](https://developers.stellar.org)
- [Stellar Laboratory](https://laboratory.stellar.org) — explorador y herramientas de testnet
- [Freighter Wallet](https://www.freighter.app)
- [Stellar Community Fund](https://communityfund.stellar.org) — grants para proyectos Stellar
- [Stellar Expert Explorer](https://stellar.expert/explorer/testnet)

---

## Licencia

MIT © [RichardEsteban](https://github.com/RichardEsteban)

---

> **⚠️ Testnet Only** — Esta aplicación corre únicamente en Stellar Testnet. No uses fondos reales.
