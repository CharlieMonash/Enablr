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

import task

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.event_handler import APIGatewayRestResolver, CORSConfig
from aws_lambda_powertools.utilities.data_classes import APIGatewayProxyEvent

logging.getLogger().setLevel(logging.INFO)
logger = Logger(service="api/task")

cors_config = CORSConfig(allow_origin="*", max_age=0)
app = APIGatewayRestResolver(cors=cors_config)

tracer = Tracer()


@app.get("/task/tasks")
@tracer.capture_method
def get_tasks():
    '''Get all tasks that have been predefined'''
    tasks = task.get_all_tasks()
    return {"tasks": tasks}


@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_REST, log_event=True)
@tracer.capture_lambda_handler
def lambda_handler(event: APIGatewayProxyEvent, context):
    '''The handler method that needs to exist in order for this to be used in lambda'''
    # print(event)
    return app.resolve(event, context)
