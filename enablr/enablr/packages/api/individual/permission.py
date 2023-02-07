import json
import os
import boto3

ACCESS_TABLE_NAME = os.environ['ACCESS_TABLE_NAME']

dynamodb_resource = boto3.resource('dynamodb')
access_table = dynamodb_resource.Table(ACCESS_TABLE_NAME)


def get_access_permission(individual_id, supporter_id):
    '''Get the access record for an individual and supporter combo
    return denied if it doesn't exist'''
    batch_keys = {
        access_table.name: {
            'Keys': [{'individual_id': individual_id, 'supporter_id': supporter_id}]
        }
    }

    response = dynamodb_resource.batch_get_item(
        RequestItems=batch_keys
    )

    if len(response['Responses'][access_table.name]) > 0:

        access = response['Responses'][access_table.name][0]

        return access
    else:
        return {
            'supporter_id': individual_id,
            'individual_id': supporter_id,
            'relationship': 'DENIED'
        }
