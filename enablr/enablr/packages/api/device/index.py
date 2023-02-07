"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

 Licensed under the Apache License, Version 2.0 (the "License").
 You may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
"""
import logging

import individual
import device
import reminder

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.event_handler import APIGatewayRestResolver, CORSConfig, Response, content_types
from aws_lambda_powertools.utilities.data_classes import APIGatewayProxyEvent

logging.getLogger().setLevel(logging.INFO)
logger = Logger(service="api/task")

cors_config = CORSConfig(allow_origin="*", max_age=0)
app = APIGatewayRestResolver(cors=cors_config)

tracer = Tracer()


def revoked_response():
    '''If a registration is revoked, return a 403 to deny access'''
    return Response(
        status_code=403,
        content_type=content_types.TEXT_PLAIN,
        body="Revoked",
    )


def valid_registration(registration_details):
    '''Check if the registration is valid or not'''
    if (not registration_details) or ("revoked" in registration_details):
        return False
    return True


@app.get("/device/individual")
@tracer.capture_method
def get_individual_details():
    '''The get method for individual details to return to the device'''
    registration_id = app.current_event.request_context.authorizer['registration_id']
    registration_details = device.get_registration_details(registration_id)

    if not valid_registration(registration_details):
        return revoked_response()

    if registration_details:
        individual_id = registration_details['individual_id']

        ind = individual.get_individual_details(individual_id)
        return ind


@app.get("/device/reminders/<task_id>/<beginning>")
@tracer.capture_method
def get_reminders_from_date(task_id: str, beginning: str):
    '''Using a beginning date, get all future reminders'''
    registration_id = app.current_event.request_context.authorizer['registration_id']
    registration_details = device.get_registration_details(registration_id)

    if not valid_registration(registration_details):
        return revoked_response()

    if registration_details:
        individual_id = registration_details['individual_id']
        reminder_id = f'{individual_id}-{task_id}'
        response = reminder.get_reminders_from_date(reminder_id, beginning)
        return {'reminders': response}


@app.post("/device/update-reminder/<task_id>")
@tracer.capture_method
def post_update_reminder(task_id: str):
    '''This method is used to update a reminder, marking it as complete and optionally adding a note'''
    registration_id = app.current_event.request_context.authorizer['registration_id']
    registration_details = device.get_registration_details(registration_id)

    if not valid_registration(registration_details):
        return revoked_response()

    if registration_details:
        details: dict = app.current_event.json_body
        individual_id = registration_details['individual_id']
        due = details['due']
        note = details['note']
        reminder_id = f'{individual_id}-{task_id}'

        response = reminder.update_reminder(reminder_id, due, note)
        return response


@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_REST, log_event=True)
@tracer.capture_lambda_handler
def lambda_handler(event: APIGatewayProxyEvent, context):
    '''The handler method that needs to exist in order for this to be used in lambda'''
    return app.resolve(event, context)
