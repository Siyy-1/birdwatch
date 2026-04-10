output "alb_dns_name" {
  value = module.ecs.alb_dns_name
}

output "rds_endpoint" {
  value = module.rds.rds_endpoint
}

output "s3_bucket_name" {
  value = module.s3.s3_bucket_name
}

output "cloudfront_domain" {
  value = module.s3.cloudfront_domain_name
}

output "cognito_user_pool_id" {
  value = module.cognito.cognito_user_pool_id
}

output "cognito_client_id" {
  value = module.cognito.cognito_client_id
}

output "cognito_domain" {
  value = module.cognito.cognito_domain
}
