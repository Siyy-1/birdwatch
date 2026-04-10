variable "environment" {
  type = string
}

variable "app_name" {
  type = string
}

variable "kakao_client_id" {
  type = string
}

variable "kakao_client_secret" {
  type      = string
  sensitive = true
}

variable "google_client_id" {
  type = string
}

variable "google_client_secret" {
  type      = string
  sensitive = true
}

# Apple Sign-In — Apple Developer Console에서 발급
# services_id: Apple Services ID (com.kr.birdwatch.service)
# team_id: Apple Developer Team ID (10자리)
# key_id: Sign In with Apple private key ID
# private_key: .p8 파일 내용 (개행 포함)
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
