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

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.event_handler import APIGatewayRestResolver, CORSConfig, Response, content_types
from aws_lambda_powertools.utilities.data_classes import APIGatewayProxyEvent

import supporter
import permission

logging.getLogger().setLevel(logging.INFO)
logger = Logger(service="api/supporter")

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


@app.get("/supporter/details")
@tracer.capture_method
def get_supporter():
    '''A supporter uses this to get their own details. The SUB from the authoriser is the supporters ID'''
    supporter_id = app.current_event.request_context.authorizer.claims.get(
        "sub")
    response = supporter.get_supporter_details(supporter_id)
    return response


@app.get("/supporter/shared-details/<share_identifier>")
@tracer.capture_method
def get_supporter_by_share(share_identifier: str):
    '''Used to get a supporter using their share code. This is used to add an access record for an individual'''
    response = supporter.get_supporter_details_by_share(share_identifier)
    return response


@app.post("/supporter/add-supporter/<individual_id>")
@tracer.capture_method
def add_supporter(individual_id: str):
    '''Add a supporter to an individual using the supplied share code.'''
    details: dict = app.current_event.json_body
    # TODO: validate inputs, relationship
    share_identifier = details["shareIdentifier"]
    relationship = details["relationship"]

    supporter_id = app.current_event.request_context.authorizer.claims.get(
        "sub")

    access = permission.get_access_permission(individual_id, supporter_id)

    if access['relationship'] == "PRIMARY":
        new_supporter = supporter.get_supporter_details_by_share(
            share_identifier)

        response = supporter.add_supporter_permission(
            individual_id, new_supporter["id"], relationship)
        return response
    else:
        return denied_response()


@app.post("/supporter/remove-supporter/<individual_id>")
@tracer.capture_method
def remove_supporter(individual_id: str):
    '''Remove a supporter that has access to an individual'''
    details: dict = app.current_event.json_body

    access_supporter_id = details["supporterId"]

    supporter_id = app.current_event.request_context.authorizer.claims.get(
        "sub")

    if access_supporter_id == supporter_id:
        return Response(
            status_code=403,
            content_type=content_types.TEXT_PLAIN,
            body="You cannot remove yourself as supporter to this individual",
        )

    access = permission.get_access_permission(individual_id, supporter_id)

    if access['relationship'] == "PRIMARY":
        response = supporter.delete_supporter_permission(
            individual_id, access_supporter_id)

        return response
    else:
        return denied_response()


@app.get("/supporter/individuals")
@tracer.capture_method
def get_supporter_individuals():
    '''Get all the individuals the current user has access to'''
    supporter_id = app.current_event.request_context.authorizer.claims.get(
        "sub")
    response = supporter.get_supporter_individuals(supporter_id)
    return {'supporter_id': supporter_id, 'individuals': response}


@app.get("/supporter/supporters/<individual_id>")
@tracer.capture_method
def get_individual_supporters(individual_id: str):
    '''Get all the supporters that have access to a given individual'''
    supporter_id = app.current_event.request_context.authorizer.claims.get(
        "sub")
    access = permission.get_access_permission(individual_id, supporter_id)

    if access['relationship'] == "PRIMARY":
        response = supporter.get_individual_supporters(individual_id)
        return {'individual_id': individual_id, 'supporters': response}
    else:
        return denied_response()


@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_REST, log_event=True)
@tracer.capture_lambda_handler
def lambda_handler(event: APIGatewayProxyEvent, context):
    '''The handler method that needs to exist in order for this to be used in lambda'''
    # print(event)
    return app.resolve(event, context)
