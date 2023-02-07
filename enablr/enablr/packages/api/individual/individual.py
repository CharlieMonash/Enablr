import json
import os
import boto3


INDIVIDUAL_TABLE_NAME = os.environ['INDIVIDUAL_TABLE_NAME']


dynamodb_resource = boto3.resource('dynamodb')
individual_table = dynamodb_resource.Table(os.environ['INDIVIDUAL_TABLE_NAME'])


def get_individual_details(individual_id):
    '''Get the individuals details from dynamodb'''
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


def update_individual_details(individual_id, details):
    '''Update the individuals details in dynamoDb'''
    response = individual_table.update_item(
        Key={'individual_id': individual_id},
        UpdateExpression="set details.firstName=:f, details.lastName=:l, details.birthday=:b, details.tz=:t, details.primaryColor=:p, details.secondaryColor=:c",
        ExpressionAttributeValues={
            ':f': details["firstName"],
            ':l': details["lastName"],
            ':b': details["birthday"],
            ':t': details["timezone"],
            ':p': details["primaryColor"],
            ':c': details["secondaryColor"]
        },
        ReturnValues="ALL_NEW")

    individual = response["Attributes"]

    return {
        'tasks': individual['tasks'],
        'individual_id': individual['individual_id'],
        'details': individual['details']
    }


def update_individual_tasks(individual_id, tasks):
    '''A straight up replace of tasks, if the tasks dont actually change then they will remain the same, but since the tasks are nested object
    just replace all of them each time. This isn't a lot of write capacity'''
    formatted_tasks = []

    for task in tasks:
        formatted_tasks.append({
            "task_id": task["task_id"],
            "details": {
                "name": task["details"]["name"],
                "description": task["details"]["description"],
                "endTime": {
                    "h": int(task["details"]["endTime"]["h"]),
                    "m": int(task["details"]["endTime"]["m"])
                },
                "startTime": {
                    "h": int(task["details"]["startTime"]["h"]),
                    "m": int(task["details"]["startTime"]["m"])
                },
                "frequency": int(task["details"]["frequency"])
            }
        })

    response = individual_table.update_item(
        Key={'individual_id': individual_id},
        UpdateExpression="set tasks=:t",
        ExpressionAttributeValues={
            ':t': formatted_tasks,
        },
        ReturnValues="ALL_NEW")

    individual = response["Attributes"]

    return {
        'tasks': individual['tasks'],
        'individual_id': individual['individual_id'],
        'details': individual['details']
    }
