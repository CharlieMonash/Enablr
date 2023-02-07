import json
import boto3
import os
import uuid

sqs_client = boto3.client('sqs')

# value passed in to the lambda from the infra
SQS_URL = os.environ['TASK_EVENT_QUEUE_URL']


def publish_events(entries):
    # TODO: test more than 10 tasks
    response = sqs_client.send_message_batch(
        QueueUrl=SQS_URL,
        Entries=entries
    )


def create_sqs_entry(task_id, individual_id, update_type):
    sqs_entry_id = str(uuid.uuid4())
    return {
        'Id': sqs_entry_id,
        'MessageBody': json.dumps({
            "target_type": 'INDIVIDUAL',
            "target_id": individual_id,
            "task_id": task_id,
            "update_type": update_type
        }),
        'MessageDeduplicationId': sqs_entry_id,
        'MessageGroupId': 'INDIVIDUAL'
    }


def lambda_handler(event, context):
    for record in event['Records']:
        event_name = record['eventName']
        individual_id = record['dynamodb']["Keys"]["individual_id"]["S"]
        new_tasks = []
        old_tasks: [] = []

        # Different behaviour for different dynamodb events that may enter

        if event_name == 'MODIFY':
            new_tasks = record['dynamodb']['NewImage']["tasks"]["L"]
            old_tasks = record['dynamodb']['OldImage']["tasks"]["L"]
        elif event_name == 'DELETE':
            old_tasks = record['dynamodb']['OldImage']["tasks"]["L"]
        else:
            new_tasks = record['dynamodb']['NewImage']["tasks"]["L"]

        new = []
        modified = []

        for new_task in new_tasks:
            existing_task = None
            for old_task in old_tasks:
                if new_task['M']['task_id']["S"] == old_task['M']['task_id']["S"]:
                    existing_task = old_task

            if existing_task is None:
                new.append(new_task)
            elif (json.dumps(existing_task['M']['details']) != json.dumps(new_task['M']['details'])):
                modified.append(new_task)

            if existing_task is not None:
                # We can assume that it isn't a 'old' task so remove it from the list.
                old_tasks.remove(existing_task)

        events = []
        for task in new:
            events.append(create_sqs_entry(
                task['M']['task_id']["S"], individual_id, 'CREATE'))

        for task in modified:
            events.append(create_sqs_entry(
                task['M']['task_id']["S"], individual_id, 'UPDATE'))

        # Only leftover tasks should be here that need to be deleted.
        for task in old_tasks:
            events.append(create_sqs_entry(
                task['M']['task_id']["S"], individual_id, 'DELETE'))
                
        if len(events) > 0:
            publish_events(events)
