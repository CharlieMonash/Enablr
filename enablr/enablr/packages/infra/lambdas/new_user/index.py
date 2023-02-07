import json
import boto3
import os
import uuid
import random

dynamodb_resource = boto3.resource('dynamodb')
supporter_table = dynamodb_resource.Table(os.environ['SUPPORTER_TABLE_NAME'])

user_pool_id = os.environ['USER_POOL_ID']


cognito_client = boto3.client('cognito-idp')


def lambda_handler(event, context):
    email = event['email']
    first_name = event['first_name']
    last_name = event['last_name']

    response = cognito_client.admin_create_user(
        UserPoolId=user_pool_id,
        Username=email,
        UserAttributes=[
            {"Name": "email_verified", "Value": "true"},
            {"Name": "email", "Value": email}
        ],
        DesiredDeliveryMediums=['EMAIL']
    )

    sub = 'oops_no_value'

    for attribute in response['User']['Attributes']:
        if attribute['Name'] == 'sub':
            sub = attribute['Value']

    share_code = f'{random.randrange(100, 999)}-{random.randrange(100, 999)}-{random.randrange(100, 999)}-{random.randrange(100, 999)}'

    # TODO: check for share number existence already

    dynamodb_resource.batch_write_item(
        RequestItems={
            supporter_table.name: [{
                "PutRequest": {
                    "Item": {
                        "supporter_id": sub,
                        "email": email,
                        "details": {
                            'firstName': first_name,
                            'lastName': last_name
                        },
                        # An identifier to be able to share with a parent to get access. Unique.
                        "shareIdentifier": share_code
                    }
                }
            }]
        }
    )

    return 1


test_event = {
    "email": "<your email here>",
    "first_name": "Luke",
    "last_name": "Skywalker"
}


lambda_handler(test_event, {})
