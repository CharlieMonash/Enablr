import json
import boto3
import os
import uuid
import random

user_pool_id = os.environ['USER_POOL_ID']
dynamodb_resource = boto3.resource('dynamodb')
supporter_table = dynamodb_resource.Table(os.environ['SUPPORTER_TABLE_NAME'])
individual_table = dynamodb_resource.Table(os.environ['INDIVIDUAL_TABLE_NAME'])
task_table = dynamodb_resource.Table(os.environ['TASK_TABLE_NAME'])
access_table = dynamodb_resource.Table(os.environ['ACCESS_TABLE_NAME'])

cognito_client = boto3.client('cognito-idp')


def create_supporter(supporter_details):
    email = supporter_details['email']
    first_name = supporter_details['first_name']
    last_name = supporter_details['last_name']

    response = cognito_client.admin_create_user(
        UserPoolId=user_pool_id,
        Username=email,
        UserAttributes=[
            # {"Name": "first_name", "Value": first_name},
            # {"Name": "last_name", "Value": last_name},
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

    return sub


def create_task(task):
    task_id = str(uuid.uuid4())
    dynamodb_resource.batch_write_item(
        RequestItems={
            task_table.name: [{
                "PutRequest": {
                    "Item": {
                        "task_id": task_id,
                        "details": {
                            "name": task['name'],
                            "description": task['name'],
                            "startTime": task['name'],
                            "endTime": task['name'],
                            "frequency": task['frequency']
                        },
                        "steps": task['steps']
                    }
                }
            }]
        }
    )

    return {"task_id": task_id, "details": task}


def create_child(child_details):
    child_id = str(uuid.uuid4())
    dynamodb_resource.batch_write_item(
        RequestItems={
            individual_table.name: [{
                "PutRequest": {
                    "Item": {
                        "individual_id": child_id,
                        "details": {
                            'firstName': child_details['first_name'],
                            'lastName': child_details['last_name'],
                            'birthday': child_details['birthday'],
                            'tz': child_details['timezone']
                        },

                        "timezone": child_details['timezone'],
                        "tasks": child_details["tasks"]
                    }
                }
            }]
        }
    )

    return child_id


def link_child_to_supporter(supporter_id, child_id):
    dynamodb_resource.batch_write_item(
        RequestItems={
            access_table.name: [{
                "PutRequest": {
                    "Item": {
                        "individual_id": child_id,
                        "supporter_id": supporter_id,
                        "relationship": "PRIMARY"
                    }
                }
            }]
        }
    )
