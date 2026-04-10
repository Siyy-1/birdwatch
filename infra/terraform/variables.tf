variable "environment" {
  type    = string
  default = "dev"
}

variable "app_name" {
  type    = string
  default = "birdwatch"
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "db_username" {
  type    = string
  default = "birdwatch"
}

variable "cognito_kakao_client_id" {
  type = string
}

variable "cognito_kakao_client_secret" {
  type      = string
  sensitive = true
}

variable "cognito_google_client_id" {
  type = string
}

variable "cognito_google_client_secret" {
  type      = string
  sensitive = true
}

variable "domain_name" {
  type    = string
  default = "birdwatch.kr"
}

variable "acm_certificate_arn" {
  type        = string
  default     = ""
  description = "ACM 인증서 ARN. 비워두면 HTTPS 리스너 생성 안 함 (dev 환경용)."
}

# Apple Sign-In (선택 — 비워두면 Apple provider 미생성)
variable "apple_services_id" {
  type    = string
  default = ""
}

variable "apple_team_id" {
  type    = string
  default = ""
}

variable "apple_key_id" {
  type    = string
  default = ""
}

variable "apple_private_key" {
  type      = string
  sensitive = true
  default   = ""
}
