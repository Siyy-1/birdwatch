# GitHub Secrets & Variables 설정 가이드

GitHub 저장소 Settings → Secrets and variables → Actions 에서 등록합니다.

---

## Repository Secrets

| Secret 이름 | 용도 | 발급 방법 |
|-------------|------|-----------|
| `AWS_DEPLOY_ROLE_ARN` | Backend CI — ECS 배포용 IAM Role | AWS IAM → Roles → OIDC 신뢰 정책으로 생성 (아래 참조) |
| `AWS_TERRAFORM_ROLE_ARN` | Terraform CI — plan/apply용 IAM Role | AWS IAM → Roles → OIDC 신뢰 정책으로 생성 |
| `EXPO_TOKEN` | EAS Build 인증 토큰 | expo.dev → Account Settings → Access Tokens |
| `TF_DB_PASSWORD` | Terraform apply — RDS 비밀번호 | 직접 설정 (20자 이상 강력한 패스워드) |
| `TF_KAKAO_CLIENT_ID` | Terraform apply — Kakao OAuth | [Kakao Developers](https://developers.kakao.com) → 앱 → REST API 키 |
| `TF_KAKAO_CLIENT_SECRET` | Terraform apply — Kakao OAuth | Kakao Developers → 앱 → 보안 → Client Secret |
| `TF_GOOGLE_CLIENT_ID` | Terraform apply — Google OAuth | [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials |
| `TF_GOOGLE_CLIENT_SECRET` | Terraform apply — Google OAuth | Google Cloud Console → OAuth 2.0 Client ID |

---

## Repository Variables

| Variable 이름 | 기본값 | 용도 |
|--------------|--------|------|
| `ENVIRONMENT` | `dev` | ECS 클러스터/서비스 이름 접두사 (dev/prod) |

---

## GitHub Environments

### `staging` Environment
- Settings → Environments → New environment → `staging`
- DB migration workflow에서 staging 실행 이력을 분리해두려면 생성 권장

### `dev` Environment
- 현재 저장소 자동화 기준 기본 비프로덕션 환경은 `dev`
- 별도 GitHub environment는 필수는 아니지만, 실행 이력 분리를 원하면 생성 가능

### `production` Environment
- Settings → Environments → New environment → `production`
- **Required reviewers** 1명 이상 설정 (terraform apply, EAS production 빌드 전 수동 승인)
- Protection rules: `main` 브랜치만 허용

---

## AWS OIDC 신뢰 정책 설정

GitHub Actions에서 AWS 자격증명을 장기 키 없이 사용하려면 OIDC 연동이 필요합니다.

### 1. OIDC Identity Provider 등록 (AWS 계정당 1회)
```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

### 2. IAM Role 생성 (배포용)
신뢰 정책 (`trust-policy-deploy.json`):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/YOUR_REPO:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

```bash
# 배포용 Role 생성
aws iam create-role \
  --role-name birdwatch-github-deploy \
  --assume-role-policy-document file://trust-policy-deploy.json

# ECR + ECS 권한 연결
aws iam attach-role-policy \
  --role-name birdwatch-github-deploy \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser

aws iam attach-role-policy \
  --role-name birdwatch-github-deploy \
  --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess
```

### 3. IAM Role 생성 (Terraform용)
```bash
# Terraform Role (PowerUser + IAM 일부)
aws iam create-role \
  --role-name birdwatch-github-terraform \
  --assume-role-policy-document file://trust-policy-terraform.json

aws iam attach-role-policy \
  --role-name birdwatch-github-terraform \
  --policy-arn arn:aws:iam::aws:policy/PowerUserAccess
```
> ⚠️ PowerUserAccess는 광범위합니다. 프로덕션에서는 필요한 서비스별 최소 권한 정책으로 교체하세요.

---

## 체크리스트

### GitHub 설정
- [ ] `production` Environment 생성 + Required reviewers 설정
- [ ] `staging` Environment 생성 (권장)
- [ ] `ENVIRONMENT` Variable 등록 (`dev`)
- [ ] 위 Secrets 전부 등록

### AWS 설정
- [ ] OIDC Provider 등록
- [ ] `birdwatch-github-deploy` Role 생성 + ARN을 `AWS_DEPLOY_ROLE_ARN`에 등록
- [ ] `birdwatch-github-terraform` Role 생성 + ARN을 `AWS_TERRAFORM_ROLE_ARN`에 등록
- [ ] Terraform S3 backend 버킷 생성: `birdwatch-terraform-state` (ap-northeast-2, versioning on)
- [ ] Terraform DynamoDB lock 테이블 생성: `birdwatch-terraform-locks`
- [ ] `AWS_TERRAFORM_ROLE_ARN` Role에 `ssm:GetParameter` / `kms:Decrypt` 권한이 있는지 확인

### EAS 설정
- [ ] `expo.dev`에서 프로젝트 생성 → Project ID를 GitHub Variable `EAS_PROJECT_ID`에 등록
- [ ] Expo 계정/조직명을 GitHub Variable `EXPO_OWNER`에 등록
- [ ] `EXPO_TOKEN` 발급 → GitHub Secret 등록
- [ ] App Store/Play Store 제출 준비가 끝나면 GitHub Variable `EAS_SUBMIT_ENABLED=true` 등록

### Terraform Backend 활성화
`infra/terraform/provider.tf`의 S3 backend 주석 해제 후:
```bash
cd infra/terraform
terraform init -migrate-state
```

---

## DB Migration Workflow

수동 실행 워크플로우:

- `.github/workflows/db-migrate.yml`

용도:

- dev/staging/prod DB에 대해 `doctor/status` 실행
- legacy DB baseline 실행
- pending migration 수동 적용

동작 방식:

- GitHub Actions OIDC로 AWS 인증
- 현재 코드로 backend production 이미지를 빌드해 ECR에 push
- ECS backend 서비스와 같은 VPC/subnet/security group을 재사용한 one-off task 실행
- task 내부에서 `node dist/scripts/migrate.js ...` 실행

필요 권한:

- `AWS_DEPLOY_ROLE_ARN`
  - ECR push
  - ECS describe/register/run-task
  - CloudWatch Logs 조회
- ECS task execution/task role
  - 기존 backend 서비스와 동일하게 SSM secret 접근 가능해야 함

production 적용 시 보호 장치:

- GitHub `production` environment 승인
- workflow input `confirm_production=prod-apply` 필요
