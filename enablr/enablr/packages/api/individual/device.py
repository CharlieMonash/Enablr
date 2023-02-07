import uuid
import datetime
import math
import json
import os
import boto3


REGISTRATION_TABLE_NAME = os.environ['REGISTRATION_TABLE_NAME']
REGISTRATION_TABLE_INDEX_NAME = os.environ['REGISTRATION_TABLE_INDEX_NAME']
dynamodb = boto3.client('dynamodb')
dynamodb_resource = boto3.resource('dynamodb')
registration_table = dynamodb_resource.Table(REGISTRATION_TABLE_NAME)


def get_new_device_registration(individual_id):
    '''Using the individual ID, create a new short-lived registration token'''
    registration_id = str(uuid.uuid4())

    dynamodb_resource.batch_write_item(
        RequestItems={
            registration_table.name: [{
                "PutRequest": {
                    "Item": {
                        "registration_id": registration_id,
                        "individual_id": individual_id,
                        "expiry": math.floor(datetime.datetime.now().timestamp() + (60 * 60)),
                    }
                }
            }]
        }
    )

    return {"registrationId": registration_id}


def get_devices(individual_id):
    '''Get all devices connected to an individual and filter out the revoked ones.
    '''
    response = dynamodb.query(
        TableName=REGISTRATION_TABLE_NAME,
        IndexName=REGISTRATION_TABLE_INDEX_NAME,
        KeyConditionExpression='individual_id = :individual_id',
        ExpressionAttributeValues={
            ':individual_id': {'S': individual_id}
        }
    )

    results = []

    for reminder in response['Items']:
        if ("device_id" in reminder) and ("revoked" not in reminder):
            results.append({
                'registration_id': reminder['registration_id']['S'],
                'device_name': reminder['device_name']['S']
            })
    return results


def revoke_registration(registration_id):
    '''Mark a registration ID as revoked'''
    registration_table.update_item(
        Key={'registration_id': registration_id},
        UpdateExpression="set revoked=:r",
        ExpressionAttributeValues={
            ':r': 'REVOKED'
        },
        ReturnValues="ALL_NEW")

    return {"registrationId": registration_id}
