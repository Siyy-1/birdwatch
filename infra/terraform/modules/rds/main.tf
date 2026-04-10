locals {
  instance_class = var.environment == "prod" ? "db.r6g.large" : "db.t3.medium"
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.app_name}-${var.environment}-db-subnet-group"
  subnet_ids = var.private_subnet_ids
}

resource "aws_db_parameter_group" "this" {
  name   = "${var.app_name}-${var.environment}-postgres16"
  family = "postgres16"

  parameter {
    name         = "shared_preload_libraries"
    value        = "pg_stat_statements"
    apply_method = "pending-reboot"
  }
}

resource "aws_db_instance" "this" {
  identifier                = "${var.app_name}-${var.environment}"
  engine                    = "postgres"
  engine_version            = "16.6"
  instance_class            = local.instance_class
  allocated_storage         = 20
  max_allocated_storage     = 100
  storage_encrypted         = true
  db_name                   = "birdwatch"
  username                  = var.db_username
  password                  = var.db_password
  db_subnet_group_name      = aws_db_subnet_group.this.name
  parameter_group_name      = aws_db_parameter_group.this.name
  vpc_security_group_ids    = [var.sg_rds_id]
  multi_az                  = true
  backup_retention_period   = 7
  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.app_name}-${var.environment}-final-snapshot"
}
