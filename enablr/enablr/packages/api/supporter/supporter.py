import json
import os
import boto3
from individual import get_individual_details

SUPPORTER_TABLE_NAME = os.environ['SUPPORTER_TABLE_NAME']
SHARE_SUPPORTER_INDEX_NAME = os.environ['SHARE_SUPPORTER_INDEX_NAME']

ACCESS_TABLE_NAME = os.environ['ACCESS_TABLE_NAME']
ACCESS_TABLE_INDEX_NAME = os.environ['ACCESS_TABLE_INDEX_NAME']

dynamodb = boto3.client('dynamodb')
dynamodb_resource = boto3.resource('dynamodb')

supporter_table = dynamodb_resource.Table(SUPPORTER_TABLE_NAME)


def load_supporter_details(record):
    '''calls get_supporter_details, getting the value properly out of a dynamodb response'''
    return get_supporter_details(record['supporter_id']['S'])


def get_supporter_details(supporter_id):
    '''using a supporter ID, get the details of the supporter'''
    batch_keys = {
        supporter_table.name: {
            'Keys': [{'supporter_id': supporter_id}]
        }
    }

    response = dynamodb_resource.batch_get_item(
        RequestItems=batch_keys
    )

    supporter = response['Responses'][supporter_table.name][0]

    return {
        'id': supporter_id,
        'details': supporter['details'],
        'shareIdentifier': supporter['shareIdentifier']
    }


def get_supporter_details_by_share(share_identifier):
    '''using a share_identifier, get the details of the supporter'''
    response = dynamodb.query(
        TableName=SUPPORTER_TABLE_NAME,
        IndexName=SHARE_SUPPORTER_INDEX_NAME,
        KeyConditionExpression='shareIdentifier = :shareIdentifier',
        ExpressionAttributeValues={
            ':shareIdentifier': {'S': share_identifier}
        }
    )

    if len(response['Items']) > 0:
        supporter = response['Items'][0]
        return {
            'id': supporter['supporter_id']['S'],
            'firstName': supporter['details']['M']['firstName']['S'],
            'lastName': supporter['details']['M']['lastName']['S']
        }
    else:
        return {
            'invalid': True
        }


def add_supporter_permission(individual_id, supporter_id, relationship):
    '''Add permission for a supporter to access an individual using a relationship at x tier'''
    # TODO: double check for no relationship already

    dynamodb_resource.batch_write_item(
        RequestItems={
            ACCESS_TABLE_NAME: [{
                "PutRequest": {
                    "Item": {
                        "supporter_id": supporter_id,
                        "individual_id": individual_id,
                        "relationship": relationship
                    }
                }
            }]
        }
    )
    return {
        "status": "done"
    }


def delete_supporter_permission(individual_id, supporter_id):
    '''revoke permission for a supporter to access an individual'''
    dynamodb_resource.batch_write_item(
        RequestItems={
            ACCESS_TABLE_NAME: [{
                "DeleteRequest": {
                    "Key": {
                        "supporter_id": supporter_id,
                        "individual_id": individual_id
                    }
                }
            }]
        }
    )
    return {
        "status": "done"
    }


def load_individual_details(record):
    '''calls get_individual_details, getting the value properly out of a dynamodb response'''
    individual = get_individual_details(record['individual_id']['S'])

    return individual


def get_supporter_individuals(supporter_id):
    '''Get all individuals that the supporter has access to, load the individuals details as well'''
    response = dynamodb.query(
        TableName=ACCESS_TABLE_NAME,
        IndexName=ACCESS_TABLE_INDEX_NAME,
        KeyConditionExpression='supporter_id = :supporter_id',
        ExpressionAttributeValues={
            ':supporter_id': {'S': supporter_id}
        }
    )
    result = []
    for relationship in response['Items']:
        individual = load_individual_details(relationship)
        result.append({'individual': individual,
                      'relationship': relationship['relationship']['S']})

    return result


def get_individual_supporters(individual_id):
    '''Get all the supporters that can access a given individual, load the supports details as well'''
    response = dynamodb.query(
        TableName=ACCESS_TABLE_NAME,
        KeyConditionExpression='individual_id = :individual_id',
        ExpressionAttributeValues={
            ':individual_id': {'S': individual_id}
        }
    )

    result = []
    for access_item in response['Items']:
        supp_details = load_supporter_details(access_item)

        result.append({'supporter': {
            "id": supp_details["id"],
            "details": supp_details["details"]
        },
            'relationship': access_item['relationship']['S']})

    return result
