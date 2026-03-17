package config

import "os"

var AWSAccount = os.Getenv("AWS_ACCOUNT")
var AWSRegion = os.Getenv("AWS_REGION")
var CertificateARN = os.Getenv("CERTIFICATE_ARN")