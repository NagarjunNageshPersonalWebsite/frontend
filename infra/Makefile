build:
	go build website-infra.go
	cdk $(action) $(stack) --region $(region) --require-approval never
bootstrap:
	cdk bootstrap --region $(region)