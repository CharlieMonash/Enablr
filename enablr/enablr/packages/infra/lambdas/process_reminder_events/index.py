import json
import os
import math
import datetime
from pytz import timezone, utc
import boto3

dynamodb_resource = boto3.resource('dynamodb')

# The client has more functionality but it's more complicated than the resource
dynamodb_client = boto3.client('dynamodb')
current_time = datetime.datetime.now(utc)

individual_table = dynamodb_resource.Table(os.environ['INDIVIDUAL_TABLE_NAME'])
reminder_table = dynamodb_resource.Table(os.environ['REMINDER_TABLE_NAME'])


def get_individual_details(individual_id):
    batch_keys = {
        individual_table.name: {
            'Keys': [{'individual_id': individual_id}]
        }
    }

    response = dynamodb_resource.batch_get_item(
        RequestItems=batch_keys
    )

    individual = response['Responses'][individual_table.name][0]
    # get individual from dynamodb
    # extract tasks
    # return tasks in json format
    return {'tasks': individual['tasks'], 'timezone': individual['details']['tz']}


def create_reminder(timestamp, task, individual_id, time):
    task_id = task['task_id']
    return {
        "PutRequest": {
            "Item": {
                "reminder_id": f'{individual_id}-{task_id}',
                'task_id': task_id,
                'individual_id': individual_id,
                "due": timestamp,
                "readable_timestamp": time,
                "details": task,
                "completed": False,
                "note": ""
            }
        }
    }


def delete_reminder(existing_reminder):
    reminder_id = existing_reminder['reminder_id']
    due = existing_reminder['due']
    return {
        "DeleteRequest": {
            "Key": {
                "reminder_id": reminder_id['S'],
                "due": int(due['N']),
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


def create_records(target_id, task, tz):
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
        if reminder > timezone_time.timestamp():
            time = timezone(tz).localize(
                datetime.datetime.fromtimestamp(reminder))

            updates.append(create_reminder(
                reminder, task, target_id, str(time)))

    return updates


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


def delete_remaining_tasks(individual_id, task_id):
    response = dynamodb_client.query(
        TableName=reminder_table.name,
        KeyConditionExpression='reminder_id = :reminder_id AND due > :due',
        FilterExpression='completed <> :completed',
        ExpressionAttributeValues={
            ':reminder_id': {'S': f'{individual_id}-{task_id}'},
            ':due': {'N':  str(math.floor(current_time.timestamp()))},
            ':completed': {'BOOL': True}
        }
    )

    to_delete = response['Items']

    updates = []
    for td in to_delete:
        updates.append(delete_reminder(td))
    return updates


def get_all_individuals():
    response = individual_table.scan()

    return response['Items']


def lambda_handler(event, context):
    print(event)

    updates = []
    deletes = []
    for record in event['Records']:
        body = json.loads(record['body'])
        target_type = body['target_type']

        if (target_type == 'INDIVIDUAL'):

            target_id = body['target_id']
            task_id = body['task_id']
            update_type = body['update_type']

            # First add in updates to cleanup existing tasks.
            if update_type in ['DELETE', 'UPDATE']:
                deletes.extend(delete_remaining_tasks(target_id, task_id))

            # Add in updates to create new tasks.
            if update_type in ['CREATE', 'UPDATE']:
                details = get_individual_details(target_id)

                task = next(
                    (task for task in details['tasks'] if task['task_id'] == task_id), None)

                if task is not None:
                    updates.extend(create_records(
                        target_id, task, details['timezone']))

        if (target_type == 'ALL'):
            individuals = get_all_individuals()
            for individual in individuals:
                for task in individual['tasks']:

                    deletes.extend(delete_remaining_tasks(
                        individual['individual_id'], task['task_id']))
                    updates.extend(create_records(
                        individual['individual_id'], task, individual['details']['tz']))

    print(f'target {target_type}')
    print(f'delete count {len(deletes)}')
    print(f'update count {len(updates)}')

    process_updates(deletes)
    process_updates(updates)
