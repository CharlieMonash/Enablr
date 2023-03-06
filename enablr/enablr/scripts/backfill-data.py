import json
import boto3
import os
import math
import datetime
import random
from pytz import timezone, utc

# Charlie
INDIVIDUAL_TABLE_NAME="Dev-API-IndividualsTable05A6AA06-17X3FRB7GOSSK"
REMINDER_TABLE_NAME="Dev-API-ReminderTable76285657-1KPMB5SW8DFNE"
INDIVIDUAL_ID="9d65005c-5872-4a9f-9776-171f915848f1"

dynamodb_resource = boto3.resource('dynamodb')
dynamodb_client = boto3.client('dynamodb')
individual_table = dynamodb_resource.Table(INDIVIDUAL_TABLE_NAME)
reminder_table = dynamodb_resource.Table(REMINDER_TABLE_NAME)
individual_id = INDIVIDUAL_ID

#dynamodb_resource = boto3.resource('dynamodb')
#dynamodb_client = boto3.client('dynamodb')
#individual_table = dynamodb_resource.Table(os.environ['INDIVIDUAL_TABLE_NAME'])
#reminder_table = dynamodb_resource.Table(os.environ['REMINDER_TABLE_NAME'])
#individual_id = os.environ['INDIVIDUAL_ID']


def delete_remaining_tasks(individual_id, task_id):

    current_time = datetime.datetime.now(utc)
    reminders = dynamodb_client.query(
        TableName=reminder_table.name,
        KeyConditionExpression='reminder_id = :reminder_id',
        ExpressionAttributeValues={
            ':reminder_id': {'S': f'{individual_id}-{task_id}'}
        }
    )

    deletes = []
    for existing_reminder in reminders['Items']:

        reminder_id = existing_reminder['reminder_id']
        due = existing_reminder['due']
        deletes.append({
            "DeleteRequest": {
                "Key": {
                    "reminder_id": reminder_id['S'],
                    "due": int(due['N']),
                }
            }
        })

    process_updates(deletes)


def create_reminder(timestamp, task, target_id, time, completed):
    task_id = task['task_id']
    return {
        "PutRequest": {
            "Item": {
                "reminder_id": f'{target_id}-{task_id}',
                'task_id': task_id,
                'individual_id': target_id,
                "due": timestamp,
                "readable_timestamp": time,
                "details": task,
                "completed": completed,
                "note": ""
            }
        }
    }


def publish_updates(updates):
    batch_keys = {
        reminder_table.name: updates
    }

    response = dynamodb_resource.batch_write_item(
        RequestItems=batch_keys
    )


def process_updates(updates):
    count = 0
    next_updates = []
    for update in updates:
        count += 1
        next_updates.append(update)
        if count == 25:
            publish_updates(next_updates)
            count = 0
            next_updates = []

    if count > 0:
        publish_updates(next_updates)


def create_all_reminders(individual, task):
    tz = individual['timezone']
    dayback = 31

    records_to_create = []

    current_time = datetime.datetime.now(utc)
    current_timestamp = current_time.timestamp()

    while dayback > 0:
        adjusted_time = datetime.datetime.fromtimestamp(current_timestamp)

        records_to_create.extend(create_records(
            individual_id, task, tz, adjusted_time, dayback))

        current_timestamp -= (60*60*24)
        dayback -= 1

    process_updates(records_to_create)


def create_records(target_id, task, tz, current_time, day_back):
    # TODO when I get back. Roll a random number. if it's greater tan dayback then make true?

    start_time = task['details']['startTime']
    end_time = task['details']['endTime']

    # Make sure to localize the time to whatever the individual operates in. This will be important since Australia has several timezones
    # And the timezone the lambda is in may be different to the childs timezone

    timezone_time = current_time.astimezone(timezone(tz))
    earliest_time = timezone_time.replace(
        day=timezone_time.day,
        hour=start_time["h"], minute=start_time["m"], second=0, microsecond=0)

    latest_time = timezone_time.replace(day=timezone_time.day,
                                        hour=end_time["h"], minute=end_time["m"], second=0, microsecond=0)

    frequency = task['details']['frequency'] - 1

    # Math stuff below here is summed up as:
    # If more than one reminder is needed, then work out the distance between reminders and create a reminder for each block
    # Until the final time has been reached

    reminders = [math.floor(earliest_time.timestamp())]

    if frequency > 0:
        distance = (latest_time.timestamp() -
                    earliest_time.timestamp())/float(frequency)

        travelled = earliest_time.timestamp() + distance

        while travelled <= latest_time.timestamp():
            reminders.append(math.floor(travelled))
            travelled = travelled + distance

    updates = []
    for reminder in reminders:
        # dont include reminders that have already occurred

        time = timezone(tz).localize(
            datetime.datetime.fromtimestamp(reminder))
        completed = False
        bar = random.randrange(35)
        if day_back > bar - 8:
            completed = True
        if time.timestamp() > datetime.datetime.now(utc).timestamp() - (60*60*1.5):
            completed = False
        updates.append(create_reminder(
            reminder, task, target_id, str(time), completed))

    return updates


def process():
    batch_keys = {
        individual_table.name: {
            'Keys': [{'individual_id': individual_id}]
        }
    }

    print(batch_keys)

    response = dynamodb_resource.batch_get_item(
        RequestItems=batch_keys
    )

    individual = response['Responses'][individual_table.name][0]

    for task in individual['tasks']:
        delete_remaining_tasks(
            individual['individual_id'], task['task_id'])

        create_all_reminders(individual, task)


process()
