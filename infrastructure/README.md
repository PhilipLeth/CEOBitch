# Infrastructure

This directory contains cloud infrastructure configuration files.

## Cloud Deployment

For cloud deployment, use the Dockerfile and docker-compose.yml in the root directory.

### AWS
- Use ECS with Fargate
- Use Application Load Balancer for routing
- Use CloudWatch for logging

### GCP
- Use Cloud Run
- Use Cloud Logging for logs
- Use Cloud Monitoring for metrics

### Azure
- Use Azure Container Instances
- Use Azure Monitor for logging
- Use Application Insights for metrics