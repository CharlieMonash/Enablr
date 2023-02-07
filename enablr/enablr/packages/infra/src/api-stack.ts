/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import path from "path";
import * as lambda from "@aws-cdk/aws-lambda-python-alpha";
import { Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import {
  AuthorizationType,
  CfnAuthorizer,
  Cors,
  LambdaIntegration,
  MethodLoggingLevel,
  RestApi,
  TokenAuthorizer,
} from "aws-cdk-lib/aws-apigateway";
import { UserPool } from "aws-cdk-lib/aws-cognito";
import {
  AttributeType,
  BillingMode,
  ProjectionType,
  StreamViewType,
  Table,
  TableEncryption,
} from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";

interface ApiProps extends StackProps {
  userPool: UserPool;
}

/**
 * APIStack
 * Where the resources are defined for the APIGateway and Lambda API's sitting behind
 * First-layer DynamoDB tables are also defined here as the API's will be accessing them directory
 */
export class APIStack extends Stack {
  // These are defined at the class level as properties to be accessed within the application-stage and passed to other stacks
  apiGateway: RestApi;
  individualTable: Table;
  reminderTable: Table;
  taskTable: Table;
  deviceTable: Table;

  supporterAPI: lambda.PythonFunction;
  taskAPI: lambda.PythonFunction;
  individualAPI: lambda.PythonFunction;
  deviceAPI: lambda.PythonFunction;
  registerAPI: lambda.PythonFunction;
  authorizer: lambda.PythonFunction;

  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id, props);

    // Define the new API's here. It will look for index.py to be in the relevant directory
    // The apis are stored within ~/packages/api
    // The service roles of these API's will use the default AWS managed service roles. For more find grain permissions, consider locking down the permissions manually with custom roles.
    const [
      supporterAPI,
      taskAPI,
      individualAPI,
      deviceAPI,
      registerAPI,
      authorizer,
    ] = [
      "supporter",
      "task",
      "individual",
      "device",
      "register",
      "authorizer",
    ].map(
      (x) =>
        new lambda.PythonFunction(this, `${x}Api`, {
          entry: path.join(__dirname, `../../api/${x}`),
          handler: "lambda_handler",
          runtime: Runtime.PYTHON_3_9,
          environment: {},
          timeout: Duration.minutes(1),
        })
    );

    // ======== API Gateway Definition ========

    this.apiGateway = new RestApi(this, "RestApi", {
      // Prevents CORS issues
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      },
      deployOptions: {
        loggingLevel: MethodLoggingLevel.INFO,
        tracingEnabled: true,
      },
    });

    // Make sure when this is cleaned up the api is removed
    this.apiGateway.applyRemovalPolicy(RemovalPolicy.DESTROY);

    const cognitoAuthorizer = new CfnAuthorizer(this, "RestApiAuthorizer", {
      restApiId: this.apiGateway.restApiId,
      type: "COGNITO_USER_POOLS",
      providerArns: [props.userPool.userPoolArn],
      identitySource: "method.request.header.Authorization",
      name: "CognitoAuthorizer",
    });

    const defaultMethodOptions = {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: {
        authorizerId: cognitoAuthorizer.ref,
      },
    };

    // Attach the lambdas to the APIGateway
    const supporterProxy = this.apiGateway.root
      .addResource("supporter")
      .addProxy({ anyMethod: false });

    supporterProxy.addMethod(
      "GET",
      new LambdaIntegration(supporterAPI),
      defaultMethodOptions
    );
    supporterProxy.addMethod(
      "POST",
      new LambdaIntegration(supporterAPI),
      defaultMethodOptions
    );

    const individualProxy = this.apiGateway.root
      .addResource("individual")
      .addProxy({ anyMethod: false });

    individualProxy.addMethod(
      "GET",
      new LambdaIntegration(individualAPI),
      defaultMethodOptions
    );

    individualProxy.addMethod(
      "POST",
      new LambdaIntegration(individualAPI),
      defaultMethodOptions
    );

    const taskProxy = this.apiGateway.root
      .addResource("task")
      .addProxy({ anyMethod: false });

    taskProxy.addMethod(
      "GET",
      new LambdaIntegration(taskAPI),
      defaultMethodOptions
    );

    const registerProxy = this.apiGateway.root
      .addResource("register")
      .addProxy({ anyMethod: false });

    // No authorise for this at all. It's only 1 endpoint used to get the register token.
    registerProxy.addMethod("POST", new LambdaIntegration(registerAPI));

    const deviceProxy = this.apiGateway.root
      .addResource("device")
      .addProxy({ anyMethod: false });

    const lambdaAuthorizer = new TokenAuthorizer(this, "APIGWTokenAuthorizer", {
      handler: authorizer,
    });

    // The device proxy uses a different sort of authorizer validated by a JWT to allow for many devices that don't require a direct login.
    deviceProxy.addMethod("GET", new LambdaIntegration(deviceAPI), {
      authorizationType: AuthorizationType.CUSTOM,
      authorizer: lambdaAuthorizer,
    });

    deviceProxy.addMethod("POST", new LambdaIntegration(deviceAPI), {
      authorizationType: AuthorizationType.CUSTOM,
      authorizer: lambdaAuthorizer,
    });

    // ======== Tables definition ========

    // The table for tasks that have been pre-defined by enablr.
    // We only need to define the primary (partition) key of the table because other properties
    // can be dynamically added
    this.taskTable = new Table(this, "TaskTable", {
      partitionKey: { name: "task_id", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.RETAIN,
      encryption: TableEncryption.AWS_MANAGED,
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    // Allow the task API to read from the task table
    this.taskTable.grantReadData(taskAPI);

    // The table for supporters. We only need to define the primary (partition) key of the table because other properties
    // can be dynamically added
    const supporterTable = new Table(this, "SupporterTable", {
      partitionKey: { name: "supporter_id", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: TableEncryption.AWS_MANAGED,
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    // global secondary index so it can be queried by both individual ID and supporter ID
    supporterTable.addGlobalSecondaryIndex({
      indexName: "ShareIDIndex",
      partitionKey: { name: "shareIdentifier", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // Allow the supporter API to read and write from the supporter table
    supporterTable.grantReadWriteData(supporterAPI);

    // The table for individuals. We only need to define the primary (partition) key of the table because other properties
    // can be dynamically added
    this.individualTable = new Table(this, "IndividualsTable", {
      partitionKey: { name: "individual_id", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: TableEncryption.AWS_MANAGED,
      billingMode: BillingMode.PAY_PER_REQUEST,
      // This table gets an event stream so we can trigger other functionality off changes within the table automatically
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // Allow the individual API to read and write from the individual table
    this.individualTable.grantReadWriteData(individualAPI);
    this.individualTable.grantReadWriteData(supporterAPI);
    this.individualTable.grantReadData(deviceAPI);

    // The table for reminders (queued tasks).
    // It uses a partition key as the reminder_id. reminder id will be a combination of individual id and task id i.e. <individualID>-<taskID>
    // It uses a sort key of due which will be a timestamp of the time the task is due. This is used for filtering queries. such as "all tasks past this time"
    this.reminderTable = new Table(this, "ReminderTable", {
      partitionKey: { name: "reminder_id", type: AttributeType.STRING },
      sortKey: { name: "due", type: AttributeType.NUMBER },
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: TableEncryption.AWS_MANAGED,
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    // Allow the individual API to read from the reminder table. And Write access for modifications.
    this.reminderTable.grantReadWriteData(individualAPI);
    this.reminderTable.grantReadWriteData(deviceAPI);

    // Individual Access Table
    // It uses individual_id as the partition key.
    // It uses the supporter_id as the sort key
    // This table is what dictates who has access to the individual
    // An additional column will be used here 'Type' that will indicate the type of access: Such as 'PRIMARY' | 'SECONDARY' | 'TERTIARY'
    // can be dynamically added
    const accessTable = new Table(this, "AccessTable", {
      partitionKey: { name: "individual_id", type: AttributeType.STRING },
      sortKey: { name: "supporter_id", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.RETAIN,
      encryption: TableEncryption.AWS_MANAGED,
      billingMode: BillingMode.PAY_PER_REQUEST,
      // This table gets an event stream so we can trigger other functionality off changes within the table automatically
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // global secondary index so it can be queried by both individual ID and supporter ID
    accessTable.addGlobalSecondaryIndex({
      indexName: "SupporterIndex",
      sortKey: { name: "individual_id", type: AttributeType.STRING },
      partitionKey: { name: "supporter_id", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // Allow all of the api's to read from this table
    accessTable.grantReadData(individualAPI);
    accessTable.grantReadData(taskAPI);
    // Allow the support API specifically the permission to also write to this table. (To update permissions)
    accessTable.grantReadWriteData(supporterAPI);

    // A table to store the link between devices and individuals
    this.deviceTable = new Table(this, "DeviceRegistrationTable", {
      partitionKey: { name: "registration_id", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.RETAIN,
      encryption: TableEncryption.AWS_MANAGED,
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    // global secondary index so it can be queried by both individual ID and Device ID
    this.deviceTable.addGlobalSecondaryIndex({
      indexName: "IndividualIndex",
      sortKey: { name: "registration_id", type: AttributeType.STRING },
      partitionKey: { name: "individual_id", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    this.deviceTable.grantReadWriteData(individualAPI);
    this.deviceTable.grantReadWriteData(registerAPI);
    this.deviceTable.grantReadData(deviceAPI);

    //=========== Add in secret values that need to be manually populated
    // So the token can be signed by the registration API
    const jwtPrivateSigningKey =
      StringParameter.fromSecureStringParameterAttributes(
        this,
        "JWTPrivateSigningKey",
        {
          parameterName: "/jwt-private",
        }
      );

    jwtPrivateSigningKey.grantRead(registerAPI);

    // So the token can be validated by the Authorizer
    const jwtPublicSigningKey =
      StringParameter.fromSecureStringParameterAttributes(
        this,
        "JWTPublicSigningKey",
        {
          parameterName: "/jwt-public",
        }
      );
    jwtPublicSigningKey.grantRead(authorizer);

    //=========== Add the missing env vars to pass into the lambdas ============
    supporterAPI.addEnvironment(
      "SUPPORTER_TABLE_NAME",
      supporterTable.tableName
    );
    supporterAPI.addEnvironment("ACCESS_TABLE_NAME", accessTable.tableName);
    supporterAPI.addEnvironment("ACCESS_TABLE_INDEX_NAME", "SupporterIndex"); // Use a const
    supporterAPI.addEnvironment("SHARE_SUPPORTER_INDEX_NAME", "ShareIDIndex"); // Use a const
    supporterAPI.addEnvironment(
      "INDIVIDUAL_TABLE_NAME",
      this.individualTable.tableName
    );

    individualAPI.addEnvironment(
      "INDIVIDUAL_TABLE_NAME",
      this.individualTable.tableName
    );
    individualAPI.addEnvironment(
      "REMINDER_TABLE_NAME",
      this.reminderTable.tableName
    );
    individualAPI.addEnvironment(
      "REGISTRATION_TABLE_NAME",
      this.deviceTable.tableName
    );
    individualAPI.addEnvironment(
      "REGISTRATION_TABLE_INDEX_NAME",
      "IndividualIndex"
    );
    individualAPI.addEnvironment("ACCESS_TABLE_NAME", accessTable.tableName);

    taskAPI.addEnvironment("TASK_TABLE_NAME", this.taskTable.tableName);

    registerAPI.addEnvironment(
      "REGISTRATION_TABLE_NAME",
      this.deviceTable.tableName
    );
    registerAPI.addEnvironment(
      "JWT_PRIVATE_SIGNING_KEY",
      jwtPrivateSigningKey.parameterName
    );

    authorizer.addEnvironment(
      "JWT_PUBLIC_SIGNING_KEY",
      jwtPublicSigningKey.parameterName
    );

    deviceAPI.addEnvironment(
      "REGISTRATION_TABLE_NAME",
      this.deviceTable.tableName
    );
    deviceAPI.addEnvironment(
      "INDIVIDUAL_TABLE_NAME",
      this.individualTable.tableName
    );
    deviceAPI.addEnvironment(
      "REMINDER_TABLE_NAME",
      this.reminderTable.tableName
    );

    this.supporterAPI = supporterAPI;
    this.taskAPI = taskAPI;
    this.individualAPI = individualAPI;
    this.deviceAPI = deviceAPI;
    this.registerAPI = registerAPI;
    this.authorizer = authorizer;
  }
}
