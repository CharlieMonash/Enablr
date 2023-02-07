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
import individual
import reminder
import permission
import device

import logging

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.event_handler import APIGatewayRestResolver, CORSConfig, Response, content_types
from aws_lambda_powertools.utilities.data_classes import APIGatewayProxyEvent

logging.getLogger().setLevel(logging.INFO)
logger = Logger(service="api/individual")

cors_config = CORSConfig(allow_origin="*", max_age=0)
app = APIGatewayRestResolver(cors=cors_config)

tracer = Tracer()


def denied_response():
    '''If for any reason the user is unable to take action due to a permissions issue, return this response'''
    return Response(
        status_code=403,
        content_type=content_types.TEXT_PLAIN,
        body="Insufficient access permission to this individual",
    )


@app.get("/individual/<individual_id>")
@tracer.capture_method
def get_individual(individual_id: str):
    '''Using the individual id, get the individuals details. Ensure the user has access to that individual'''
    supporter_id = app.current_event.request_context.authorizer.claims.get(
        "sub")
    access = permission.get_access_permission(individual_id, supporter_id)
    if access['relationship'] != "DENIED":
        response = individual.get_individual_details(individual_id)
        return response
    else:
        return denied_response()


@app.post("/individual/<individual_id>")
@tracer.capture_method
def update_individual(individual_id: str):
    '''Using the individual id, update the individuals details. Ensure the user has access to that individual'''
    supporter_id = app.current_event.request_context.authorizer.claims.get(
        "sub")
    access = permission.get_access_permission(individual_id, supporter_id)
    if access['relationship'] != "DENIED":
        details: dict = app.current_event.json_body
        response = individual.update_individual_details(individual_id, details)
        return response
    else:
        return denied_response()


@app.post("/individual/<individual_id>/tasks")
@tracer.capture_method
def update_individual_tasks(individual_id: str):
    '''Using the individual id, update the individuals tasks. Ensure the user has access to that individual'''
    supporter_id = app.current_event.request_context.authorizer.claims.get(
        "sub")
    access = permission.get_access_permission(individual_id, supporter_id)
    if access['relationship'] != "DENIED":
        details: dict = app.current_event.json_body
        response = individual.update_individual_tasks(
            individual_id, details['tasks'])
        return response
    else:
        return denied_response()


@app.get("/individual/reminders/<individual_id>/<reminder_id>")
@tracer.capture_method
def get_reminders(individual_id: str, reminder_id: str):
    '''Using the individual id and the reminder id, get all reminders for this individual over the last month. Ensure the user has access to that individual'''
    supporter_id = app.current_event.request_context.authorizer.claims.get(
        "sub")
    access = permission.get_access_permission(individual_id, supporter_id)
    if access['relationship'] != "DENIED":
        response = reminder.get_reminders(reminder_id)
        return {'reminders': response}
    else:
        return denied_response()


@app.get("/individual/reminders/<individual_id>/<reminder_id>/<beginning>")
@tracer.capture_method
def get_reminders_from_date(individual_id: str, reminder_id: str, beginning: str):
    '''Using the individual id and the reminder id, get all reminders for this individual since x date. Ensure the user has access to that individual'''
    supporter_id = app.current_event.request_context.authorizer.claims.get(
        "sub")
    access = permission.get_access_permission(individual_id, supporter_id)
    if access['relationship'] != "DENIED":
        response = reminder.get_reminders_from_date(reminder_id, beginning)
        return {'reminders': response}
    else:
        return denied_response()


@app.get("/individual/register-device/<individual_id>")
@tracer.capture_method
def get_register_device(individual_id: str):
    '''A method that returns a registration code for external devices'''
    supporter_id = app.current_event.request_context.authorizer.claims.get(
        "sub")
    access = permission.get_access_permission(individual_id, supporter_id)
    if access['relationship'] == "PRIMARY":
        response = device.get_new_device_registration(individual_id)
        return response
    else:
        return denied_response()


@app.get("/individual/devices/<individual_id>")
@tracer.capture_method
def get_registered_devices(individual_id: str):
    '''Using the individual id, get all devices with access to this individual that have not been revoked. Ensure the user has access to that individual'''
    supporter_id = app.current_event.request_context.authorizer.claims.get(
        "sub")
    access = permission.get_access_permission(individual_id, supporter_id)
    if access['relationship'] == "PRIMARY":
        response = device.get_devices(individual_id)
        return {'devices': response}
    else:
        return denied_response()


@app.post("/individual/devices/revoke/<individual_id>")
@tracer.capture_method
def revoke_device(individual_id: str):
    '''Using the individual id, revoke a device, denying it access to the users details moving forwards'''
    supporter_id = app.current_event.request_context.authorizer.claims.get(
        "sub")
    access = permission.get_access_permission(individual_id, supporter_id)
    if access['relationship'] == "PRIMARY":
        details: dict = app.current_event.json_body
        registration_id = details["registrationId"]
        devices = device.get_devices(individual_id)

        for dev in devices:
            if (dev['registration_id'] == registration_id):
                device.revoke_registration(registration_id)
                return {"status": 'Revoked'}

            return {"status": 'Already revoked or not found'}
    else:
        return denied_response()


@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_REST, log_event=True)
@tracer.capture_lambda_handler
def lambda_handler(event: APIGatewayProxyEvent, context):
    '''The handler method that needs to exist in order for this to be used in lambda'''
    # print(event)
    return app.resolve(event, context)
