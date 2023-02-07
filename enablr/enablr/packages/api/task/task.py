import json
import os
import boto3


TASK_TABLE_NAME = os.environ['TASK_TABLE_NAME']
dynamodb_resource = boto3.resource('dynamodb')
task_table = dynamodb_resource.Table(TASK_TABLE_NAME)


def get_all_tasks():
    '''Load every record from the task table. Potentially add an 'expired' flag to filter our tasks no longer offered'''
    response = task_table.scan()

    for task in response["Items"]:
        task['steps'] = list(task['steps'])

    return response["Items"]
