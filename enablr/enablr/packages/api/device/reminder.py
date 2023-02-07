import json
import os
import boto3
import datetime

REMINDER_TABLE_NAME = os.environ['REMINDER_TABLE_NAME']


dynamodb = boto3.client('dynamodb')
dynamodb_resource = boto3.resource('dynamodb')
reminder_table = dynamodb_resource.Table(REMINDER_TABLE_NAME)


def get_reminders_from_date(reminder_id, beginning):
    '''Using a beginning date, get all reminders beyond for a specific reminderID'''
    beginning_int = int(beginning)

    # difference between python and js timestamps. Arbitrary number with just 1000 x more digits than a python timestamp
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
            'task_id': reminder['task_id']['S'],
            'due': reminder['due']['N'],
            'completed': reminder['completed']['BOOL'],
            'note': reminder['note']['S'],
        })

    return results


def update_reminder(reminder_id, due, note):
    '''Update a reminder in dynamoDB. Currently only marks complete as true, but you could also mark it as false with another param'''
    reminder_table.update_item(
        Key={'reminder_id': reminder_id, 'due': due},
        UpdateExpression="set note=:n, completed=:c",
        ExpressionAttributeValues={
            ':n': note,
            ':c': True,
        },
        ReturnValues="ALL_NEW")

    return {"reminder_id": reminder_id}
