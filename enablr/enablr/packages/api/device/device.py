import uuid
import datetime
import math
import json
import os
import boto3

INDIVIDUAL_TABLE_NAME = os.environ['INDIVIDUAL_TABLE_NAME']


dynamodb_resource = boto3.resource('dynamodb')
registration_table = dynamodb_resource.Table(
    os.environ['REGISTRATION_TABLE_NAME'])


def get_registration_details(registration_id):
    '''Using the registration ID get the record from the table if it exists'''
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

        return registration
