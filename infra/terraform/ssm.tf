resource "random_password" "jwt_secret" {
  length  = 48
  special = false
}

resource "aws_ssm_parameter" "database_url" {
  name      = "/${var.app_name}/${var.environment}/database_url"
  type      = "SecureString"
  value     = "postgresql://${var.db_username}:${urlencode(var.db_password)}@${module.rds.rds_endpoint}/${module.rds.rds_db_name}"
  overwrite = true
}

resource "aws_ssm_parameter" "jwt_secret" {
  name      = "/${var.app_name}/${var.environment}/jwt_secret"
  type      = "SecureString"
  value     = random_password.jwt_secret.result
  overwrite = true
}

resource "aws_ssm_parameter" "model_path" {
  name      = "/${var.app_name}/${var.environment}/model_path"
  type      = "String"
  value     = "/models/birdwatch_v1.0.0.tflite"
  overwrite = true
}
