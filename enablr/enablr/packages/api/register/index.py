"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

 Licensed under the Apache License, Version 2.0 (the "License").
 You may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
"""
import boto3
import logging
import device
import jwt
import os

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.event_handler import APIGatewayRestResolver, CORSConfig, Response, content_types
from aws_lambda_powertools.utilities.data_classes import APIGatewayProxyEvent

logging.getLogger().setLevel(logging.INFO)
logger = Logger(service="api/task")

cors_config = CORSConfig(allow_origin="*", max_age=0)
app = APIGatewayRestResolver(cors=cors_config)

tracer = Tracer()

ssm_client = boto3.client('ssm')

private_ssm_parameter = ssm_client.get_parameter(
    Name=os.environ['JWT_PRIVATE_SIGNING_KEY'],
    WithDecryption=True
)

secret = private_ssm_parameter['Parameter']['Value']


@app.post("/register/device")
@tracer.capture_method
def post_register_device():
    '''Attempt to register a device to an id. This will require the registration id to both exist, not be expired and not have already been used'''
    details: dict = app.current_event.json_body
    device_id = details['deviceId']
    registration_id = details['registrationId']
    device_name = details['deviceName']
    # TODO: validate inputs

    registration = device.get_registration_details(registration_id)
    if (registration):
        response = device.register_device(
            registration_id, device_id, device_name)
        token = jwt.encode({
            "registrationId": response['registrationId']}, secret, algorithm='RS256')
        return {"token": token}
    else:
        return Response(
            status_code=403,
            content_type=content_types.TEXT_PLAIN,
            body="Registration expired or invalid",
        )
    # get device ID
    # get ID from the device table
    # post details to device table
    # create JWT
    # encode with secret
    # return JWT


@ logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_REST, log_event=True)
@ tracer.capture_lambda_handler
def lambda_handler(event: APIGatewayProxyEvent, context):
    '''The handler method that needs to exist in order for this to be used in lambda'''
    # print(event)
    return app.resolve(event, context)
