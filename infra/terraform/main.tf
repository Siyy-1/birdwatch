module "vpc" {
  source = "./modules/vpc"

  environment = var.environment
  app_name    = var.app_name
}

module "rds" {
  source = "./modules/rds"

  environment        = var.environment
  app_name           = var.app_name
  db_username        = var.db_username
  db_password        = var.db_password
  private_subnet_ids = module.vpc.private_subnet_ids
  sg_rds_id          = module.vpc.sg_rds_id
}

module "s3" {
  source = "./modules/s3"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  environment = var.environment
  app_name    = var.app_name
}

module "cognito" {
  source = "./modules/cognito"

  environment          = var.environment
  app_name             = var.app_name
  kakao_client_id      = var.cognito_kakao_client_id
  kakao_client_secret  = var.cognito_kakao_client_secret
  google_client_id     = var.cognito_google_client_id
  google_client_secret = var.cognito_google_client_secret
  apple_services_id    = var.apple_services_id
  apple_team_id        = var.apple_team_id
  apple_key_id         = var.apple_key_id
  apple_private_key    = var.apple_private_key
}

module "ecs" {
  source = "./modules/ecs"

  environment          = var.environment
  app_name             = var.app_name
  vpc_id               = module.vpc.vpc_id
  public_subnet_ids    = module.vpc.public_subnet_ids
  private_subnet_ids   = module.vpc.private_subnet_ids
  sg_alb_id            = module.vpc.sg_alb_id
  sg_backend_id        = module.vpc.sg_backend_id
  sg_tf_serving_id     = module.vpc.sg_tf_serving_id
  s3_bucket_arn        = module.s3.s3_bucket_arn
  acm_certificate_arn  = var.acm_certificate_arn
}
