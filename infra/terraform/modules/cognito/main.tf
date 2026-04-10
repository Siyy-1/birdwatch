resource "aws_cognito_user_pool" "this" {
  name                     = "${var.app_name}-${var.environment}"
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_uppercase = true
    require_numbers   = true
    require_lowercase = false
    require_symbols   = false
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  schema {
    attribute_data_type = "String"
    name                = "email"
    mutable             = false
    required            = true
  }

  schema {
    attribute_data_type = "String"
    name                = "nickname"
    mutable             = true
    required            = false
  }
}

resource "aws_cognito_user_pool_domain" "this" {
  domain       = "${var.app_name}-${var.environment}"
  user_pool_id = aws_cognito_user_pool.this.id
}

resource "aws_cognito_identity_provider" "kakao" {
  user_pool_id  = aws_cognito_user_pool.this.id
  provider_name = "Kakao"
  provider_type = "OIDC"

  provider_details = {
    attributes_request_method = "GET"
    authorize_scopes          = "openid profile account_email"
    authorize_url             = "https://kauth.kakao.com/oauth/authorize"
    client_id                 = var.kakao_client_id
    client_secret             = var.kakao_client_secret
    jwks_uri                  = "https://kauth.kakao.com/.well-known/jwks.json"
    oidc_issuer               = "https://kauth.kakao.com"
    token_url                 = "https://kauth.kakao.com/oauth/token"
    attributes_url            = "https://kapi.kakao.com/v2/user/me"
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
  }
}

resource "aws_cognito_identity_provider" "google" {
  user_pool_id  = aws_cognito_user_pool.this.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    authorize_scopes = "openid email profile"
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
  }
}

# Apple Sign-In — 4개 변수가 모두 있을 때만 생성
resource "aws_cognito_identity_provider" "apple" {
  count = (
    var.apple_services_id != "" &&
    var.apple_team_id != "" &&
    var.apple_key_id != "" &&
    var.apple_private_key != ""
  ) ? 1 : 0

  user_pool_id  = aws_cognito_user_pool.this.id
  provider_name = "SignInWithApple"
  provider_type = "SignInWithApple"

  provider_details = {
    client_id        = var.apple_services_id
    team_id          = var.apple_team_id
    key_id           = var.apple_key_id
    private_key      = var.apple_private_key
    authorize_scopes = "name email"
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
  }
}

locals {
  apple_provider = (
    var.apple_services_id != "" &&
    var.apple_team_id != "" &&
    var.apple_key_id != "" &&
    var.apple_private_key != ""
  ) ? ["SignInWithApple"] : []
}

resource "aws_cognito_user_pool_client" "mobile" {
  name                                 = "${var.app_name}-${var.environment}-mobile"
  user_pool_id                         = aws_cognito_user_pool.this.id
  generate_secret                      = false
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  callback_urls                        = ["birdwatch://callback"]
  logout_urls                          = ["birdwatch://logout"]
  supported_identity_providers         = concat(["Kakao", "Google"], local.apple_provider)
  explicit_auth_flows                  = ["ALLOW_REFRESH_TOKEN_AUTH"]
  prevent_user_existence_errors        = "ENABLED"

  depends_on = [
    aws_cognito_identity_provider.kakao,
    aws_cognito_identity_provider.google,
    aws_cognito_identity_provider.apple,
  ]
}
