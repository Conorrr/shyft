#!/usr/bin/env bash
set -o xtrace
sam package --output-template-file packaged.yaml --s3-bucket shyfttemplates
aws cloudformation deploy --template-file /home/conor/shyft/server/packaged.yaml --stack-name testshyft --capabilities CAPABILITY_IAM
