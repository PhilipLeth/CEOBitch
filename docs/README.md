# CEOBitch Documentation

CEOBitch er et selvstyrende AI-organisationssystem, der automatiserer opgaveudførelse med kvalitetssikring.

## Arkitektur

### Hovedkomponenter

1. **AIR (Agent Intelligence Runtime)** - Styrer agentoprettelse, routing og organisationsversionering
2. **Agent System** - Base agent-klasse med playbook-baseret execution
3. **CEO Bitch (Quality Gate)** - Kvalitetsvurdering og godkendelsesworkflow
4. **Capabilities Framework** - Delte handlinger for alle agenter
5. **Owner Interface** - API til ordreindsendelse og rapportvisning

### Dataflow

```
Owner Order → AIR Routing → Agent Selection/Creation → 
Staging Execution → Report Generation → CEO Bitch Review → 
Approval/Rejection → Live Deployment (if approved)
```

## API Endpoints

### Owner API (`/api/owner/`)

- `POST /orders` - Indsend ny ordre
- `GET /orders` - Hent alle ordrer
- `GET /orders/:id` - Hent ordre status
- `GET /reports/:reportId` - Hent execution rapport
- `POST /approvals/:reportId` - Godkend/afvis resultat
- `GET /metrics` - Hent system metrics

### CEO Bitch API (`/api/ceo-bitch/`)

- `POST /evaluate` - Evaluer kvalitet af rapport
- `POST /assess-risk` - Vurder risiko
- `POST /review` - Fuld rapport review
- `GET /standards` - Hent kvalitetsstandarder

### AIR API (`/api/air/`)

- `POST /agents` - Registrer ny agent
- `GET /agents` - Hent alle agenter
- `GET /agents/:id` - Hent agent by ID
- `PATCH /agents/:id/status` - Opdater agent status
- `POST /playbooks` - Registrer playbook
- `GET /playbooks` - Hent alle playbooks
- `GET /organization/version` - Hent organisationsversion
- `POST /organization/snapshot` - Opret organisations-snapshot

## Workflows

### Order Flow

Håndterer den komplette ordreudførelsesproces fra modtagelse til godkendelse.

### Quality Gate Flow

CEO Bitch review workflow:
1. Report Received
2. Quality Evaluation
3. Risk Assessment
4. Decision (Approve/Reject/Improve)
5. Feedback Loop

### Agent Creation Flow

1. Agent Request
2. Responsibility Definition
3. Playbook Assignment
4. Test Environment Setup
5. Initial Test
6. Staging Activation

## Konfiguration

Konfiguration findes i `src/config/`:

- AI Provider settings
- Quality standards
- Risk thresholds
- Execution limits

## Sikkerhed

- Alle agenter kører i staging før live deployment
- Risk assessment på alle execution reports
- Human override mulighed for godkendelser
- Resource limits på agent execution
- Runaway detection og instant stop

## Database

Schema definitioner i `src/database/schema/`:

- `agents` - Agent definitions
- `playbooks` - Playbook templates
- `orders` - Owner ordrer
- `executions` - Execution historik
- `reports` - Execution reports
- `approvals` - CEO Bitch godkendelser
- `organization_versions` - Organisation snapshots
- `capabilities` - Capability registry

## Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Alle checks
./run.sh
```

## Deployment

Docker-baseret deployment:

```bash
docker-compose up -d
```

Se `deploy/` og `infrastructure/` for deployment scripts og cloud configuration.
