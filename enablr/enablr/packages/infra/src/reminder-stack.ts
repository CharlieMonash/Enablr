/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import path from "path";
import * as lambda from "@aws-cdk/aws-lambda-python-alpha";
import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Rule, RuleTargetInput, Schedule } from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import { Runtime, StartingPosition } from "aws-cdk-lib/aws-lambda";
import {
  DynamoEventSource,
  SqsEventSource,
} from "aws-cdk-lib/aws-lambda-event-sources";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { LambdaPowertoolsLayer } from "cdk-lambda-powertools-python-layer";
import { Construct } from "constructs";

interface ReminderStackProps extends StackProps {
  individualTable: Table;
  reminderTable: Table;
  taskTable: Table;
}

export class ReminderStack extends Stack {
  individualEventLambda: lambda.PythonFunction;

  constructor(scope: Construct, id: string, props: ReminderStackProps) {
    super(scope, id, props);

    // A layer for the API lambda so you don't need to manage all the libraries for it
    const powertoolsLayer = new LambdaPowertoolsLayer(
      this,
      "ApiPowertoolsLayer"
    );

    // We will need a few very similar lambdas here so may as well define them all up front
    const [individualEventLambda, processReminderEventLambda] = [
      "individual_event",
      "process_reminder_events",
    ].map(
      (x) =>
        new lambda.PythonFunction(this, `${x}Handler`, {
          entry: path.join(__dirname, `../lambdas/${x}`),
          handler: "lambda_handler",
          runtime: Runtime.PYTHON_3_9,
          layers: [powertoolsLayer],
          // Adding in 1000 users worth of reminders can take a while
          timeout: Duration.minutes(15),
          environment: {},
        })
    );

    individualEventLambda.addEventSource(
      new DynamoEventSource(props.individualTable, {
        startingPosition: StartingPosition.TRIM_HORIZON,
        batchSize: 5,
        bisectBatchOnError: true,
        // onFailure: new SqsDlq(deadLetterQueue),
        retryAttempts: 1,
      })
    );

    // A secondary queue to place events into if they fail more than the threshold allows.
    const reminderDLQ = new Queue(this, "reminderDeadletterQueue", {
      queueName: "reminder-dlq.fifo",
      contentBasedDeduplication: true,
      fifo: true,
    });

    // The queue for reminders to be created using
    // This queue will have both tasks for updating an individuals tasks as well as re-queuing everyones daily tasks
    const reminderQueue = new Queue(this, "reminderQueue", {
      queueName: "reminder-queue.fifo",
      deadLetterQueue: { queue: reminderDLQ, maxReceiveCount: 3 },
      contentBasedDeduplication: true,
      visibilityTimeout: Duration.minutes(15), // Needs to be the same as the lambda runtime
      fifo: true, // Make sure the events are in order
    });

    // Pass in environment variables so they can be accessed by the lambdas
    processReminderEventLambda.addEnvironment(
      "INDIVIDUAL_TABLE_NAME",
      props.individualTable.tableName
    );
    processReminderEventLambda.addEnvironment(
      "REMINDER_TABLE_NAME",
      props.reminderTable.tableName
    );

    individualEventLambda.addEnvironment(
      "TASK_EVENT_QUEUE_URL",
      reminderQueue.queueUrl
    );

    props.individualTable.grantStreamRead(individualEventLambda);

    reminderQueue.grantSendMessages(individualEventLambda);
    reminderDLQ.grantConsumeMessages(processReminderEventLambda);

    processReminderEventLambda.addEventSource(
      new SqsEventSource(reminderQueue, {
        batchSize: 5,
      })
    );

    props.reminderTable.grantReadWriteData(processReminderEventLambda);
    props.reminderTable.grantReadData(processReminderEventLambda);

    props.taskTable.grantReadData(processReminderEventLambda);
    props.individualTable.grantReadData(processReminderEventLambda);

    new Rule(this, "dailyRule", {
      schedule: Schedule.cron({ minute: "0", hour: "0/2" }),
      targets: [
        new targets.SqsQueue(reminderQueue, {
          messageGroupId: "scheduled",
          message: RuleTargetInput.fromObject({ target_type: "ALL" }),
        }),
      ],
    });

    this.individualEventLambda = individualEventLambda;
  }
}
