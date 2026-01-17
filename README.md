# CEOBitch

Et selvstyrende AI-organisationssystem der fungerer som en organisation frem for et værktøj.

## Systemessens

Kaos nedenunder. Disciplin ovenpå. Intet slipper igennem uden at være værd at vise frem.

## Hovedkomponenter

- **AIR** (Agent Intelligence Runtime): Skaber og administrerer agenter
- **Agents**: AI-ansatte der udfører afgrænsede opgaver
- **CEO Bitch**: Kvalitetens og disciplinens stemme
- **Owner**: Mennesket der angiver mål og prioriteringer
- **Capabilities**: Systemets fælles handlekraft

## Autonome Features

Systemet kan køre fuldt autonomt uden menneskelig intervention gennem:

- **Ralph Integration**: Kontinuerlig orchestration loop der kører til opgaven er færdig
- **Amp Integration**: Agentic code review og generation fra [Amp](https://ampcode.com/)
- **Git Gateway**: Alle production changes går gennem git før deployment
- **GitHub Actions**: Automatisk CI/CD pipeline der deployer ved push til main

## Setup

```bash
npm install
npm run build
npm run dev
```

## API Endpoints

### Submit Order (Always Autonomous)
```bash
POST /api/owner/orders
{
  "description": "Task description"
}
```

### Submit Autonomous Order (Ralph + Amp)
```bash
POST /api/owner/orders/autonomous
{
  "description": "Task description"
}
```

### Get Order Status
```bash
GET /api/owner/orders/:id
```

### Get Metrics
```bash
GET /api/owner/metrics
```

## Deployment

Alt deployment går gennem git:

1. Code changes committes automatisk
2. Push til `main` branch triggerer GitHub Actions
3. CI/CD pipeline tester og deployer til production

### Environment Variables

Se `.env.example` for alle konfigurationsmuligheder.

## License

MIT