import json
import os
import jwt
import re
import boto3
from base64 import b64decode

from aws_lambda_powertools.utilities.data_classes import event_source
from aws_lambda_powertools.utilities.data_classes.api_gateway_authorizer_event import (
    DENY_ALL_RESPONSE,
    APIGatewayAuthorizerRequestEvent,
    APIGatewayAuthorizerResponse,
    HttpVerb,
)

# SSM is AWS systems manager, it's where we store encrypted secrets so they don't sit in our code.
ssm_client = boto3.client('ssm')

public_ssm_parameter = ssm_client.get_parameter(
    Name=os.environ['JWT_PUBLIC_SIGNING_KEY'],
    WithDecryption=True
)

public_key = public_ssm_parameter['Parameter']['Value']


def decode_token(jwt_token):
    '''Takes a JWT token and validates the content'''
    if jwt_token is None:
        return None

    # Split the JWT to get the token and the signature
    jwt_parts = jwt_token.split(" ")
    if len(jwt_parts) != 2:
        return None

    # Verify the JWT using the public key
    try:
        decoded_jwt = jwt.decode(jwt_parts[1], public_key, algorithms='RS256')
    except jwt.exceptions.DecodeError:
        return None

    # Verify that the JWT has the correct claims
    if decoded_jwt.get("registrationId") is None:
        return None
    else:
        # Pass the registration ID into the context to be used by the API
        # Further action can be take right here to validate the registration id is valid and not revoked.
        return {
            'registration_id': decoded_jwt.get("registrationId")
        }


@event_source(data_class=APIGatewayAuthorizerRequestEvent)
def lambda_handler(event: APIGatewayAuthorizerRequestEvent, context):
    '''Handler for the authorizer. The context is not used but still needs to be defined.'''
    registration = decode_token(event['authorizationToken'])

    if registration is None:
        return DENY_ALL_RESPONSE

    arn = event.parsed_arn
    policy = APIGatewayAuthorizerResponse(
        principal_id='deviceuser',
        context=registration,
        region=arn.region,
        aws_account_id=arn.aws_account_id,
        api_id=arn.api_id,
        stage=arn.stage,
    )

    policy.allow_all_routes()
    return policy.asdict()
