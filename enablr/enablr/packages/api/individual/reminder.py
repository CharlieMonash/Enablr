import json
import os
import boto3
import datetime

REMINDER_TABLE_NAME = os.environ['REMINDER_TABLE_NAME']


dynamodb = boto3.client('dynamodb')


def get_reminders(reminder_id):
    '''The reminder id is a combination of individual_id and task_id, get all reminders for the last month'''
    response = dynamodb.query(
        TableName=REMINDER_TABLE_NAME,
        KeyConditionExpression='reminder_id = :reminder_id AND due > :due',
        ExpressionAttributeValues={
            ':reminder_id': {'S': reminder_id},
            ':due': {'N': (str((datetime.datetime.today() - datetime.timedelta(weeks=4)).timestamp()))}
        }
    )

    results = []

    for reminder in response['Items']:
        results.append({
            'reminder_id': reminder['reminder_id']['S'],
            'due': reminder['due']['N']
        })

    return results


def get_reminders_from_date(reminder_id, beginning):
    '''The reminder id is a combination of individual_id and task_id, get all reminders since the beginning param'''
    beginning_int = int(beginning)

    # difference between python and js timestamps. Arbitrary timestamp just 1000x more than a python one
    if beginning_int > 167372820000:
        beginning_int = round(beginning_int/1000, 0)

    response = dynamodb.query(
        TableName=REMINDER_TABLE_NAME,
        KeyConditionExpression='reminder_id = :reminder_id AND due > :due',
        ExpressionAttributeValues={
            ':reminder_id': {'S': reminder_id},
            ':due': {'N': str(beginning_int)}
        }
    )

    results = []

    for reminder in response['Items']:
        results.append({
            'reminder_id': reminder['reminder_id']['S'],
            'due': reminder['due']['N'],
            'completed': reminder['completed']['BOOL'],
            'note': reminder['note']['S']
        })

    return results
