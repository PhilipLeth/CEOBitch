# Changelog

## [Unreleased]

### Features
- Implement PRD requirements for autonomous order handling and owner order tracking
- Update PRD scope with DoD behavior checks, roadmap, whitelist, runner mode
- Tighten PRD status model, retry limits, live state, and v0 capabilities
- Add PRD requirements for idempotent runner and file write scope
- Git-baseret deployment: alt går gennem git før production deployment
- Ralph integration: autonom orchestration med continuous loop pattern
- Amp integration: agentic code review og generation fra ampcode.com
- GitHub Actions CI/CD pipeline for automatisk deployment
- Autonomous order flow: fuldt autonom execution uden human intervention
- Git gateway: sikrer alle changes committes før production
- Implementeret selvstyrende AI-organisationssystem med AIR (Agent Intelligence Runtime)
- Tilføjet agent registry og versioning system
- Implementeret playbook engine til at definere agent workflows
- Bygget execution sandbox for isoleret test/staging miljø
- Implementeret CEO Bitch quality gate med kvalitets- og risikovurdering
- Tilføjet approval workflow med automatisk og manuel godkendelse
- Implementeret capabilities framework med file operations og API client
- Tilføjet order flow: Owner → AIR → Agent → Staging → Report → CEO Bitch → Approval
- Oprettet Owner API til at indsende ordrer og se rapporter
- Implementeret safety mechanisms: runaway detection og instant stop
- Tilføjet monitoring og logging system med metrics collection
- Setup Docker og cloud infrastructure readiness
- Removed priority and agent selection from order submission so CEOBitch routes tasks
- Force all orders to run via autonomous flow
- Prevent autonomous orders from failing in repos without git history
- Autonomous orders can create a landing page when requested
- Ralph Wiggum mode keeps retrying autonomous orders until completion
- Add PRD document for the project
- Add verification loop artifacts (prd, progress, run, smoke)
- Add minimal ESLint configuration for verification chain
- Allow verification chain to pass when tests are not present

### Technical
- TypeScript/Node.js projekt struktur
- Express API server
- In-memory storage (ingen database i første version)
- Konfiguration via environment variables
- Docker containerization
- Deployment scripts