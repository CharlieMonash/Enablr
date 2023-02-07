import json
import os
import boto3


INDIVIDUAL_TABLE_NAME = os.environ['INDIVIDUAL_TABLE_NAME']
dynamodb_resource = boto3.resource('dynamodb')
individual_table = dynamodb_resource.Table(INDIVIDUAL_TABLE_NAME)


def get_individual_details(individual_id):
    '''Load an individuals details from dynamodb'''
    batch_keys = {
        individual_table.name: {
            'Keys': [{'individual_id': individual_id}]
        }
    }

    response = dynamodb_resource.batch_get_item(
        RequestItems=batch_keys
    )

    individual = response['Responses'][individual_table.name][0]

    return {
        'tasks': individual['tasks'],
        'individual_id': individual['individual_id'],
        'details': individual['details']
    }
