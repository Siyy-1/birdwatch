variable "environment" {
  type = string
}

variable "app_name" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "sg_alb_id" {
  type = string
}

variable "sg_backend_id" {
  type = string
}

variable "sg_tf_serving_id" {
  type = string
}

variable "s3_bucket_arn" {
  type = string
}

variable "acm_certificate_arn" {
  type    = string
  default = ""
}
