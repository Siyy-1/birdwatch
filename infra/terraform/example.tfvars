environment                  = "dev"
app_name                     = "birdwatch"
db_username                  = "birdwatch"
db_password                  = "CHANGE_ME_STRONG_PASSWORD"
cognito_kakao_client_id      = "YOUR_KAKAO_REST_API_KEY"
cognito_kakao_client_secret  = "YOUR_KAKAO_SECRET"
cognito_google_client_id     = "YOUR_GOOGLE_CLIENT_ID"
cognito_google_client_secret = "YOUR_GOOGLE_CLIENT_SECRET"
domain_name                  = "birdwatch.kr"
acm_certificate_arn          = "" # dev: 비워두면 HTTP 직접 접속, prod: ACM ARN 입력

# Apple Sign-In (선택 — Apple Developer Console에서 발급)
# 비워두면 Apple provider 미생성 (Kakao+Google만 활성화)
apple_services_id = "" # com.kr.birdwatch.service
apple_team_id     = "" # 10자리 Team ID
apple_key_id      = "" # Sign In with Apple Key ID
apple_private_key = "" # .p8 파일 전체 내용
