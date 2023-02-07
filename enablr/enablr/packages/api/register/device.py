import uuid
import datetime
import math
import json
import os
import boto3

dynamodb_resource = boto3.resource('dynamodb')
registration_table = dynamodb_resource.Table(
    os.environ['REGISTRATION_TABLE_NAME'])


def get_registration_details(registration_id):
    '''Get the details of the registration code to ensure it's valid.'''
    batch_keys = {
        registration_table.name: {
            'Keys': [{'registration_id': registration_id}]
        }
    }

    response = dynamodb_resource.batch_get_item(
        RequestItems=batch_keys
    )

    if len(response['Responses'][registration_table.name]) > 0:

        registration = response['Responses'][registration_table.name][0]

        if (registration['expiry'] > datetime.datetime.now().timestamp()) and not ('device_id' in registration.keys()):
            return registration


def register_device(registration_id, device_id, device_name):
    '''Align a device ID and device name to a registration'''
    registration_table.update_item(
        Key={'registration_id': registration_id},
        UpdateExpression="set device_id=:d, device_name=:n",
        ExpressionAttributeValues={
            ':d': device_id,
            ':n': device_name
        },
        ReturnValues="ALL_NEW")

    return {"registrationId": registration_id}
